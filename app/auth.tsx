import * as Linking from 'expo-linking';
import { useEffect,useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getSupabaseClient } from '@/lib/supabase';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

const googleRedirect=Linking.createURL('/auth',{scheme:'kleenest-fleet'});

export default function FleetSignIn() {
  const router = useRouter();
  const { refresh } = useFleetWorkspace();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function finishGoogle(url:string|null){if(!url)return false;const parsed=Linking.parse(url);const code=typeof parsed.queryParams?.code==='string'?parsed.queryParams.code:'';if(!code)return false;setBusy(true);setError(null);const client=getSupabaseClient();try{const {error:exchangeError}=await client.auth.exchangeCodeForSession(code);if(exchangeError)throw exchangeError;try{await refresh();}catch(cause){await client.auth.signOut({scope:'local'});throw cause;}router.replace('/');return true;}catch(cause){setError(cause instanceof Error?cause.message:String(cause));return false;}finally{setBusy(false);}}
  useEffect(()=>{void Linking.getInitialURL().then(finishGoogle);const sub=Linking.addEventListener('url',event=>{void finishGoogle(event.url)});return()=>sub.remove();},[]);
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
  async function google(){if(busy)return;setBusy(true);setError(null);try{const {data,error:authError}=await getSupabaseClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:googleRedirect,skipBrowserRedirect:true}});if(authError)throw authError;if(!data.url)throw new Error('Google sign-in did not return an authorization URL.');await Linking.openURL(data.url);}catch(cause){setError(cause instanceof Error?cause.message:String(cause));}finally{setBusy(false);}}
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}><View style={{ gap: 14 }}>
    <Text style={{ color:'#557066', fontWeight:'900', letterSpacing:1 }}>FLEET CONTROL CENTER</Text>
    <Text style={{ fontSize: 28, fontWeight: '800' }}>Sign in to Kleenest Fleet</Text>
    <Text style={{ color: '#607067', lineHeight: 21 }}>Your account must own or belong to a Fleet-enabled Business workspace. Access is verified by the server after authentication.</Text>
    {error ? <Text style={{ color: '#9b2c2c' }}>{error}</Text> : null}
    <Pressable disabled={busy} onPress={google} style={{backgroundColor:'white',borderWidth:1,borderColor:'#ccd9d1',padding:14,borderRadius:14}}><Text style={{fontWeight:'900',textAlign:'center',color:'#173f2d'}}>Continue with Google</Text></Pressable>
    <View style={{gap:6}}><Text style={{fontWeight:'800',color:'#365245'}}>Fleet email</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" placeholder="Email" style={input}/></View>
    <View style={{gap:6}}><Text style={{fontWeight:'800',color:'#365245'}}>Fleet password</Text><View style={{position:'relative'}}><TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" placeholder="Password" style={[input,{paddingRight:76}]}/><Pressable accessibilityRole="button" accessibilityLabel={showPassword?'Hide fleet password':'Show fleet password'} onPress={()=>setShowPassword(v=>!v)} style={{position:'absolute',right:8,top:7,bottom:7,justifyContent:'center',paddingHorizontal:10,borderRadius:10,backgroundColor:'#edf3ef'}}><Text style={{fontWeight:'900',color:'#244d39'}}>{showPassword?'Hide':'Show'}</Text></Pressable></View></View>
    <Pressable disabled={busy||!email.trim()||!password} onPress={signIn} style={{ backgroundColor:'#173f2d',padding:14,borderRadius:14,opacity:(busy||!email.trim()||!password)?0.5:1 }}><Text style={{color:'white',fontWeight:'800',textAlign:'center'}}>{busy?'Verifying fleet access…':'Sign in to Fleet'}</Text></Pressable>
  </View></ScrollView>;
}
const input={borderWidth:1,borderColor:'#ccd9d1',borderRadius:14,paddingHorizontal:14,paddingVertical:13,backgroundColor:'white'} as const;
