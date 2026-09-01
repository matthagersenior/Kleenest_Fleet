import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { grantFleetPremiumByEmail, listFleetPremiumMembers, revokeFleetPremiumMember, type FleetPremiumMember } from '@/services/fleet';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetPremiumScreen() {
  const { workspace, refreshing: workspaceRefreshing, refresh: refreshWorkspace } = useFleetWorkspace();
  const [members, setMembers] = useState<FleetPremiumMember[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspace) return;
    setMembers(await listFleetPremiumMembers(workspace.business_id));
  }, [workspace]);

  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [load]);

  async function reload() {
    setRefreshing(true); setError(null);
    try { await Promise.all([load(), refreshWorkspace()]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setRefreshing(false); }
  }

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key); setError(null);
    try { await action(); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  }

  if (!workspace) return <View style={{ padding: 20 }}><Text>Fleet workspace required.</Text></View>;
  const businessId = workspace.business_id;
  const active = members.filter(member => member.status === 'active');

  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing || workspaceRefreshing} onRefresh={reload} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    {error ? <Text style={{ color: '#9b2c2c' }}>{error}</Text> : null}
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}>
      <Text style={{ color: '#c8ead7', fontSize: 12, fontWeight: '800' }}>FLEET PREMIUM DISTRIBUTION</Text>
      <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Provision Kleenest Premium through Fleet</Text>
      <Text style={{ color: '#dce9e2', lineHeight: 20 }}>Fleet grants are scoped to this organization and do not overwrite a recipient's personal, Family or Stripe entitlement.</Text>
    </View>

    <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 10 }}>
      <Text style={{ fontSize: 17, fontWeight: '800' }}>Add existing Kleenest account</Text>
      <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="member@example.com" style={{ borderWidth: 1, borderColor: '#d8e1dc', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 }} />
      <Pressable disabled={!email.trim() || busy === 'grant'} onPress={() => run('grant', async () => { await grantFleetPremiumByEmail(businessId, email); setEmail(''); })} style={{ alignSelf: 'flex-start', backgroundColor: '#173f2d', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, opacity: !email.trim() || busy === 'grant' ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '800' }}>{busy === 'grant' ? 'Granting…' : 'Grant Fleet Premium'}</Text></Pressable>
      <Text style={{ color: '#66766e', lineHeight: 19 }}>The recipient must already have a Kleenest account. Fleet Premium becomes available through the shared Consumer/Premium entitlement check.</Text>
    </View>

    <View style={{ flexDirection: 'row', gap: 10 }}><Metric label="Active recipients" value={active.length} /><Metric label="Total grant history" value={members.length} /></View>

    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>Recipients</Text>
      {members.length === 0 ? <Text style={{ color: '#66766e' }}>No Fleet Premium recipients yet.</Text> : members.map(member => {
        const name = member.display_name || member.username || member.user_id;
        return <View key={member.id} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 7 }}>
          <Text style={{ fontSize: 16, fontWeight: '800' }}>{name}</Text>
          <Text style={{ color: '#66766e' }}>{member.status === 'active' ? 'Premium active through Fleet' : 'Fleet grant revoked'}</Text>
          {member.status === 'active' ? <Pressable disabled={busy === member.user_id} onPress={() => run(member.user_id, () => revokeFleetPremiumMember(businessId, member.user_id))} style={{ alignSelf: 'flex-start', backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, opacity: busy === member.user_id ? 0.5 : 1 }}><Text style={{ color: '#244d39', fontWeight: '800' }}>{busy === member.user_id ? 'Revoking…' : 'Revoke Fleet grant'}</Text></Pressable> : null}
        </View>;
      })}
    </View>
  </ScrollView>;
}

function Metric({ label, value }: { label: string; value: number }) { return <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14 }}><Text style={{ color: '#66766e', fontSize: 12, fontWeight: '700' }}>{label}</Text><Text style={{ fontSize: 24, fontWeight: '800' }}>{value}</Text></View>; }
