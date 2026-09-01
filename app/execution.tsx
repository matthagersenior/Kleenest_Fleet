import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { dispatchRoute, listFleetInventory, listRouteStops, recordRouteStopTiming } from '@/services/fleet';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetExecutionScreen() {
  const { workspace, refreshing: workspaceRefreshing, refresh: refreshWorkspace } = useFleetWorkspace();
  const [routes, setRoutes] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspace) return;
    const inventory = await listFleetInventory(workspace.business_id);
    const nextRoutes = inventory.routes as any[];
    const routeId = selectedRouteId && nextRoutes.some(row => String(row.id) === selectedRouteId) ? selectedRouteId : String(nextRoutes[0]?.id ?? '');
    setRoutes(nextRoutes);
    setSelectedRouteId(routeId || null);
    setStops(routeId ? await listRouteStops(workspace.business_id, routeId) as any[] : []);
  }, [workspace, selectedRouteId]);

  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [load]);
  if (!workspace) return <View style={{ padding: 20 }}><Text>Fleet workspace required.</Text></View>;
  const businessId = workspace.business_id;

  async function reload() { setRefreshing(true); setError(null); try { await Promise.all([load(), refreshWorkspace()]); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setRefreshing(false); } }
  async function run(key: string, action: () => Promise<unknown>) { setBusy(key); setError(null); try { await action(); await reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(null); } }
  async function choose(routeId: string) { setSelectedRouteId(routeId); setStops(await listRouteStops(businessId, routeId) as any[]); }

  const selectedRoute = routes.find(row => String(row.id) === selectedRouteId);
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing || workspaceRefreshing} onRefresh={reload} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    {error ? <Text style={{ color: '#9b2c2c' }}>{error}</Text> : null}
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}><Text style={{ color: '#c8ead7', fontSize: 12, fontWeight: '800' }}>ROUTE EXECUTION</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Canonical stop timing lifecycle</Text><Text style={{ color: '#dce9e2' }}>Arrival, service, completion, departure and skip actions write Fleet operational events and can automatically complete the route.</Text></View>
    <View style={{ gap: 8 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Routes</Text>{routes.map(route => <Pressable key={String(route.id)} onPress={() => choose(String(route.id))} style={{ backgroundColor: String(route.id) === selectedRouteId ? '#dfece5' : 'white', borderRadius: 14, padding: 13 }}><Text style={{ fontWeight: '800' }}>{String(route.name ?? 'Route')}</Text><Text style={{ color: '#66766e' }}>{String(route.status ?? 'planned')} · {Number(route.stops_count ?? 0)} stops</Text></Pressable>)}</View>
    {selectedRoute ? <Pressable disabled={busy === 'dispatch'} onPress={() => run('dispatch', () => dispatchRoute(businessId, String(selectedRoute.id)))} style={{ alignSelf: 'flex-start', backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, opacity: busy === 'dispatch' ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '800' }}>{busy === 'dispatch' ? 'Dispatching…' : 'Dispatch selected route'}</Text></Pressable> : null}
    <View style={{ gap: 10 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Stops</Text>{stops.length === 0 ? <Text style={{ color: '#66766e' }}>No stops are configured on this route.</Text> : stops.map(stop => <View key={String(stop.id)} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 8 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>Stop {String(stop.stop_order ?? '')}</Text><Text style={{ color: '#66766e' }}>{String(stop.status ?? 'planned')}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{['arrived','service_started','completed','departed','skipped'].map(event => <Pressable key={event} disabled={busy === `${stop.id}:${event}`} onPress={() => run(`${stop.id}:${event}`, () => recordRouteStopTiming(businessId, String(stop.route_id), String(stop.id), event))} style={{ backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }}><Text style={{ color: '#244d39', fontWeight: '800', fontSize: 12 }}>{event.replace('_',' ')}</Text></Pressable>)}</View></View>)}</View>
  </ScrollView>;
}
