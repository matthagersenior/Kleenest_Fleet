import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { createRoute, dispatchRoute, listFleetInventory, listRouteStops } from '@/services/fleet';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

type Inventory = Awaited<ReturnType<typeof listFleetInventory>>;

export default function DispatchCenter() {
  const { workspace, refreshing: workspaceRefreshing, refresh: refreshWorkspace } = useFleetWorkspace();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [routeId, setRouteId] = useState('');
  const [stops, setStops] = useState<any[]>([]);
  const [routeName, setRouteName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
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
    setStops(nextRouteId ? await listRouteStops(workspace.business_id, nextRouteId) as any[] : []);
  }, [workspace, routeId]);

  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [load]);
  const routes = useMemo(() => (inventory?.routes ?? []) as any[], [inventory]);
  const vehicles = useMemo(() => (inventory?.vehicles ?? []) as any[], [inventory]);
  const drivers = useMemo(() => (inventory?.drivers ?? []) as any[], [inventory]);
  const selectedRoute = routes.find(row => String(row.id) === routeId);
  const selectedVehicle = vehicles.find(row => String(row.id) === String(selectedRoute?.vehicle_id ?? ''));
  const selectedDriver = drivers.find(row => String(row.id) === String(selectedRoute?.driver_id ?? ''));

  if (!workspace) return <View style={{ padding: 20 }}><Text>Choose a Fleet workspace first.</Text></View>;
  const businessId = workspace.business_id;

  async function reload() {
    setRefreshing(true); setError(null);
    try { await Promise.all([load(), refreshWorkspace()]); }
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
    setStops(await listRouteStops(businessId, nextRouteId) as any[]);
  }
  async function create() {
    const name = routeName.trim();
    if (!name) { setError('Give the route a name before creating it.'); return; }
    await run('create', async () => {
      const created: any = await createRoute(businessId, { name, status: 'planned', vehicle_id: vehicleId || null, driver_id: driverId || null });
      setRouteName('');
      setVehicleId('');
      setDriverId('');
      if (created?.id) setRouteId(String(created.id));
    }, 'Route created and ready for stops or dispatch.');
  }

  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing || workspaceRefreshing} onRefresh={reload} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}>
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}>
      <Text style={{ color: '#c8ead7', fontWeight: '900', letterSpacing: 1 }}>DISPATCH CENTER</Text>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: '900' }}>Plan and dispatch routes</Text>
      <Text style={{ color: '#dce9e2', lineHeight: 20 }}>Create a named route, assign a vehicle and driver, review stops, then dispatch it from one screen.</Text>
    </View>
    {error ? <View style={{ backgroundColor: '#fff0f0', borderRadius: 14, padding: 12 }}><Text style={{ color: '#9b2c2c', fontWeight: '700' }}>{error}</Text></View> : null}
    {notice ? <View style={{ backgroundColor: '#e6f3eb', borderRadius: 14, padding: 12 }}><Text style={{ color: '#22563c', fontWeight: '700' }}>{notice}</Text></View> : null}

    <View style={card}>
      <Text style={heading}>Create route</Text>
      <TextInput value={routeName} onChangeText={setRouteName} placeholder="Route name, e.g. North Side Morning" style={input} />
      <Text style={label}>Vehicle</Text>
      <ChoiceRow items={vehicles} selectedId={vehicleId} label={(item:any) => String(item.name ?? item.unit_code ?? 'Vehicle')} onSelect={setVehicleId} empty="No vehicles yet. Create one in Vehicles, Drivers & Maintenance." />
      <Text style={label}>Driver</Text>
      <ChoiceRow items={drivers} selectedId={driverId} label={(item:any) => String(item.name ?? 'Driver')} onSelect={setDriverId} empty="No drivers yet. Create one in Vehicles, Drivers & Maintenance." />
      <Pressable disabled={busy === 'create'} onPress={create} style={[primary, { opacity: busy === 'create' ? .5 : 1 }]}><Text style={primaryText}>{busy === 'create' ? 'Creating route…' : 'Create planned route'}</Text></Pressable>
    </View>

    <View style={{ gap: 9 }}>
      <Text style={heading}>Routes</Text>
      {routes.length === 0 ? <View style={card}><Text style={{ color: '#66766e' }}>No routes yet. Create the first route above.</Text></View> : routes.map(route => {
        const active = String(route.id) === routeId;
        return <Pressable key={String(route.id)} onPress={() => choose(String(route.id))} style={[card, { borderWidth: active ? 2 : 0, borderColor: '#4f8b69' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><Text style={{ fontSize: 17, fontWeight: '900', flex: 1 }}>{String(route.name ?? 'Fleet route')}</Text><Status text={String(route.status ?? 'planned')} /></View>
          <Text style={{ color: '#66766e' }}>{Number(route.stops_count ?? 0)} stops{route.scheduled_for ? ` · ${new Date(route.scheduled_for).toLocaleString()}` : ''}</Text>
        </Pressable>;
      })}
    </View>

    {selectedRoute ? <View style={card}>
      <Text style={heading}>{String(selectedRoute.name ?? 'Selected route')}</Text>
      <Text style={{ color: '#66766e' }}>Vehicle: {String(selectedVehicle?.name ?? selectedVehicle?.unit_code ?? 'Not assigned')}</Text>
      <Text style={{ color: '#66766e' }}>Driver: {String(selectedDriver?.name ?? 'Not assigned')}</Text>
      <Text style={{ color: '#66766e' }}>Status: {String(selectedRoute.status ?? 'planned').replaceAll('_', ' ')}</Text>
      <Pressable disabled={busy === 'dispatch' || ['dispatched','active','in_progress','completed'].includes(String(selectedRoute.status ?? ''))} onPress={() => run('dispatch', () => dispatchRoute(businessId, String(selectedRoute.id)), 'Route dispatched successfully.')} style={[primary, { opacity: busy === 'dispatch' ? .5 : 1 }]}><Text style={primaryText}>{busy === 'dispatch' ? 'Dispatching…' : 'Dispatch selected route'}</Text></Pressable>
      <Text style={label}>Stops</Text>
      {stops.length === 0 ? <Text style={{ color: '#66766e' }}>No stops are attached yet. Add stops from preventive dispatch opportunities or route planning tools.</Text> : stops.map(stop => <View key={String(stop.id)} style={{ backgroundColor: '#f4f7f5', borderRadius: 13, padding: 12, gap: 4 }}><Text style={{ fontWeight: '900' }}>Stop {String(stop.stop_order ?? '')}</Text><Text style={{ color: '#66766e' }}>{String(stop.location_name ?? stop.name ?? stop.address ?? 'Fleet stop')}</Text><Text style={{ color: '#66766e' }}>{String(stop.status ?? 'planned').replaceAll('_', ' ')}</Text></View>)}
    </View> : null}
  </ScrollView>;
}

const card = { backgroundColor: 'white' as const, borderRadius: 18, padding: 15, gap: 9 };
const heading = { fontSize: 20, fontWeight: '900' as const, color: '#173024' };
const label = { fontSize: 13, fontWeight: '900' as const, color: '#3e594a', marginTop: 2 };
const input = { borderWidth: 1, borderColor: '#d7e2db', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, color: '#173024' };
const primary = { alignSelf: 'flex-start' as const, backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 };
const primaryText = { color: 'white', fontWeight: '900' as const };
function Status({ text }: { text: string }) { return <View style={{ backgroundColor: '#e3eee7', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: '#28533c', fontWeight: '800', fontSize: 12 }}>{text.replaceAll('_', ' ')}</Text></View>; }
function ChoiceRow({ items, selectedId, label, onSelect, empty }: { items: any[]; selectedId: string; label: (item:any) => string; onSelect: (id:string) => void; empty:string }) { if (!items.length) return <Text style={{ color: '#66766e' }}>{empty}</Text>; return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{items.map(item => { const id = String(item.id); const active = id === selectedId; return <Pressable key={id} onPress={() => onSelect(active ? '' : id)} style={{ backgroundColor: active ? '#173f2d' : '#edf3ef', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 }}><Text style={{ color: active ? 'white' : '#244d39', fontWeight: '800' }}>{label(item)}</Text></Pressable>; })}</View>; }
