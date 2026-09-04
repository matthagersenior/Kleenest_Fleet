import { useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Pressable,RefreshControl,ScrollView,Text,TextInput,View } from 'react-native';
import { StructuredData } from '@/components/StructuredData';
import { listFleetInventory } from '@/services/fleet';
import { assignDriverUser,deleteDriver,deleteMaintenance,deleteRoute,deleteVehicle,getFleetParityBundle,getRoutePerformance,recordOperationalEvent,setRouteStatus,updateDriver,updateMaintenance,updateRoute,updateVehicle,type FleetParityBundle } from '@/services/parity';
import { useFleetWorkspace } from '@/state/FleetWorkspace';

type Row=Record<string,unknown>;
type Inventory=Awaited<ReturnType<typeof listFleetInventory>>;
const nameOf=(r:Row,f:string)=>String(r.name??r.unit_code??r.maintenance_type??f);

export default function FleetCapabilities(){
 const{workspace}=useFleetWorkspace();
 const[bundle,setBundle]=useState<FleetParityBundle|null>(null),[inventory,setInventory]=useState<Inventory|null>(null),[routePerf,setRoutePerf]=useState<Record<string,unknown>>({}),[driverUsers,setDriverUsers]=useState<Record<string,string>>({});
 const[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{if(!workspace)throw new Error('Fleet workspace required.');const[b,i]=await Promise.all([getFleetParityBundle(workspace.business_id),listFleetInventory(workspace.business_id)]);setBundle(b);setInventory(i);},[workspace]);
 useEffect(()=>{load().catch(c=>setError(c instanceof Error?c.message:String(c))).finally(()=>setLoading(false));},[load]);
 async function refresh(){setRefreshing(true);setError(null);try{await load();}catch(c){setError(c instanceof Error?c.message:String(c));}finally{setRefreshing(false)}}
 async function run(key:string,fn:()=>Promise<unknown>){setBusy(key);setError(null);try{await fn();await refresh();}catch(c){setError(c instanceof Error?c.message:String(c));}finally{setBusy(null)}}
 if(loading)return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large"/></View>;
 if(!workspace)return <View style={{padding:24}}><Text>Fleet workspace required.</Text></View>;
 const id=workspace.business_id;
 return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}/>} contentContainerStyle={{padding:16,gap:16,paddingBottom:64}}>
  {error?<View style={warn}><Text selectable style={{color:'#922'}}>{error}</Text></View>:null}
  <View style={hero}><Text style={eyebrow}>SUPABASE → FLEET PARITY</Text><Text style={heroTitle}>Fleet authority control plane</Text><Text style={heroText}>Asset CRUD, assignment authority, policies, monitoring, scorecards, progression, route performance, operational events and network rankings are wired directly to canonical Fleet RPCs.</Text></View>
  {bundle?.errors.length?<View style={warn}><Text style={{fontWeight:'900'}}>Partial capability errors</Text>{bundle.errors.map(e=><Text key={e} selectable style={{color:'#7d4f12'}}>• {e}</Text>)}</View>:null}
  <Section title="Access & policy authority"><StructuredData value={{access:bundle?.access,policies:bundle?.policies}}/></Section>
  <Section title="Assignment intelligence"><StructuredData value={bundle?.assignment}/></Section>
  <Section title="Operational intelligence"><StructuredData value={bundle?.performance}/></Section>
  <Section title="Monitoring & progression"><StructuredData value={{monitoring:bundle?.monitoring,progression:bundle?.progression}}/></Section>
  <Section title="Leaderboards & metric fabric"><StructuredData value={{leaderboards:bundle?.leaderboards,metrics:bundle?.metrics}}/></Section>

  <Section title="Vehicle authority">
   {(inventory?.vehicles??[]).map((v:Row)=><View key={String(v.id)} style={card}><Text style={heading}>{nameOf(v,'Vehicle')}</Text><Text style={muted}>{String(v.status??'unknown')} · {String(v.vehicle_type??'vehicle')}</Text><View style={row}><Action label="Persist current fields" onPress={()=>run(`vehicle:update:${v.id}`,()=>updateVehicle(id,v))}/><Action secondary label="Delete vehicle" onPress={()=>run(`vehicle:delete:${v.id}`,()=>deleteVehicle(id,String(v.id)))}/></View></View>)}
  </Section>

  <Section title="Driver authority">
   {(inventory?.drivers??[]).map((d:Row)=><View key={String(d.id)} style={card}><Text style={heading}>{nameOf(d,'Driver')}</Text><Text style={muted}>{String(d.status??'unknown')} · {String(d.email??'no email')}</Text><TextInput autoCapitalize="none" value={driverUsers[String(d.id)]??''} onChangeText={value=>setDriverUsers(current=>({...current,[String(d.id)]:value}))} placeholder="Kleenest user UUID to link" style={input}/><View style={row}><Action label="Persist current fields" onPress={()=>run(`driver:update:${d.id}`,()=>updateDriver(id,d))}/><Action disabled={!driverUsers[String(d.id)]?.trim()} label="Assign user" onPress={()=>run(`driver:user:${d.id}`,()=>assignDriverUser(id,String(d.id),driverUsers[String(d.id)].trim()))}/><Action secondary label="Delete driver" onPress={()=>run(`driver:delete:${d.id}`,()=>deleteDriver(id,String(d.id)))}/></View></View>)}
  </Section>

  <Section title="Route authority">
   {(inventory?.routes??[]).map((r:Row)=><View key={String(r.id)} style={card}><Text style={heading}>{nameOf(r,'Route')}</Text><Text style={muted}>{String(r.status??'planned')} · {String(r.stops_count??0)} stops</Text><View style={row}><Action label="Persist current fields" onPress={()=>run(`route:update:${r.id}`,()=>updateRoute(id,r))}/><Action label="Set planned" onPress={()=>run(`route:planned:${r.id}`,()=>setRouteStatus(id,String(r.id),'planned'))}/><Action label="Complete" onPress={()=>run(`route:complete:${r.id}`,()=>setRouteStatus(id,String(r.id),'completed'))}/><Action secondary label="Delete route" onPress={()=>run(`route:delete:${r.id}`,()=>deleteRoute(id,String(r.id)))}/><Action secondary label="Load performance" onPress={async()=>{try{const value=await getRoutePerformance(id,String(r.id));setRoutePerf(current=>({...current,[String(r.id)]:value}));}catch(c){setError(c instanceof Error?c.message:String(c));}}}/></View>{routePerf[String(r.id)]?<StructuredData value={routePerf[String(r.id)]}/>:null}</View>)}
  </Section>

  <Section title="Maintenance authority">
   {(inventory?.maintenance??[]).map((m:Row)=><View key={String(m.id)} style={card}><Text style={heading}>{nameOf(m,'Maintenance')}</Text><Text style={muted}>{String(m.status??'scheduled')} · {String(m.vendor??'no vendor')}</Text><View style={row}><Action label="Persist current fields" onPress={()=>run(`maintenance:update:${m.id}`,()=>updateMaintenance(id,m))}/><Action secondary label="Delete maintenance" onPress={()=>run(`maintenance:delete:${m.id}`,()=>deleteMaintenance(id,String(m.id)))}/></View></View>)}
  </Section>

  <Section title="Operational event bridge"><Text style={muted}>Writes a canonical Fleet operational fact that can converge into intelligence, notifications and exception processing.</Text><Action label={busy==='event:test'?'Recording…':'Record control-plane health event'} onPress={()=>run('event:test',()=>recordOperationalEvent(id,'control_plane_health_check',{source:'kleenest_fleet_app',at:new Date().toISOString()}))}/></Section>
 </ScrollView>;
}

