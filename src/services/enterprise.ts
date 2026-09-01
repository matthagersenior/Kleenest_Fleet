import { getSupabaseClient } from '@/lib/supabase';

function client(){return getSupabaseClient();}
function unwrap<T>(data:T|null,error:{message:string}|null):T{if(error)throw new Error(error.message);if(data==null)throw new Error('Enterprise service returned no data.');return data;}

export async function getEnterpriseControlPlaneSnapshot(businessId:string,windowDays=30){const {data,error}=await client().rpc('enterprise_control_plane_snapshot',{p_business_id:businessId,p_window_days:windowDays});return unwrap(data as Record<string,unknown>|null,error);}
export async function listOwnedEnterpriseNetworks(businessId:string){const {data,error}=await client().rpc('enterprise_list_owned_networks',{p_business_id:businessId});return unwrap((data??[]) as Array<Record<string,unknown>>,error);}
export async function listEnterpriseNetworkMembers(networkId:string){const {data,error}=await client().rpc('enterprise_list_network_members',{p_network_id:networkId});return unwrap((data??[]) as Array<Record<string,unknown>>,error);}
export async function listEnterpriseNetworkCampaigns(networkId:string){const {data,error}=await client().rpc('enterprise_list_network_campaigns',{p_network_id:networkId});return unwrap((data??[]) as Array<Record<string,unknown>>,error);}
