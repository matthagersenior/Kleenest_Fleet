import { useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,RefreshControl,ScrollView,Text,View } from 'react-native';
import { useFleetWorkspace } from '@/state/FleetWorkspace';
import { getEnterpriseControlPlaneSnapshot,listOwnedEnterpriseNetworks,listEnterpriseNetworkCampaigns,listEnterpriseNetworkMembers } from '@/services/enterprise';

function enterpriseEnabled(entitlement:Record<string,unknown>|null){const access=entitlement?.productAccess;if(access&&typeof access==='object'&&Boolean((access as Record<string,unknown>).enterprise_enabled))return true;const service=entitlement?.serviceEntitlement;return Boolean(service&&typeof service==='object'&&((service as Record<string,unknown>).enterprise_enabled??(service as Record<string,unknown>).enterprise_fleet_enabled));}

export default function FleetEnterpriseWorkspace(){
 const {workspace,entitlement}=useFleetWorkspace();const [snapshot,setSnapshot]=useState<Record<string,unknown>|null>(null);const [networks,setNetworks]=useState<Array<Record<string,unknown>>>([]);const [members,setMembers]=useState<Array<Record<string,unknown>>>([]);const [campaigns,setCampaigns]=useState<Array<Record<string,unknown>>>([]);const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false);const [error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{if(!workspace)throw new Error('No Fleet workspace resolved.');if(!enterpriseEnabled(entitlement))throw new Error('Enterprise entitlement is required for cross-location Fleet control.');const [nextSnapshot,nextNetworks]=await Promise.all([getEnterpriseControlPlaneSnapshot(workspace.business_id,30),listOwnedEnterpriseNetworks(workspace.business_id)]);const firstNetworkId=String(nextNetworks[0]?.id??'');const [nextMembers,nextCampaigns]=firstNetworkId?await Promise.all([listEnterpriseNetworkMembers(firstNetworkId),listEnterpriseNetworkCampaigns(firstNetworkId)]):[[],[]];setSnapshot(nextSnapshot);setNetworks(nextNetworks);setMembers(nextMembers);setCampaigns(nextCampaigns);},[workspace,entitlement]);
 useEffect(()=>{load().catch(c=>setError(c instanceof Error?c.message:String(c))).finally(()=>setLoading(false));},[load]);
 async function refresh(){setRefreshing(true);setError(null);try{await load();}catch(c){setError(c instanceof Error?c.message:String(c));}finally{setRefreshing(false);}}
 if(loading)return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large"/></View>;
 if(error)return <View style={{flex:1,padding:24,justifyContent:'center',gap:12}}><Text style={{fontSize:24,fontWeight:'800'}}>Enterprise access boundary</Text><Text style={{color:'#607168',lineHeight:21}}>{error}</Text></View>;
 return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}/>} contentContainerStyle={{padding:16,gap:14,paddingBottom:48}}>
  <View style={{backgroundColor:'#132b21',borderRadius:20,padding:18,gap:6}}><Text style={{color:'#bde4cf',fontWeight:'800',fontSize:12}}>ENTERPRISE FLEET LAYER</Text><Text style={{color:'white',fontSize:24,fontWeight:'800'}}>Multi-location & partner control</Text><Text style={{color:'#dce8e1',lineHeight:20}}>This extends Fleet; it does not create a separate Enterprise application or duplicate Fleet operations.</Text></View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}><Metric label="Networks" value={networks.length}/><Metric label="Members" value={members.length}/><Metric label="Campaigns" value={campaigns.length}/></View>
  <Section title="Enterprise snapshot" value={snapshot}/><Section title="Owned networks" value={networks}/><Section title="Primary network members" value={members}/><Section title="Primary network campaigns" value={campaigns}/>
 </ScrollView>;
}
function Metric({label,value}:{label:string;value:number}){return <View style={{backgroundColor:'white',borderRadius:16,padding:14,minWidth:120,flexGrow:1}}><Text style={{fontSize:12,color:'#68776f',fontWeight:'700'}}>{label}</Text><Text style={{fontSize:25,fontWeight:'800'}}>{value}</Text></View>}
function Section({title,value}:{title:string;value:unknown}){return <View style={{backgroundColor:'white',borderRadius:16,padding:14,gap:6}}><Text style={{fontSize:17,fontWeight:'800'}}>{title}</Text><Text selectable style={{color:'#607168',lineHeight:19}}>{JSON.stringify(value??{},null,2)}</Text></View>}
