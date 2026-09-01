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
  const { workspace, dashboard, dispatch, intelligence, entitlement, loading, refreshing, error, refresh } = useFleetWorkspace();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
  if (error || !workspace) return <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}><Text style={{ fontSize: 25, fontWeight: '800' }}>Fleet access required</Text><Text style={{ color: '#607067', lineHeight: 21 }}>{error ?? 'No Fleet workspace resolved.'}</Text><Pressable onPress={refresh} style={{ alignSelf: 'flex-start', backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 }}><Text style={{ color: 'white', fontWeight: '800' }}>Retry</Text></Pressable></View>;
  const name = String(workspace.business_name ?? workspace.name ?? 'Kleenest Fleet');
  const enterprise = readEnterprise(entitlement);
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 56 }}>
    <View style={{ gap: 5 }}><Text style={{ color: '#3d6754', fontSize: 13, fontWeight: '800' }}>KLEENEST FLEET · {enterprise ? 'ENTERPRISE' : 'STANDARD FLEET'}</Text><Text style={{ fontSize: 28, fontWeight: '800', color: '#12251c' }}>{name}</Text><Text style={{ color: '#5d6e65' }}>Live dispatch, execution, signals, prevention, Premium distribution and exception intelligence from the shared Kleenest platform.</Text></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Metric label="Dashboard signals" value={objectCount(dashboard)} /><Metric label="Dispatch state" value={objectCount(dispatch)} /><Metric label="Intelligence domains" value={objectCount(intelligence)} /></View>
    <Route href="/operations" title="Fleet Operations" detail="Vehicles, drivers, routes, alerts, maintenance and controller policies" />
    <Route href="/execution" title="Route Execution" detail="Dispatch routes and record authoritative stop arrival, service, completion, departure and skip timing" />
    <Route href="/signals" title="Fleet Signals" detail="Server-enforced monitored locations, occupancy intelligence and Business geofence controls" />
    <Route href="/sync" title="Offline & Notifications" detail="Fleet offline packs, idempotent queued events and canonical in-app/push route notifications" />
    <Route href="/intelligence" title="Fleet Intelligence" detail="Exceptions, prevention/remediation, scorecards and Enterprise-ready operational intelligence" />
    <Route href="/metrics" title="Fleet Metrics" detail="Controller-authored goals, thresholds and scoring definitions over canonical measurement sources" />
    <Route href="/premium" title="Fleet Premium" detail="Provision and revoke organization-scoped Kleenest Premium access for Fleet recipients" />
    <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 16, gap: 6 }}><Text style={{ fontSize: 18, fontWeight: '800' }}>Monitoring entitlement</Text><Text style={{ color: '#5d6e65', lineHeight: 20 }}>{enterprise ? 'Enterprise Fleet monitoring is enabled for multiple locations in this workspace.' : 'Fleet includes one monitored location. A second monitored location is rejected by the server unless Enterprise is enabled; Business Growth does not increase this Fleet limit.'}</Text></View>
  </ScrollView>;
}
function Metric({ label, value }: { label: string; value: number }) { return <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, minWidth: 120, flexGrow: 1 }}><Text style={{ color: '#66766e', fontSize: 12, fontWeight: '700' }}>{label}</Text><Text style={{ fontSize: 25, fontWeight: '800' }}>{value}</Text></View>; }
function Route({ href, title, detail }: { href: '/operations' | '/execution' | '/signals' | '/sync' | '/intelligence' | '/metrics' | '/premium'; title: string; detail: string }) { return <Link href={href} asChild><Pressable style={{ backgroundColor: 'white', borderRadius: 18, padding: 16, gap: 5 }}><Text style={{ fontSize: 18, fontWeight: '800' }}>{title}</Text><Text style={{ color: '#63736a', lineHeight: 20 }}>{detail}</Text></Pressable></Link>; }
