import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { FleetMap, FleetSelectedLocationCard } from '@/components/FleetMap';
import { createRoute, dispatchRoute, listFleetInventory, listRouteStops, setRouteStops } from '@/services/fleet';
import { listFleetRouteLocations, routeLocationId, type FleetRouteLocation } from '@/services/locations';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

type Inventory = Awaited<ReturnType<typeof listFleetInventory>>;
type RouteStop = Record<string, any>;
const FALLBACK_ORIGIN = { latitude: 39.8283, longitude: -98.5795, fallback: true };

export default function DispatchCenter() {
  const { workspace, refreshing: workspaceRefreshing, refresh: refreshWorkspace } = useFleetWorkspace();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [routeId, setRouteId] = useState('');
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [draftStopIds, setDraftStopIds] = useState<string[]>([]);
  const [routeName, setRouteName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  const [routeLocations, setRouteLocations] = useState<FleetRouteLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspace) return;
    const next = await listFleetInventory(workspace.business_id);
    setInventory(next);
    const routes = next.routes as any[];
    const nextRouteId = routeId && routes.some(row => String(row.id) === routeId) ? routeId : String(routes[0]?.id ?? '');
    setRouteId(nextRouteId);
    const nextStops = nextRouteId ? await listRouteStops(workspace.business_id, nextRouteId) as RouteStop[] : [];
    setStops(nextStops);
    setDraftStopIds(nextStops.map(stop => String(stop.location_id ?? '')).filter(Boolean));
  }, [workspace, routeId]);

  const loadRouteLocations = useCallback(async (query = search) => {
    const radiusMeters = origin.fallback ? 4_500_000 : 80_000;
    const next = await listFleetRouteLocations({ latitude: origin.latitude, longitude: origin.longitude, radiusMeters, search: query, limit: 180 });
    setRouteLocations(next);
    if (!selectedLocationId && next[0]) setSelectedLocationId(routeLocationId(next[0]));
  }, [origin, search, selectedLocationId]);

  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [load]);
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(async permission => {
      if (permission.status !== 'granted') return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setOrigin({ latitude: current.coords.latitude, longitude: current.coords.longitude, fallback: false });
    }).catch(() => {});
  }, []);
  useEffect(() => { loadRouteLocations().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [origin]);

  const routes = useMemo(() => (inventory?.routes ?? []) as any[], [inventory]);
  const vehicles = useMemo(() => (inventory?.vehicles ?? []) as any[], [inventory]);
  const drivers = useMemo(() => (inventory?.drivers ?? []) as any[], [inventory]);
  const selectedRoute = routes.find(row => String(row.id) === routeId);
  const selectedVehicle = vehicles.find(row => String(row.id) === String(selectedRoute?.vehicle_id ?? ''));
  const selectedDriver = drivers.find(row => String(row.id) === String(selectedRoute?.driver_id ?? ''));
  const selectedLocation = routeLocations.find(item => routeLocationId(item) === selectedLocationId) ?? null;
  const routeLocationById = useMemo(() => new Map(routeLocations.map(item => [routeLocationId(item), item])), [routeLocations]);
  const routeLocked = Boolean(selectedRoute?.dispatch_locked) || ['dispatched', 'active', 'in_progress', 'completed'].includes(String(selectedRoute?.status ?? ''));

  if (!workspace) return <View style={{ padding: 20 }}><Text>Choose a Fleet-enabled workspace first.</Text></View>;
  const businessId = workspace.business_id;

  async function reload() {
    setRefreshing(true); setError(null);
    try { await Promise.all([load(), refreshWorkspace(), loadRouteLocations()]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setRefreshing(false); }
  }
  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key); setError(null); setNotice(null);
    try { await action(); setNotice(success); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  }
  async function choose(nextRouteId: string) {
    setRouteId(nextRouteId);
    const nextStops = await listRouteStops(businessId, nextRouteId) as RouteStop[];
    setStops(nextStops);
    setDraftStopIds(nextStops.map(stop => String(stop.location_id ?? '')).filter(Boolean));
  }
  async function create() {
    const name = routeName.trim();
    if (!name) { setError('Give the route a name before creating it.'); return; }
    setBusy('create'); setError(null); setNotice(null);
    try {
      const created: any = await createRoute(businessId, { name, status: 'planned', vehicle_id: vehicleId || null, driver_id: driverId || null });
      setRouteName(''); setVehicleId(''); setDriverId('');
      if (created?.id) {
        setRouteId(String(created.id));
        setStops([]); setDraftStopIds([]);
      }
      setNotice('Route created. Add stops from the map, save the stop order, then dispatch.');
      await refreshWorkspace();
      const next = await listFleetInventory(businessId);
      setInventory(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  }
  function toggleDraftStop(id: string) {
    if (!routeId) { setError('Create or select a route before adding stops.'); return; }
    if (routeLocked) { setError('Dispatched route stop order is locked.'); return; }
    setDraftStopIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }
  function moveStop(index: number, delta: number) {
    setDraftStopIds(current => {
      const nextIndex = index + delta;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }
  async function saveStops() {
    if (!routeId) { setError('Select a route first.'); return; }
    if (!draftStopIds.length) { setError('Add at least one location stop before saving.'); return; }
    await run('save-stops', () => setRouteStops(businessId, routeId, draftStopIds.map(location_id => ({ location_id, metadata: { source: 'fleet_map_planner' } }))), 'Route stop order saved.');
  }
  async function dispatch() {
    if (!selectedRoute) return;
    if (!selectedRoute.vehicle_id) { setError('Assign a vehicle before dispatch.'); return; }
    if (!selectedRoute.driver_id) { setError('Assign a driver before dispatch.'); return; }
    if (!stops.length) { setError('Save at least one route stop before dispatch.'); return; }
    await run('dispatch', () => dispatchRoute(businessId, String(selectedRoute.id)), 'Route dispatched. Geofence, timing, notification and exception tracking are now active.');
  }

  const mapCenter: [number, number] = selectedLocation ? [Number(selectedLocation.longitude), Number(selectedLocation.latitude)] : [origin.longitude, origin.latitude];

  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing || workspaceRefreshing} onRefresh={reload} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 70 }}>
    <View style={hero}>
      <Text style={{ color: '#c8ead7', fontWeight: '900', letterSpacing: 1 }}>MAP ROUTING + DISPATCH</Text>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: '900' }}>Build a mission from the Kleenest location network</Text>
      <Text style={{ color: '#dce9e2', lineHeight: 20 }}>The same canonical places that power Consumer Explore now become ordered Fleet stops. Dispatch turns the route into a live operational mission for geofencing, timing, notifications, exceptions and progression.</Text>
    </View>
    {origin.fallback ? <View style={warning}><Text style={{ color: '#6c511c' }}>Location permission is off. Search still works across the national network; enable location for nearby-first planning.</Text></View> : null}
    {error ? <View style={errorCard}><Text selectable style={{ color: '#9b2c2c', fontWeight: '700' }}>{error}</Text></View> : null}
    {notice ? <View style={noticeCard}><Text style={{ color: '#22563c', fontWeight: '700' }}>{notice}</Text></View> : null}

    <View style={card}>
      <Text style={heading}>Route location search</Text>
      <View style={row}><TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => loadRouteLocations(search)} placeholder="Search a place, address, city or brand" style={[input, { flex: 1, minWidth: 220 }]} /><Action label={busy === 'search' ? 'Searching…' : 'Search'} onPress={async () => { setBusy('search'); try { await loadRouteLocations(search); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(null); } }} /></View>
    </View>

    <FleetMap center={mapCenter} locations={routeLocations} selectedId={selectedLocationId} routeStopIds={draftStopIds} onSelect={item => setSelectedLocationId(routeLocationId(item))} />
    {selectedLocation ? <FleetSelectedLocationCard item={selectedLocation} stopIndex={draftStopIds.indexOf(routeLocationId(selectedLocation))} onToggleStop={() => toggleDraftStop(routeLocationId(selectedLocation))} /> : null}

    <View style={card}>
      <Text style={heading}>Create route</Text>
      <TextInput value={routeName} onChangeText={setRouteName} placeholder="Route name, e.g. North Side Morning" style={input} />
      <Text style={label}>Vehicle</Text>
      <ChoiceRow items={vehicles} selectedId={vehicleId} label={(item:any) => String(item.name ?? item.unit_code ?? 'Vehicle')} onSelect={setVehicleId} empty="No vehicles yet. Create one in Vehicles, Drivers & Maintenance." />
      <Text style={label}>Driver</Text>
      <ChoiceRow items={drivers} selectedId={driverId} label={(item:any) => String(item.name ?? 'Driver')} onSelect={setDriverId} empty="No drivers yet. Create one in Vehicles, Drivers & Maintenance." />
      <Action label={busy === 'create' ? 'Creating route…' : 'Create planned route'} disabled={busy === 'create'} onPress={create} />
    </View>

    <View style={{ gap: 9 }}>
      <Text style={heading}>Routes</Text>
      {routes.length === 0 ? <View style={card}><Text style={muted}>No routes yet. Create the first route above.</Text></View> : routes.map(route => {
        const active = String(route.id) === routeId;
        return <Pressable key={String(route.id)} onPress={() => choose(String(route.id))} style={[card, { borderWidth: active ? 2 : 0, borderColor: '#4f8b69' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><Text style={{ fontSize: 17, fontWeight: '900', flex: 1 }}>{String(route.name ?? 'Fleet route')}</Text><Status text={String(route.status ?? 'planned')} /></View>
          <Text style={muted}>{Number(route.stops_count ?? 0)} saved stops{route.scheduled_for ? ` · ${new Date(route.scheduled_for).toLocaleString()}` : ''}</Text>
        </Pressable>;
      })}
    </View>

    {selectedRoute ? <View style={card}>
      <Text style={heading}>{String(selectedRoute.name ?? 'Selected route')}</Text>
      <Text style={muted}>Vehicle: {String(selectedVehicle?.name ?? selectedVehicle?.unit_code ?? 'Not assigned')}</Text>
      <Text style={muted}>Driver: {String(selectedDriver?.name ?? 'Not assigned')}</Text>
      <Text style={muted}>Status: {String(selectedRoute.status ?? 'planned').replaceAll('_', ' ')} · {routeLocked ? 'stop order locked' : 'stop order editable'}</Text>
      <Text style={label}>Draft stop order</Text>
      {draftStopIds.length === 0 ? <Text style={muted}>Tap map pins or search results and choose Add to route.</Text> : draftStopIds.map((id, index) => {
        const location = routeLocationById.get(id);
        const saved = stops.find(stop => String(stop.location_id) === id);
        return <View key={`${id}-${index}`} style={inner}>
          <Text style={{ fontWeight: '900' }}>Stop {index + 1} · {String(location?.name ?? saved?.location_name ?? saved?.name ?? 'Canonical location')}</Text>
          <Text style={muted}>{location ? [location.address, location.city, location.state].filter(Boolean).join(', ') : id}</Text>
          {!routeLocked ? <View style={row}><Action label="↑" disabled={index === 0} secondary onPress={() => moveStop(index, -1)} /><Action label="↓" disabled={index === draftStopIds.length - 1} secondary onPress={() => moveStop(index, 1)} /><Action label="Remove" secondary onPress={() => toggleDraftStop(id)} /></View> : null}
        </View>;
      })}
      {!routeLocked ? <Action label={busy === 'save-stops' ? 'Saving stops…' : 'Save route stop order'} disabled={busy === 'save-stops' || !draftStopIds.length} onPress={saveStops} /> : null}
      <Action label={busy === 'dispatch' ? 'Dispatching…' : 'Dispatch selected route'} disabled={busy === 'dispatch' || routeLocked} onPress={dispatch} />
    </View> : null}
  </ScrollView>;
}

const hero = { backgroundColor: '#173f2d' as const, borderRadius: 20, padding: 18, gap: 7 };
const card = { backgroundColor: 'white' as const, borderRadius: 18, padding: 15, gap: 9 };
const inner = { backgroundColor: '#f4f7f5' as const, borderRadius: 13, padding: 12, gap: 6 };
const heading = { fontSize: 20, fontWeight: '900' as const, color: '#173024' };
const label = { fontSize: 13, fontWeight: '900' as const, color: '#3e594a', marginTop: 2 };
const muted = { color: '#66766e' as const, lineHeight: 19 };
const input = { borderWidth: 1, borderColor: '#d7e2db', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, color: '#173024' };
const row = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 7, alignItems: 'center' as const };
const errorCard = { backgroundColor: '#fff0f0' as const, borderRadius: 14, padding: 12 };
const noticeCard = { backgroundColor: '#e6f3eb' as const, borderRadius: 14, padding: 12 };
const warning = { backgroundColor: '#fff8e8' as const, borderRadius: 14, padding: 12 };
function Status({ text }: { text: string }) { return <View style={{ backgroundColor: '#e3eee7', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: '#28533c', fontWeight: '800', fontSize: 12 }}>{text.replaceAll('_', ' ')}</Text></View>; }
function Action({ label, onPress, disabled, secondary = false }: { label: string; onPress: () => void | Promise<void>; disabled?: boolean; secondary?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={{ alignSelf: 'flex-start', backgroundColor: secondary ? '#edf3ef' : '#173f2d', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, opacity: disabled ? 0.45 : 1 }}><Text style={{ color: secondary ? '#244d39' : 'white', fontWeight: '900' }}>{label}</Text></Pressable>; }
function ChoiceRow({ items, selectedId, label, onSelect, empty }: { items: any[]; selectedId: string; label: (item:any) => string; onSelect: (id:string) => void; empty:string }) { if (!items.length) return <Text style={muted}>{empty}</Text>; return <View style={row}>{items.map(item => { const id = String(item.id); const active = id === selectedId; return <Pressable key={id} onPress={() => onSelect(active ? '' : id)} style={{ backgroundColor: active ? '#173f2d' : '#edf3ef', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 }}><Text style={{ color: active ? 'white' : '#244d39', fontWeight: '800' }}>{label(item)}</Text></Pressable>; })}</View>; }
