import { getSupabaseClient } from '@/lib/supabase';

export type FleetProgressionSnapshot={business_id:string;routes_total:number;routes_completed:number;stops_completed:number;fleet_xp:number;recent_fleet_awards:Array<{user_id:string;location_id:string|null;xp:number;created_at:string}>};
export async function getFleetProgressionSnapshot(businessId:string):Promise<FleetProgressionSnapshot>{const{data,error}=await getSupabaseClient().rpc('fleet_progression_snapshot',{p_business_id:businessId});if(error)throw new Error(error.message);return(data||{business_id:businessId,routes_total:0,routes_completed:0,stops_completed:0,fleet_xp:0,recent_fleet_awards:[]}) as FleetProgressionSnapshot;}
