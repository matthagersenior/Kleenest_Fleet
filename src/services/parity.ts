import { getSupabaseClient } from '@/lib/supabase';

const client=()=>getSupabaseClient();
async function rpc(name:string,args:Record<string,unknown>={}){const{data,error}=await client().rpc(name,args);if(error)throw new Error(`${name}: ${error.message}`);return data;}

export type FleetParityBundle={
 access:unknown; policies:Record<string,unknown>; assignment:Record<string,unknown>; performance:Record<string,unknown>;
 progression:unknown; monitoring:unknown; leaderboards:Record<string,unknown>; metrics:Record<string,unknown>; errors:string[];
};

export async function getFleetParityBundle(businessId:string):Promise<FleetParityBundle>{
 const calls:[string,Promise<unknown>][]=[
  ['access',rpc('fleet_observe_access',{p_business_id:businessId})],
  ['dispatchPolicy',rpc('fleet_dispatch_signal_policy',{p_business_id:businessId})],
  ['exceptionPolicy',rpc('fleet_exception_policy',{p_business_id:businessId})],
  ['driverCandidates',rpc('fleet_driver_assignment_candidates',{p_business_id:businessId})],
  ['assetScorecards',rpc('fleet_asset_exception_scorecards',{p_business_id:businessId,p_window_days:30})],
  ['exceptionTrends',rpc('fleet_exception_trends',{p_business_id:businessId,p_window_days:30})],
  ['signals',rpc('fleet_operational_signal_summary',{p_business_id:businessId,p_window_hours:24})],
  ['serviceOpportunities',rpc('fleet_service_opportunities_for_business',{p_business_id:businessId})],
  ['progression',rpc('fleet_progression_snapshot',{p_business_id:businessId})],
  ['monitoring',rpc('fleet_list_monitored_locations',{p_business_id:businessId})],
  ['fleetLeaderboard',rpc('get_fleet_leaderboard',{p_business_id:businessId,p_metric:'score',p_target_type:'driver',p_limit:25})],
  ['networkLeaderboard',rpc('get_fleet_network_leaderboard',{p_metric:'score',p_limit:25})],
  ['metricCapabilities',rpc('get_fleet_metric_capabilities',{p_business_id:businessId})],
  ['metricConfiguration',rpc('get_fleet_metric_configuration',{p_business_id:businessId})],
  ['metricValues',rpc('get_fleet_metric_values',{p_business_id:businessId,p_as_of:new Date().toISOString().slice(0,10)})],
 ];
 const settled=await Promise.allSettled(calls.map(([,p])=>p));const values:Record<string,unknown>={},errors:string[]=[];
 settled.forEach((r,i)=>{const k=calls[i][0];if(r.status==='fulfilled')values[k]=r.value;else errors.push(`${k}: ${r.reason instanceof Error?r.reason.message:String(r.reason)}`)});
 return{access:values.access,policies:{dispatch:values.dispatchPolicy,exceptions:values.exceptionPolicy},assignment:{driverCandidates:values.driverCandidates},performance:{assetScorecards:values.assetScorecards,exceptionTrends:values.exceptionTrends,signals:values.signals,serviceOpportunities:values.serviceOpportunities},progression:values.progression,monitoring:values.monitoring,leaderboards:{fleet:values.fleetLeaderboard,network:values.networkLeaderboard},metrics:{capabilities:values.metricCapabilities,configuration:values.metricConfiguration,values:values.metricValues},errors};
}

export async function updateVehicle(businessId:string,vehicle:Record<string,unknown>){return rpc('fleet_update_vehicle',{p_business_id:businessId,p_vehicle_id:String(vehicle.id),p_name:vehicle.name??'Fleet vehicle',p_unit_code:vehicle.unit_code??null,p_vehicle_type:vehicle.vehicle_type??null,p_status:vehicle.status??'active',p_driver_name:vehicle.driver_name??null,p_current_lat:vehicle.current_lat??null,p_current_lng:vehicle.current_lng??null,p_odometer_miles:vehicle.odometer_miles??null,p_metadata:vehicle.metadata??{}});}
export async function deleteVehicle(businessId:string,vehicleId:string){return rpc('fleet_delete_vehicle',{p_business_id:businessId,p_vehicle_id:vehicleId});}
export async function updateDriver(businessId:string,driver:Record<string,unknown>){return rpc('fleet_update_driver',{p_business_id:businessId,p_driver_id:String(driver.id),p_name:driver.name??'Fleet driver',p_email:driver.email??null,p_phone:driver.phone??null,p_status:driver.status??'active',p_vehicle_id:driver.vehicle_id??null,p_metadata:driver.metadata??{}});}
export async function deleteDriver(businessId:string,driverId:string){return rpc('fleet_delete_driver',{p_business_id:businessId,p_driver_id:driverId});}
export async function assignDriverUser(businessId:string,driverId:string,userId:string){return rpc('fleet_assign_driver_user',{p_business_id:businessId,p_driver_id:driverId,p_user_id:userId});}
export async function updateRoute(businessId:string,route:Record<string,unknown>){return rpc('fleet_update_route',{p_business_id:businessId,p_route_id:String(route.id),p_name:route.name??'Fleet route',p_status:route.status??'planned',p_vehicle_id:route.vehicle_id??null,p_driver_id:route.driver_id??null,p_scheduled_for:route.scheduled_for??null,p_distance_miles:route.distance_miles??null,p_estimated_minutes:route.estimated_minutes??null,p_stops_count:route.stops_count??0,p_metadata:route.metadata??{}});}
export async function deleteRoute(businessId:string,routeId:string){return rpc('fleet_delete_route',{p_business_id:businessId,p_route_id:routeId});}
export async function setRouteStatus(businessId:string,routeId:string,status:string){return rpc('fleet_set_route_status',{p_business_id:businessId,p_route_id:routeId,p_status:status});}
export async function getRoutePerformance(businessId:string,routeId:string){return rpc('fleet_route_performance',{p_business_id:businessId,p_route_id:routeId});}
export async function updateMaintenance(businessId:string,row:Record<string,unknown>){return rpc('fleet_update_maintenance',{p_business_id:businessId,p_maintenance_id:String(row.id),p_vehicle_id:row.vehicle_id??null,p_maintenance_type:row.maintenance_type??'inspection',p_status:row.status??'scheduled',p_scheduled_at:row.scheduled_at??null,p_completed_at:row.completed_at??null,p_odometer_miles:row.odometer_miles??null,p_cost:row.cost??null,p_vendor:row.vendor??null,p_notes:row.notes??null,p_metadata:row.metadata??{}});}
export async function deleteMaintenance(businessId:string,maintenanceId:string){return rpc('fleet_delete_maintenance',{p_business_id:businessId,p_maintenance_id:maintenanceId});}
export async function recordOperationalEvent(businessId:string,eventType:string,payload:Record<string,unknown>={}){return rpc('record_fleet_operational_event',{p_business_id:businessId,p_event_type:eventType,p_payload:payload});}
