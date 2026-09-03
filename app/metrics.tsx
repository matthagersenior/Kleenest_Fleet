import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { StructuredData } from '@/components/StructuredData';
import { createFleetMetricDefinition, updateFleetMetricDefinition } from '@/services/fleet';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

function arrayFrom(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    for (const key of ['definitions','metrics','measurement_sources','items']) {
      const nested = (value as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return nested;
    }
  }
  return [];
}

export default function FleetMetricsScreen() {
  const { workspace, intelligence, refreshing, refresh } = useFleetWorkspace();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!workspace) return <View style={{ padding: 20 }}><Text>Fleet workspace required.</Text></View>;
  const businessId = workspace.business_id;
  const capabilities = intelligence && typeof intelligence === 'object' ? (intelligence as Record<string, unknown>).metricCapabilities : null;
  const configuration = intelligence && typeof intelligence === 'object' ? (intelligence as Record<string, unknown>).metricConfiguration : null;
  const sources = arrayFrom(capabilities);
  const definitions = arrayFrom(configuration);
  async function run(key: string, action: () => Promise<unknown>) { setBusy(key); setError(null); try { await action(); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(null); } }
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    {error ? <Text style={{ color: '#9b2c2c' }}>{error}</Text> : null}
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}><Text style={{ color: '#c8ead7', fontSize: 12, fontWeight: '800' }}>CONFIGURABLE MEASUREMENT</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Fleet controller metrics</Text><Text style={{ color: '#dce9e2' }}>Definitions reference existing source-of-truth datasets; they do not create a second measurement engine.</Text></View>
    <View style={{ flexDirection: 'row', gap: 10 }}><Metric label="Available sources" value={sources.length} /><Metric label="Configured metrics" value={definitions.length} /></View>
    <View style={{ gap: 9 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Quick definitions</Text>
      <Action label="Add driver safety target" busy={busy === 'safety'} onPress={() => run('safety', () => createFleetMetricDefinition(businessId, { metricKey: `driver_safety_${Date.now()}`, featureCode: 'fleet.metric.driver_safety', name: 'Driver safety target', description: 'Controller-defined target using the canonical driver scorecard safety score.', unit: 'score', sourceDataset: 'fleet_driver_scorecards', sourceMetric: 'safety_score', aggregation: 'avg', direction: 'higher_is_better', scoringMethod: 'linear', goal: 90, threshold: 75, maxScore: 100, period: 'daily' }))} />
      <Action label="Add restroom coverage target" busy={busy === 'coverage'} onPress={() => run('coverage', () => createFleetMetricDefinition(businessId, { metricKey: `restroom_coverage_${Date.now()}`, featureCode: 'fleet.metric.restroom_coverage', name: 'Restroom coverage target', description: 'Controller-defined target using the canonical Fleet restroom coverage score.', unit: 'score', sourceDataset: 'fleet_metric_snapshots', sourceMetric: 'restroom_coverage_score', aggregation: 'avg', direction: 'higher_is_better', scoringMethod: 'linear', goal: 90, threshold: 70, maxScore: 100, period: 'daily' }))} />
    </View>
    <View style={{ gap: 9 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>Configured definitions</Text>{definitions.length === 0 ? <Text style={{ color: '#66766e' }}>No controller-authored definitions returned yet.</Text> : definitions.map((definition: any, index) => { const id = String(definition.id ?? definition.metric_definition_id ?? ''); const active = definition.active !== false; return <View key={id || index} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 6 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{String(definition.name ?? definition.metric_key ?? 'Fleet metric')}</Text><Text style={{ color: '#66766e' }}>{String(definition.source_dataset ?? '')} · {String(definition.source_metric ?? '')}</Text>{id ? <Action label={active ? 'Disable' : 'Enable'} busy={busy === id} onPress={() => run(id, () => updateFleetMetricDefinition(id, { active: !active }))} /> : null}</View>; })}</View>
    <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 9 }}><Text style={{ fontSize: 17, fontWeight: '800' }}>Capability catalog</Text><Text style={{ color:'#66766e', lineHeight:19 }}>These are the canonical measurement sources Fleet can use for controller-defined targets.</Text><StructuredData value={sources.length ? sources : capabilities} empty="No Fleet metric capabilities returned." /></View>
  </ScrollView>;
}
function Metric({ label, value }: { label: string; value: number }) { return <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14 }}><Text style={{ color: '#66766e', fontSize: 12, fontWeight: '700' }}>{label}</Text><Text style={{ fontSize: 24, fontWeight: '800' }}>{value}</Text></View>; }
function Action({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) { return <Pressable disabled={busy} onPress={onPress} style={{ alignSelf: 'flex-start', backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, opacity: busy ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '800' }}>{busy ? 'Working…' : label}</Text></Pressable>; }
