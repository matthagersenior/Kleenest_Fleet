import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { listFleetInventory } from '@/services/fleet';
import { disableFleetLiveNetwork,enableFleetLiveNetwork,getFleetLiveNetworkStatus,registerFleetPush } from '@/services/geofence';
import { configureGeofence, getOccupancySummary, listBusinessGeofences, listBusinessLocations, listMonitoredLocations, removeMonitoredLocation, setMonitoredLocation } from '@/services/signals';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

export default function FleetSignalsScreen() {
  const { workspace, entitlement, refreshing: workspaceRefreshing, refresh: refreshWorkspace } = useFleetWorkspace();
  const [locations, setLocations] = useState<any[]>([]);
  const [monitored, setMonitored] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [routes,setRoutes]=useState<any[]>([]);
  const [selectedRouteId,setSelectedRouteId]=useState<string|null>(null);
  const [liveStatus,setLiveStatus]=useState<Awaited<ReturnType<typeof getFleetLiveNetworkStatus>>|null>(null);
  const [occupancy, setOccupancy] = useState<Record<string, unknown>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice,setNotice]=useState<string|null>(null);

  const load = useCallback(async () => {
    if (!workspace) return;
    const businessId = workspace.business_id;
    const [nextLocations, nextMonitored, nextGeofences,inventory,status] = await Promise.all([listBusinessLocations(businessId), listMonitoredLocations(businessId), listBusinessGeofences(businessId),listFleetInventory(businessId),getFleetLiveNetworkStatus()]);
    setLocations(nextLocations as any[]); setMonitored(nextMonitored); setGeofences(nextGeofences as any[]);setRoutes(inventory.routes as any[]);setLiveStatus(status);
    setSelectedRouteId(current=>(inventory.routes as any[]).some((r:any)=>String(r.id)===current)?current:String((inventory.routes as any[])[0]?.id??'')||null);
    const summaries = await Promise.all(nextMonitored.map(async row => [String(row.location_id), await getOccupancySummary(String(row.location_id))] as const));
    setOccupancy(Object.fromEntries(summaries));
  }, [workspace]);
  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [load]);
  if (!workspace) return <View style={{ padding: 20 }}><Text>Fleet workspace required.</Text></View>;
  const businessId = workspace.business_id;
  const product = entitlement?.productAccess as Record<string, unknown> | undefined;
  const enterprise = Boolean(product?.enterprise_enabled);
  const monitoredIds = new Set(monitored.map(row => String(row.location_id)));

  async function reload() { setRefreshing(true); setError(null); try { await Promise.all([load(), refreshWorkspace()]); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setRefreshing(false); } }
  async function run(key: string, action: () => Promise<unknown>,message?:string) { setBusy(key); setError(null);setNotice(null); try { await action();if(message)setNotice(message); await reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(null); } }

  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing || workspaceRefreshing} onRefresh={reload} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
    {error ? <Text style={{ color: '#9b2c2c',fontWeight:'800' }}>{error}</Text> : null}{notice?<Text style={{color:'#1d6b43',fontWeight:'800'}}>{notice}</Text>:null}
    <View style={{ backgroundColor: '#173f2d', borderRadius: 20, padding: 18, gap: 7 }}><Text style={{ color: '#c8ead7', fontSize: 12, fontWeight: '800' }}>FLEET LIVE NETWORK</Text><Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>Monitored locations, occupancy and route geofences</Text><Text style={{ color: '#dce9e2' }}>{enterprise ? 'Enterprise monitoring is enabled for multiple locations.' : 'Fleet monitoring uses the selected workspace and canonical route stops.'}</Text></View>
    <View style={card}><Text style={heading}>Live Network route execution</Text><Text style={muted}>Enable background route geofences to record enter/exit events and deliver Fleet notifications while the app is not open. Location and notification permissions are requested only when you enable this feature.</Text><View style={row}><Pill label={liveStatus?.registered?'RUNNING':'OFF'}/><Pill label={`Foreground ${liveStatus?.foreground??'unknown'}`}/><Pill label={`Background ${liveStatus?.background??'unknown'}`}/></View>{routes.length?<><Text style={{fontWeight:'800'}}>Route</Text><View style={row}>{routes.map((route:any)=>{const selected=String(route.id)===selectedRouteId;return <Pressable key={String(route.id)} onPress={()=>setSelectedRouteId(String(route.id))} style={{borderRadius:999,paddingHorizontal:11,paddingVertical:8,backgroundColor:selected?'#173f2d':'#edf3ef'}}><Text style={{fontWeight:'800',color:selected?'white':'#244d39'}}>{String(route.name??'Route')}</Text></Pressable>})}</View><View style={row}><Button disabled={!selectedRouteId||Boolean(busy)} label={busy==='live:on'?'Enabling…':'Enable Live Network'} onPress={()=>selectedRouteId?run('live:on',()=>enableFleetLiveNetwork(businessId,selectedRouteId),'Fleet Live Network enabled for the selected route.'):undefined}/><Button disabled={Boolean(busy)||!liveStatus?.registered} label="Disable Live Network" onPress={()=>run('live:off',disableFleetLiveNetwork,'Fleet Live Network disabled on this device.')}/><Button disabled={Boolean(busy)} label="Register push" onPress={()=>run('live:push',registerFleetPush,'Fleet push delivery registered.')}/></View></>:<Text style={muted}>Create a Fleet route with canonical stops before enabling route geofences.</Text>}</View>
    <View style={{ gap: 9 }}><Text style={heading}>Business locations</Text>{locations.map((location: any) => { const id = String(location.id); const active = monitoredIds.has(id); return <View key={id} style={card}><Text style={{ fontSize: 16, fontWeight: '800' }}>{String(location.name ?? 'Location')}</Text><Text style={muted}>{[location.address,location.city,location.state].filter(Boolean).join(', ')}</Text><Button disabled={busy === id} label={active ? 'Stop monitoring' : 'Monitor location'} onPress={() => run(id, () => active ? removeMonitoredLocation(businessId,id) : setMonitoredLocation(businessId,id,true))}/></View>; })}</View>
    <View style={{ gap: 9 }}><Text style={heading}>Live occupancy signals</Text>{monitored.length?monitored.map((row: any) => {const value=occupancy[String(row.location_id)] as Record<string,unknown>|undefined;return <View key={String(row.location_id)} style={card}><Text style={{ fontSize: 16, fontWeight: '800' }}>{String(row.location_name ?? 'Monitored location')}</Text><Text style={muted}>{value?Object.entries(value).slice(0,6).map(([k,v])=>`${k.replaceAll('_',' ')}: ${String(v)}`).join(' · '):'No current occupancy signal'}</Text></View>}):<Text style={muted}>No monitored locations yet.</Text>}</View>
    <View style={{ gap: 9 }}><Text style={heading}>Business geofences</Text>{geofences.length === 0 ? <Text style={muted}>No Business geofences currently exist for this Fleet workspace. Route geofences are generated from canonical route stops.</Text> : geofences.map((geofence: any) => <View key={String(geofence.id)} style={card}><Text style={{ fontWeight: '800' }}>{Number(geofence.radius_meters ?? 150)}m geofence</Text><Text style={muted}>{geofence.active === false ? 'Inactive' : 'Active'} · notifications {geofence.notification_enabled ? 'on' : 'off'}</Text><Button disabled={busy === `geo:${geofence.id}`} label="Toggle notifications" onPress={() => run(`geo:${geofence.id}`, () => configureGeofence(String(geofence.id), { notificationEnabled: !geofence.notification_enabled, active: true, title: 'Fleet location signal', body: 'A Kleenest Fleet geofence signal was recorded.' }))}/></View>)}</View>
    <View style={card}><Text style={heading}>Permission safety</Text><Text style={muted}>Fleet Live Network uses location and notifications. Microphone and draw-over-other-apps permissions are explicitly blocked because they are unrelated to routing or geofencing.</Text></View>
  </ScrollView>;
}
function Button({label,onPress,disabled}:{label:string;onPress?:()=>void|Promise<void>;disabled?:boolean}){return <Pressable disabled={disabled} onPress={onPress} style={{alignSelf:'flex-start',backgroundColor:'#edf3ef',borderRadius:999,paddingHorizontal:12,paddingVertical:8,opacity:disabled?.5:1}}><Text style={{color:'#244d39',fontWeight:'800'}}>{label}</Text></Pressable>}
function Pill({label}:{label:string}){return <View style={{backgroundColor:'#edf3ef',borderRadius:999,paddingHorizontal:9,paddingVertical:5}}><Text style={{fontSize:11,fontWeight:'800',color:'#244d39'}}>{label}</Text></View>}
const card={backgroundColor:'white' as const,borderRadius:16,padding:14,gap:8};const heading={fontSize:20,fontWeight:'800' as const};const muted={color:'#66766e' as const,lineHeight:19};const row={flexDirection:'row' as const,flexWrap:'wrap' as const,gap:8};