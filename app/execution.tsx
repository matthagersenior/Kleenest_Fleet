import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { dispatchRoute, listFleetInventory, listRouteStops, recordRouteStopTiming } from '@/services/fleet';
import { distanceMeters, getFleetRouteGeofenceManifest, recordFleetGeofenceEvent, type FleetRouteGeofence } from '@/services/geofence';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetExecutionScreen() {
  const { workspace, refreshing: workspaceRefreshing, refresh: refreshWorkspace } = useFleetWorkspace();
  const [routes, setRoutes] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [geofences, setGeofences] = useState<FleetRouteGeofence[]>([]);
  const [tracking, setTracking] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insideRef = useRef(new Set<string>());
  const transitionBusyRef = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!workspace) return;
    const inventory = await listFleetInventory(workspace.business_id);
    const nextRoutes = inventory.routes as any[];
    const routeId = selectedRouteId && nextRoutes.some(row => String(row.id) === selectedRouteId) ? selectedRouteId : String(nextRoutes[0]?.id ?? '');
    setRoutes(nextRoutes);
    setSelectedRouteId(routeId || null);
    if (routeId) {
      const [nextStops, nextGeofences] = await Promise.all([
        listRouteStops(workspace.business_id, routeId) as Promise<any[]>,
        getFleetRouteGeofenceManifest(workspace.business_id, routeId),
      ]);
      setStops(nextStops);
      setGeofences(nextGeofences);
    } else {
      setStops([]);
      setGeofences([]);
    }
  }, [workspace, selectedRouteId]);

  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [load]);

  useEffect(() => {
    insideRef.current.clear();
    if (!workspace || !selectedRouteId || !geofences.length) { setTracking(false); return; }
    const selectedRoute = routes.find(row => String(row.id) === selectedRouteId);
    if (!selectedRoute || !['dispatched', 'active', 'in_progress'].includes(String(selectedRoute.status ?? ''))) { setTracking(false); return; }
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;
      if (permission.status !== 'granted') {
        setTracking(false);
        setTrackingMessage('Location permission is required for automatic geofence arrival/departure events. Manual stop actions remain available.');
        return;
      }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 8000 },
        position => {
          if (!mounted) return;
          setTracking(true);
          setTrackingMessage(`Geofence mission tracking active · ${geofences.length} route stop${geofences.length === 1 ? '' : 's'}`);
          const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          for (const geofence of geofences) {
            const distance = distanceMeters(current, { latitude: Number(geofence.latitude), longitude: Number(geofence.longitude) });
            const isInside = distance <= Number(geofence.radius_meters || 150);
            const wasInside = insideRef.current.has(geofence.geofence_id);
            const transition = isInside && !wasInside ? 'enter' : !isInside && wasInside ? 'exit' : null;
            if (!transition) continue;
            const key = `${geofence.geofence_id}:${transition}`;
            if (transitionBusyRef.current.has(key)) continue;
            transitionBusyRef.current.add(key);
            if (isInside) insideRef.current.add(geofence.geofence_id); else insideRef.current.delete(geofence.geofence_id);
            void recordFleetGeofenceEvent(workspace.business_id, geofence, transition, distance)
              .then(() => load())
              .catch(cause => setError(cause instanceof Error ? cause.message : String(cause)))
              .finally(() => transitionBusyRef.current.delete(key));
          }
        },
      );
    })().catch(cause => setError(cause instanceof Error ? cause.message : String(cause)));
    return () => { mounted = false; subscription?.remove(); setTracking(false); };
  }, [workspace, selectedRouteId, geofences, routes, load]);

  if (!workspace) return <View style={{ padding: 20 }}><Text>Fleet workspace required.</Text></View>;
  const businessId = workspace.business_id;

  async function reload() { setRefreshing(true); setError(null); try { await Promise.all([load(), refreshWorkspace()]); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setRefreshing(false); } }
  async function run(key: string, action: () => Promise<unknown>) { setBusy(key); setError(null); try { await action(); await reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(null); } }
  async function choose(routeId: string) {
    setSelectedRouteId(routeId);
    insideRef.current.clear();
    const [nextStops, nextGeofences] = await Promise.all([listRouteStops(businessId, routeId) as Promise<any[]>, getFleetRouteGeofenceManifest(businessId, routeId)]);
    setStops(nextStops); setGeofences(nextGeofences);
  }

  const selectedRoute = routes.find(row => String(row.id) === selectedRouteId);
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing || workspaceRefreshing} onRefresh={reload} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    {error ? <View style={{ backgroundColor: '#fff0f0', borderRadius: 14, padding: 12 }}><Text selectable style={{ color: '#9b2c2c', fontWeight: '700' }}>{error}</Text></View> : null}
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}><Text style={{ color: '#c8ead7', fontSize: 12, fontWeight: '800' }}>ROUTE EXECUTION + GEOFENCE MISSION</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Arrival, work, completion and progression</Text><Text style={{ color: '#dce9e2' }}>Entering a route-stop geofence automatically records arrival. Departures, manual service/completion, exceptions, notifications and progression converge on the same route-stop event stream.</Text></View>
    {selectedRoute ? <View style={{ backgroundColor: tracking ? '#e6f3eb' : '#fff8e8', borderRadius: 14, padding: 12, gap: 4 }}><Text style={{ fontWeight: '900', color: tracking ? '#22563c' : '#765817' }}>{tracking ? '● LIVE GEOFENCE TRACKING' : '○ GEOFENCE TRACKING READY'}</Text><Text style={{ color: tracking ? '#376b50' : '#765817' }}>{trackingMessage || `${geofences.length} geofence${geofences.length === 1 ? '' : 's'} prepared for this route. Dispatch the route to begin automatic tracking.`}</Text></View> : null}
    <View style={{ gap: 8 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Routes</Text>{routes.map(route => <Pressable key={String(route.id)} onPress={() => choose(String(route.id))} style={{ backgroundColor: String(route.id) === selectedRouteId ? '#dfece5' : 'white', borderRadius: 14, padding: 13 }}><Text style={{ fontWeight: '800' }}>{String(route.name ?? 'Route')}</Text><Text style={{ color: '#66766e' }}>{String(route.status ?? 'planned')} · {Number(route.stops_count ?? 0)} stops</Text></Pressable>)}</View>
    {selectedRoute && ['planned', 'paused'].includes(String(selectedRoute.status ?? '')) ? <Pressable disabled={busy === 'dispatch'} onPress={() => run('dispatch', () => dispatchRoute(businessId, String(selectedRoute.id)))} style={{ alignSelf: 'flex-start', backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, opacity: busy === 'dispatch' ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '800' }}>{busy === 'dispatch' ? 'Dispatching…' : 'Dispatch selected route'}</Text></Pressable> : null}
    <View style={{ gap: 10 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Stops</Text>{stops.length === 0 ? <Text style={{ color: '#66766e' }}>No stops are configured on this route. Build them in Dispatch Center using the map.</Text> : stops.map(stop => { const geofence = geofences.find(item => item.route_stop_id === String(stop.id)); return <View key={String(stop.id)} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 8 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>Stop {String(stop.stop_order ?? '')} · {geofence?.location_name ?? 'Canonical location'}</Text><Text style={{ color: '#66766e' }}>{String(stop.status ?? 'planned')} · {geofence ? `${geofence.radius_meters} m geofence` : 'geofence unavailable'}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{['arrived','service_started','completed','departed','skipped'].map(event => <Pressable key={event} disabled={busy === `${stop.id}:${event}`} onPress={() => run(`${stop.id}:${event}`, () => recordRouteStopTiming(businessId, String(stop.route_id), String(stop.id), event))} style={{ backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }}><Text style={{ color: '#244d39', fontWeight: '800', fontSize: 12 }}>{event.replace('_',' ')}</Text></Pressable>)}</View></View>; })}</View>
  </ScrollView>;
}
