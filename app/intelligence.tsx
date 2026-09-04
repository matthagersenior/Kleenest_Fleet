import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { StructuredData } from '@/components/StructuredData';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetIntelligenceScreen() {
  const { intelligence, refreshing, refresh } = useFleetWorkspace();
  const source = (intelligence ?? {}) as Record<string, unknown>;
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}><Text style={{ color: '#c8ead7', fontWeight: '800', fontSize: 12 }}>FLEET INTELLIGENCE CONVERGENCE</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Exceptions, prevention, scorecards, monitoring and rankings</Text><Text style={{ color: '#dce9e2' }}>Canonical Supabase projections now expose the wider Fleet capability set instead of stopping at basic route metrics.</Text></View>
    <Section title="Operational signals" value={source.operationalSignals} />
    <Section title="Operational exceptions" value={source.operations} />
    <Section title="Exception trends" value={source.exceptionTrends} />
    <Section title="Asset exception scorecards" value={source.assetScorecards} />
    <Section title="Monitored locations" value={source.monitoredLocations} />
    <Section title="Service opportunities" value={source.serviceOpportunities} />
    <Section title="Preventive schedule & signoff" value={source.prevention} />
    <Section title="Remediation risk" value={source.remediationRisk} />
    <Section title="Prevention portfolio" value={source.preventionPortfolio} />
    <Section title="Prevention effectiveness" value={source.preventionEffectiveness} />
    <Section title="Fleet leaderboard" value={source.leaderboard} />
    <Section title="Network leaderboard" value={source.networkLeaderboard} />
    <Section title="Metric capabilities" value={source.metricCapabilities} />
    <Section title="Metric configuration" value={source.metricConfiguration} />
    <Section title="Metric values" value={source.metricValues} />
  </ScrollView>;
}
function Section({ title, value }: { title: string; value: unknown }) { return <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 7 }}><Text style={{ fontSize: 17, fontWeight: '800' }}>{title}</Text><StructuredData value={value ?? {}} /></View>; }
