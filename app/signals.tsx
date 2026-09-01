import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { configureGeofence, getOccupancySummary, listBusinessGeofences, listBusinessLocations, listMonitoredLocations, removeMonitoredLocation, setMonitoredLocation } from '@/services/signals';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetSignalsScreen() {
  const { workspace, entitlement, refreshing: workspaceRefreshing, refresh: refreshWorkspace } = useFleetWorkspace();
  const [locations, setLocations] = useState<any[]>([]);
  const [monitored, setMonitored] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, unknown>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspace) return;
    const businessId = workspace.business_id;
    const [nextLocations, nextMonitored, nextGeofences] = await Promise.all([listBusinessLocations(businessId), listMonitoredLocations(businessId), listBusinessGeofences(businessId)]);
    setLocations(nextLocations as any[]); setMonitored(nextMonitored); setGeofences(nextGeofences as any[]);
    const summaries = await Promise.all(nextMonitored.map(async row => [String(row.location_id), await getOccupancySummary(String(row.location_id))] as const));
    setOccupancy(Object.fromEntries(summaries));
  }, [workspace]);
  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [load]);
  if (!workspace) return <View style={{ padding: 20 }}><Text>Fleet workspace required.</Text></View>;
  const businessId = workspace.business_id;
  const product = entitlement?.productAccess as Record<string, unknown> | undefined;
  const enterprise = Boolean(product?.enterprise_enabled);
  const monitoredIds = new Set(monitored.map(row => String(row.location_id)));

  async function reload() { setRefreshing(true); setError(null); try { await Promise.all([load(), refreshWorkspace()]); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setRefreshing(false); } }
  async function run(key: string, action: () => Promise<unknown>) { setBusy(key); setError(null); try { await action(); await reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(null); } }

  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing || workspaceRefreshing} onRefresh={reload} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    {error ? <Text style={{ color: '#9b2c2c' }}>{error}</Text> : null}
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}><Text style={{ color: '#c8ead7', fontSize: 12, fontWeight: '800' }}>FLEET SIGNALS</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Monitored locations, occupancy and geofences</Text><Text style={{ color: '#dce9e2' }}>{enterprise ? 'Enterprise monitoring is enabled for multiple locations.' : 'Standard Fleet is server-limited to one monitored location.'}</Text></View>
    <View style={{ gap: 9 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Business locations</Text>{locations.map((location: any) => { const id = String(location.id); const active = monitoredIds.has(id); return <View key={id} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 7 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{String(location.name ?? 'Location')}</Text><Text style={{ color: '#66766e' }}>{[location.address,location.city,location.state].filter(Boolean).join(', ')}</Text><Pressable disabled={busy === id} onPress={() => run(id, () => active ? removeMonitoredLocation(businessId,id) : setMonitoredLocation(businessId,id,true))} style={{ alignSelf: 'flex-start', backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, opacity: busy === id ? 0.5 : 1 }}><Text style={{ color: '#244d39', fontWeight: '800' }}>{active ? 'Stop monitoring' : 'Monitor location'}</Text></Pressable></View>; })}</View>
    <View style={{ gap: 9 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Live occupancy signals</Text>{monitored.map((row: any) => <View key={String(row.location_id)} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 5 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{String(row.location_name ?? 'Monitored location')}</Text><Text selectable style={{ color: '#5f6f66' }}>{JSON.stringify(occupancy[String(row.location_id)] ?? {}, null, 2)}</Text></View>)}</View>
    <View style={{ gap: 9 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Geofences</Text>{geofences.length === 0 ? <Text style={{ color: '#66766e' }}>No Business geofences currently exist for this Fleet workspace.</Text> : geofences.map((geofence: any) => <View key={String(geofence.id)} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 7 }}><Text style={{ fontWeight: '800' }}>{Number(geofence.radius_meters ?? 150)}m geofence</Text><Text style={{ color: '#66766e' }}>{geofence.active === false ? 'Inactive' : 'Active'} · notifications {geofence.notification_enabled ? 'on' : 'off'}</Text><Pressable disabled={busy === `geo:${geofence.id}`} onPress={() => run(`geo:${geofence.id}`, () => configureGeofence(String(geofence.id), { notificationEnabled: !geofence.notification_enabled, active: true, title: 'Fleet location signal', body: 'A Kleenest Fleet geofence signal was recorded.' }))} style={{ alignSelf: 'flex-start', backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: '#244d39', fontWeight: '800' }}>Toggle notifications</Text></Pressable></View>)}</View>
  </ScrollView>;
}
