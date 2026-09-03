import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

function objectCount(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length;
  return 0;
}

function readEnterprise(entitlement: Record<string, unknown> | null) {
  const access = entitlement?.productAccess;
  if (access && typeof access === 'object') return Boolean((access as Record<string, unknown>).enterprise_enabled);
  const service = entitlement?.serviceEntitlement;
  if (service && typeof service === 'object') return Boolean((service as Record<string, unknown>).enterprise_enabled ?? (service as Record<string, unknown>).enterprise_fleet_enabled);
  return false;
}

export default function FleetControlCenter() {
  const { workspace, workspaces, dashboard, dispatch, intelligence, entitlement, loading, refreshing, error, refresh, selectWorkspace } = useFleetWorkspace();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
  if (error || !workspace) return <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}><Text style={{ fontSize: 25, fontWeight: '800' }}>Fleet access required</Text><Text style={{ color: '#607067', lineHeight: 21 }}>{error ?? 'No Fleet workspace resolved.'}</Text><View style={{ flexDirection: 'row', gap: 9 }}><Link href="/auth" asChild><Pressable style={{ backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 }}><Text style={{ color: 'white', fontWeight: '800' }}>Sign in</Text></Pressable></Link><Pressable onPress={refresh} style={{ backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 }}><Text style={{ color: '#173f2d', fontWeight: '800' }}>Retry</Text></Pressable></View></View>;
  const name = String(workspace.business_name ?? workspace.name ?? 'Kleenest Fleet');
  const enterprise = readEnterprise(entitlement);
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 56 }}>
    <View style={{ gap: 5 }}><Text style={{ color: '#3d6754', fontSize: 13, fontWeight: '800' }}>KLEENEST FLEET · {enterprise ? 'ENTERPRISE' : 'FLEET'}</Text><Text style={{ fontSize: 28, fontWeight: '800', color: '#12251c' }}>{name}</Text><Text style={{ color: '#5d6e65' }}>Dispatch routes, manage drivers and vehicles, send notifications, work offline, and use Fleet or Enterprise capabilities attached to the selected organization.</Text></View>
    {workspaces.length > 1 ? <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 14, gap: 9 }}><Text style={{ fontSize: 18, fontWeight: '800' }}>Choose fleet</Text><Text style={{ color: '#66766e' }}>You have access to multiple Fleet-enabled businesses. Switch here without signing out.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{workspaces.map(item => { const active = item.business_id === workspace.business_id; return <Pressable key={item.business_id} disabled={refreshing || active} onPress={() => selectWorkspace(item.business_id)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: active ? '#173f2d' : '#edf3ef', opacity: refreshing && !active ? 0.5 : 1 }}><Text style={{ color: active ? 'white' : '#244d39', fontWeight: '800' }}>{String(item.business_name ?? item.name ?? item.business_id.slice(0, 8))}</Text></Pressable>; })}</View></View> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Metric label="Fleet overview" value={objectCount(dashboard)} /><Metric label="Dispatch activity" value={objectCount(dispatch)} /><Metric label="Insights ready" value={objectCount(intelligence)} /></View>
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 17, gap: 7 }}><Text style={{ color: '#c8ead7', fontWeight: '900' }}>DISPATCH CENTER</Text><Text style={{ color: 'white', fontSize: 21, fontWeight: '900' }}>Plan, assign, dispatch and monitor routes</Text><Text style={{ color: '#dce9e2', lineHeight: 20 }}>Use a dedicated dispatch screen instead of digging through raw operational output.</Text><Link href="/dispatch" asChild><Pressable style={{ alignSelf: 'flex-start', backgroundColor: 'white', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 }}><Text style={{ color: '#173f2d', fontWeight: '900' }}>Open Dispatch</Text></Pressable></Link></View>
    <Route href="/operations" title="Vehicles, Drivers & Maintenance" detail="Create and manage fleet resources, maintenance, alerts and preventive handoffs" />
    <Route href="/execution" title="Route Execution" detail="Record arrival, service, completion, departure and skipped-stop timing" />
    <Route href="/signals" title="Fleet Signals" detail="Monitored locations, occupancy signals and geofence controls" />
    <Route href="/sync" title="Notifications & Offline" detail="Compose route notifications, use offline packs and synchronize operational events" />
    <Route href="/intelligence" title="Fleet Intelligence" detail="Plain-language exceptions, prevention, remediation and operational recommendations" />
    <Route href="/metrics" title="Fleet Metrics" detail="Goals, thresholds and scoring over canonical measurement sources" />
    <Route href="/premium" title="Fleet Premium" detail="Grant or revoke organization-scoped Kleenest Premium access" />
    {enterprise ? <Route href="/enterprise" title="Enterprise" detail="Multi-location Fleet control, partner networks and cross-business Enterprise state" /> : <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 16, gap: 5 }}><Text style={{ fontSize: 18, fontWeight: '800' }}>Enterprise access</Text><Text style={{ color: '#63736a' }}>This selected fleet is not Enterprise-enabled. Choose an Enterprise fleet above to unlock partner-network and cross-business controls.</Text></View>}
    <Route href="/auth" title="Account session" detail="Sign in or sign out of the current Fleet-authorized Kleenest account" />
  </ScrollView>;
}
function Metric({ label, value }: { label: string; value: number }) { return <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, minWidth: 120, flexGrow: 1 }}><Text style={{ color: '#66766e', fontSize: 12, fontWeight: '700' }}>{label}</Text><Text style={{ fontSize: 25, fontWeight: '800' }}>{value}</Text></View>; }
function Route({ href, title, detail }: { href: '/operations' | '/dispatch' | '/execution' | '/signals' | '/sync' | '/intelligence' | '/metrics' | '/premium' | '/enterprise' | '/auth'; title: string; detail: string }) { return <Link href={href} asChild><Pressable style={{ backgroundColor: 'white', borderRadius: 18, padding: 16, gap: 5 }}><Text style={{ fontSize: 18, fontWeight: '800' }}>{title}</Text><Text style={{ color: '#63736a', lineHeight: 20 }}>{detail}</Text></Pressable></Link>; }
