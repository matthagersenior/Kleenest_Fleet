import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { listFleetInventory } from '@/services/fleet';
import { createFleetOfflinePack, listOfflinePackEvents, listOfflinePacks, publishRouteNotification, queueOfflineFleetEvent } from '@/services/signals';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetSyncScreen() {
  const { workspace, refreshing: workspaceRefreshing, refresh: refreshWorkspace } = useFleetWorkspace();
  const [routes, setRoutes] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [events, setEvents] = useState<Record<string, any[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspace) return;
    const businessId = workspace.business_id;
    const [inventory, nextPacks] = await Promise.all([listFleetInventory(businessId), listOfflinePacks(businessId)]);
    setRoutes(inventory.routes as any[]); setPacks(nextPacks as any[]);
    const nextEvents = await Promise.all((nextPacks as any[]).slice(0, 5).map(async pack => [String(pack.id), await listOfflinePackEvents(String(pack.id))] as const));
    setEvents(Object.fromEntries(nextEvents));
  }, [workspace]);
  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [load]);
  if (!workspace) return <View style={{ padding: 20 }}><Text>Fleet workspace required.</Text></View>;
  const businessId = workspace.business_id;
  async function reload() { setRefreshing(true); setError(null); try { await Promise.all([load(), refreshWorkspace()]); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setRefreshing(false); } }
  async function run(key: string, action: () => Promise<unknown>) { setBusy(key); setError(null); try { await action(); await reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(null); } }

  const readyPack = packs.find(pack => pack.status === 'ready');
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing || workspaceRefreshing} onRefresh={reload} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    {error ? <Text style={{ color: '#9b2c2c' }}>{error}</Text> : null}
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}><Text style={{ color: '#c8ead7', fontSize: 12, fontWeight: '800' }}>OFFLINE + NOTIFICATION CONVERGENCE</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Resilient Fleet execution</Text><Text style={{ color: '#dce9e2' }}>Offline events are idempotent by client event ID. Route notifications fan out through the canonical in-app and push delivery pipeline.</Text></View>
    <View style={{ gap: 9 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Offline packs</Text><Pressable disabled={busy === 'pack'} onPress={() => run('pack', () => createFleetOfflinePack(businessId, 'Fleet operations offline pack'))} style={{ alignSelf: 'flex-start', backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, opacity: busy === 'pack' ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '800' }}>{busy === 'pack' ? 'Creating…' : 'Create 72-hour Fleet pack'}</Text></Pressable>{packs.map(pack => <View key={String(pack.id)} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 5 }}><Text style={{ fontWeight: '800' }}>{String(pack.name ?? 'Offline pack')}</Text><Text style={{ color: '#66766e' }}>{String(pack.status)} · version {String(pack.version ?? 1)}</Text><Text style={{ color: '#66766e' }}>{(events[String(pack.id)] ?? []).length} queued events</Text></View>)}</View>
    {readyPack ? <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 8 }}><Text style={{ fontSize: 17, fontWeight: '800' }}>Idempotency test event</Text><Text style={{ color: '#66766e' }}>Queues an operational checkpoint with a stable client event ID for this pack.</Text><Pressable disabled={busy === 'queue'} onPress={() => run('queue', () => queueOfflineFleetEvent(String(readyPack.id), 'fleet_checkpoint', { business_id: businessId, source: 'kleenest_fleet_app' }, `fleet-checkpoint:${readyPack.id}`))} style={{ alignSelf: 'flex-start', backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: '#244d39', fontWeight: '800' }}>Queue checkpoint</Text></Pressable></View> : null}
    <View style={{ gap: 9 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Route notifications</Text>{routes.map(route => <View key={String(route.id)} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 7 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{String(route.name ?? 'Fleet route')}</Text><Text style={{ color: '#66766e' }}>{String(route.status ?? 'planned')}</Text><Pressable disabled={busy === `notify:${route.id}`} onPress={() => run(`notify:${route.id}`, () => publishRouteNotification(String(route.id), 'fleet_route_update', 'Fleet route update', `${String(route.name ?? 'Fleet route')} has an operational update.`, { route_status: route.status ?? null }))} style={{ alignSelf: 'flex-start', backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, opacity: busy === `notify:${route.id}` ? 0.5 : 1 }}><Text style={{ color: '#244d39', fontWeight: '800' }}>{busy === `notify:${route.id}` ? 'Publishing…' : 'Publish route update'}</Text></Pressable></View>)}</View>
  </ScrollView>;
}
