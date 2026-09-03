import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetIntelligenceScreen() {
  const { intelligence, refreshing, refresh } = useFleetWorkspace();
  const source = (intelligence ?? {}) as Record<string, unknown>;
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}><Text style={{ color: '#c8ead7', fontWeight: '800', fontSize: 12 }}>FLEET INTELLIGENCE CONVERGENCE</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Exceptions, prevention, remediation and configurable metrics</Text><Text style={{ color: '#dce9e2' }}>These are canonical server projections shared with Business and Enterprise—not UI-derived Fleet metrics.</Text></View>
    <Section title="Operational exceptions" value={source.operations} />
    <Section title="Preventive schedule & signoff" value={source.prevention} />
    <Section title="Remediation risk" value={source.remediationRisk} />
    <Section title="Prevention portfolio" value={source.preventionPortfolio} />
    <Section title="Prevention effectiveness" value={source.preventionEffectiveness} />
    <Section title="Metric capabilities" value={source.metricCapabilities} />
    <Section title="Metric configuration" value={source.metricConfiguration} />
    <Section title="Metric values" value={source.metricValues} />
  </ScrollView>;
}
function Section({ title, value }: { title: string; value: unknown }) { return <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 5 }}><Text style={{ fontSize: 17, fontWeight: '800' }}>{title}</Text><Text selectable style={{ color: '#5f6f66', lineHeight: 19 }}>{JSON.stringify(value ?? {}, null, 2)}</Text></View>; }
