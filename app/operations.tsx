import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { completeMaintenance, createDriver, createRoute, createVehicle, listFleetInventory, resolveFleetAlert, setDriverStatus, setVehicleStatus, updateDispatchPolicy, updateExceptionPolicy } from '@/services/fleet';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

type Inventory = Awaited<ReturnType<typeof listFleetInventory>>;

export default function FleetOperationsScreen() {
  const { workspace, dashboard, dispatch, refreshing: workspaceRefreshing, refresh: refreshWorkspace } = useFleetWorkspace();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (workspace) setInventory(await listFleetInventory(workspace.business_id)); }, [workspace]);
  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [load]);
  if (!workspace) return <View style={{ padding: 20 }}><Text>Fleet workspace required.</Text></View>;
  const businessId = workspace.business_id;
  async function reload() { setRefreshing(true); setError(null); try { await Promise.all([load(), refreshWorkspace()]); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setRefreshing(false); } }
  async function run(key: string, action: () => Promise<unknown>) { setBusy(key); setError(null); try { await action(); await reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(null); } }
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing || workspaceRefreshing} onRefresh={reload} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    {error ? <Text style={{ color: '#9b2c2c' }}>{error}</Text> : null}
    <View style={{ backgroundColor: '#173f2d', padding: 18, borderRadius: 20, gap: 7 }}><Text style={{ color: '#c8ead7', fontSize: 12, fontWeight: '800' }}>AUTHORITATIVE OPERATIONS</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Fleet state is server-authoritative</Text><Text style={{ color: '#dce9e2' }}>RLS protects inventory reads; canonical RPCs own status, maintenance, alert and policy mutations.</Text></View>
    <Section title="Provisioning">
      <Action label="Create vehicle" busy={busy === 'vehicle'} onPress={() => run('vehicle', () => createVehicle(businessId, { name: 'New Fleet vehicle', status: 'active' }))} />
      <Action label="Create driver" busy={busy === 'driver'} onPress={() => run('driver', () => createDriver(businessId, { name: 'New Fleet driver', status: 'active' }))} />
      <Action label="Create route" busy={busy === 'route'} onPress={() => run('route', () => createRoute(businessId, { name: 'New Fleet route', status: 'planned' }))} />
    </Section>
    <Section title="Vehicles">
      {(inventory?.vehicles ?? []).map((row: any) => <Record key={String(row.id)} title={String(row.name ?? row.unit_code ?? 'Vehicle')} detail={String(row.status ?? 'unknown')} actionLabel={row.status === 'active' ? 'Set maintenance' : 'Set active'} busy={busy === `vehicle:${row.id}`} onAction={() => run(`vehicle:${row.id}`, () => setVehicleStatus(businessId, String(row.id), row.status === 'active' ? 'maintenance' : 'active'))} />)}
    </Section>
    <Section title="Drivers">
      {(inventory?.drivers ?? []).map((row: any) => <Record key={String(row.id)} title={String(row.name ?? 'Driver')} detail={String(row.status ?? 'unknown')} actionLabel={row.status === 'active' ? 'Set inactive' : 'Set active'} busy={busy === `driver:${row.id}`} onAction={() => run(`driver:${row.id}`, () => setDriverStatus(businessId, String(row.id), row.status === 'active' ? 'inactive' : 'active'))} />)}
    </Section>
    <Section title="Maintenance">
      {(inventory?.maintenance ?? []).map((row: any) => <Record key={String(row.id)} title={String(row.maintenance_type ?? row.title ?? 'Maintenance')} detail={String(row.status ?? row.due_at ?? 'scheduled')} actionLabel="Complete" busy={busy === `maintenance:${row.id}`} disabled={row.status === 'completed'} onAction={() => run(`maintenance:${row.id}`, () => completeMaintenance(businessId, String(row.id)))} />)}
    </Section>
    <Section title="Alerts">
      {(inventory?.alerts ?? []).map((row: any) => <Record key={String(row.id)} title={String(row.title ?? row.alert_type ?? 'Fleet alert')} detail={String(row.status ?? row.severity ?? 'open')} actionLabel="Resolve" busy={busy === `alert:${row.id}`} disabled={row.status === 'resolved'} onAction={() => run(`alert:${row.id}`, () => resolveFleetAlert(businessId, String(row.id), 'Resolved in Kleenest Fleet'))} />)}
    </Section>
    <Section title="Routes">
      {(inventory?.routes ?? []).map((row: any) => <View key={String(row.id)} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 4 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{String(row.name ?? 'Route')}</Text><Text style={{ color: '#66766e' }}>{String(row.status ?? 'planned')} · {Number(row.stops_count ?? 0)} stops</Text></View>)}
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
function Action({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) { return <Pressable onPress={onPress} disabled={busy || disabled} style={{ alignSelf: 'flex-start', backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, opacity: busy || disabled ? 0.55 : 1 }}><Text style={{ color: 'white', fontWeight: '800' }}>{busy ? 'Working…' : label}</Text></Pressable>; }
function Record({ title, detail, actionLabel, onAction, busy, disabled }: { title: string; detail: string; actionLabel: string; onAction: () => void; busy?: boolean; disabled?: boolean }) { return <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 7 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{title}</Text><Text style={{ color: '#66766e' }}>{detail}</Text><Action label={actionLabel} onPress={onAction} busy={busy} disabled={disabled} /></View>; }
function Data({ title, value }: { title: string; value: unknown }) { return <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 5 }}><Text style={{ fontSize: 17, fontWeight: '800' }}>{title}</Text><Text selectable style={{ color: '#5f6f66' }}>{JSON.stringify(value ?? {}, null, 2)}</Text></View>; }
