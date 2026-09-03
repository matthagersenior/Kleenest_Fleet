import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getSupabaseClient } from '@/lib/supabase';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetSignIn() {
  const router = useRouter();
  const { refresh } = useFleetWorkspace();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signIn() {
    setBusy(true); setError(null);
    try {
      const client = getSupabaseClient();
      const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      try { await refresh(); } catch (cause) { await client.auth.signOut({ scope: 'local' }); throw cause; }
      router.replace('/');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  return <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}><View style={{ gap: 14 }}><Text style={{ fontSize: 28, fontWeight: '800' }}>Sign in to Kleenest Fleet</Text><Text style={{ color: '#607067', lineHeight: 21 }}>Your account must own or belong to a Fleet-enabled Business workspace. Access is verified by the server after authentication.</Text>{error ? <Text style={{ color: '#9b2c2c' }}>{error}</Text> : null}<TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" style={input}/><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" style={input}/><Pressable disabled={busy||!email.trim()||!password} onPress={signIn} style={{ backgroundColor:'#173f2d',padding:14,borderRadius:14,opacity:(busy||!email.trim()||!password)?0.5:1 }}><Text style={{color:'white',fontWeight:'800',textAlign:'center'}}>{busy?'Verifying access…':'Sign in'}</Text></Pressable></View></ScrollView>;
}
const input={borderWidth:1,borderColor:'#ccd9d1',borderRadius:14,paddingHorizontal:14,paddingVertical:13,backgroundColor:'white'} as const;
