import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { createDriver, createRoute, createVehicle, updateDispatchPolicy, updateExceptionPolicy } from '@/services/fleet';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetOperationsScreen() {
  const { workspace, dashboard, dispatch, refreshing, refresh } = useFleetWorkspace();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!workspace) return <View style={{ padding: 20 }}><Text>Fleet workspace required.</Text></View>;
  const businessId = workspace.business_id;
  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key); setError(null);
    try { await action(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  }
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    {error ? <Text style={{ color: '#9b2c2c' }}>{error}</Text> : null}
    <View style={{ backgroundColor: '#173f2d', padding: 18, borderRadius: 20, gap: 7 }}><Text style={{ color: '#c8ead7', fontSize: 12, fontWeight: '800' }}>AUTHORITATIVE OPERATIONS</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Fleet state is server-authoritative</Text><Text style={{ color: '#dce9e2' }}>Mutations use the canonical Fleet RPCs and refresh authoritative reads after completion.</Text></View>
    <Section title="Provisioning">
      <Action label="Create vehicle" busy={busy === 'vehicle'} onPress={() => run('vehicle', () => createVehicle(businessId, { name: 'New Fleet vehicle', status: 'active' }))} />
      <Action label="Create driver" busy={busy === 'driver'} onPress={() => run('driver', () => createDriver(businessId, { name: 'New Fleet driver', status: 'active' }))} />
      <Action label="Create route" busy={busy === 'route'} onPress={() => run('route', () => createRoute(businessId, { name: 'New Fleet route', status: 'planned' }))} />
    </Section>
    <Section title="Controller policies">
      <Action label="Apply baseline dispatch policy" busy={busy === 'dispatch-policy'} onPress={() => run('dispatch-policy', () => updateDispatchPolicy(businessId, { occupancyEnabled: true, occupancyFreshMinutes: 15, highUtilizationPct: 80, queueThreshold: 4, highUtilizationWeight: 25, queueWeight: 25 }))} />
      <Action label="Apply baseline exception policy" busy={busy === 'exception-policy'} onPress={() => run('exception-policy', () => updateExceptionPolicy(businessId, { lateStopMinutes: 15, dwellOverrunMinutes: 20, geofenceDwellMinutes: 30, notifyWarning: true, notifyCritical: true }))} />
    </Section>
    <Data title="Fleet dashboard" value={dashboard} />
    <Data title="Current dispatch" value={dispatch} />
  </ScrollView>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={{ gap: 9 }}><Text style={{ fontSize: 20, fontWeight: '800' }}>{title}</Text>{children}</View>; }
function Action({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) { return <Pressable onPress={onPress} disabled={busy} style={{ alignSelf: 'flex-start', backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, opacity: busy ? 0.55 : 1 }}><Text style={{ color: 'white', fontWeight: '800' }}>{busy ? 'Working…' : label}</Text></Pressable>; }
function Data({ title, value }: { title: string; value: unknown }) { return <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 5 }}><Text style={{ fontSize: 17, fontWeight: '800' }}>{title}</Text><Text selectable style={{ color: '#5f6f66' }}>{JSON.stringify(value ?? {}, null, 2)}</Text></View>; }