function Section({title,children}:{title:string;children:React.ReactNode}){return <View style={{gap:9}}><Text style={{fontSize:21,fontWeight:'900'}}>{title}</Text><View style={card}>{children}</View></View>}
function Action({label,onPress,disabled,secondary}:{label:string;onPress:()=>void|Promise<void>;disabled?:boolean;secondary?:boolean}){return <Pressable disabled={disabled} onPress={onPress} style={{alignSelf:'flex-start',borderRadius:999,paddingHorizontal:12,paddingVertical:8,backgroundColor:secondary?'#edf3ef':'#173f2d',opacity:disabled?.5:1}}><Text style={{fontWeight:'900',color:secondary?'#244d39':'white'}}>{label}</Text></Pressable>}
const hero={backgroundColor:'#132b21' as const,borderRadius:20,padding:18,gap:7},eyebrow={color:'#bde4cf',fontWeight:'900' as const,letterSpacing:1},heroTitle={color:'white',fontSize:25,fontWeight:'900' as const},heroText={color:'#dce8e1',lineHeight:20 as const},card={backgroundColor:'white' as const,borderRadius:16,padding:14,gap:9},warn={backgroundColor:'#fff6df' as const,borderRadius:16,padding:13,gap:5},heading={fontSize:16,fontWeight:'900' as const},muted={color:'#66766e',lineHeight:19 as const},row={flexDirection:'row' as const,flexWrap:'wrap' as const,gap:8},input={borderWidth:1,borderColor:'#dce4df',borderRadius:12,padding:10};
