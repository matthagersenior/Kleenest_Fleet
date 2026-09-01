import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

function objectCount(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length;
  return 0;
}

export default function FleetControlCenter() {
  const { workspace, dashboard, dispatch, intelligence, loading, refreshing, error, refresh } = useFleetWorkspace();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
  if (error || !workspace) return <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}><Text style={{ fontSize: 25, fontWeight: '800' }}>Fleet access required</Text><Text style={{ color: '#607067', lineHeight: 21 }}>{error ?? 'No Fleet workspace resolved.'}</Text><Pressable onPress={refresh} style={{ alignSelf: 'flex-start', backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 }}><Text style={{ color: 'white', fontWeight: '800' }}>Retry</Text></Pressable></View>;
  const name = String(workspace.business_name ?? workspace.name ?? 'Kleenest Fleet');
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 56 }}>
    <View style={{ gap: 5 }}><Text style={{ color: '#3d6754', fontSize: 13, fontWeight: '800' }}>KLEENEST FLEET</Text><Text style={{ fontSize: 28, fontWeight: '800', color: '#12251c' }}>{name}</Text><Text style={{ color: '#5d6e65' }}>Live dispatch, execution, prevention and exception intelligence from the shared Kleenest platform.</Text></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Metric label="Dashboard signals" value={objectCount(dashboard)} /><Metric label="Dispatch state" value={objectCount(dispatch)} /><Metric label="Intelligence domains" value={objectCount(intelligence)} /></View>
    <Route href="/operations" title="Fleet Operations" detail="Vehicles, drivers, routes, route stops, dispatch, timing, alerts and controller policies" />
    <Route href="/intelligence" title="Fleet Intelligence" detail="Exceptions, prevention/remediation, metrics, scorecards and Enterprise-ready operational intelligence" />
    <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 16, gap: 6 }}><Text style={{ fontSize: 18, fontWeight: '800' }}>Product boundary</Text><Text style={{ color: '#5d6e65', lineHeight: 20 }}>Fleet includes Business Standard. One Fleet-monitored location is included; monitoring additional locations requires Enterprise. Growth does not raise the Fleet monitoring limit.</Text></View>
  </ScrollView>;
}
function Metric({ label, value }: { label: string; value: number }) { return <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, minWidth: 120, flexGrow: 1 }}><Text style={{ color: '#66766e', fontSize: 12, fontWeight: '700' }}>{label}</Text><Text style={{ fontSize: 25, fontWeight: '800' }}>{value}</Text></View>; }
function Route({ href, title, detail }: { href: '/operations' | '/intelligence'; title: string; detail: string }) { return <Link href={href} asChild><Pressable style={{ backgroundColor: 'white', borderRadius: 18, padding: 16, gap: 5 }}><Text style={{ fontSize: 18, fontWeight: '800' }}>{title}</Text><Text style={{ color: '#63736a', lineHeight: 20 }}>{detail}</Text></Pressable></Link>; }
