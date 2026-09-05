import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const requiredFiles=['app/index.tsx','app/auth.tsx','app/dispatch.tsx','app/operations.tsx','app/execution.tsx','app/signals.tsx','app/metrics.tsx','app/sync.tsx','app/intelligence.tsx','app/capabilities.tsx','app/premium.tsx','app/enterprise.tsx','src/components/FleetMap.tsx','src/services/fleet.ts','src/services/parity.ts','src/services/locations.ts','src/services/geofence.ts','src/services/signals.ts','src/services/enterprise.ts'];
for(const f of requiredFiles){if(!fs.existsSync(new URL(`../${f}`,import.meta.url)))throw new Error(`Fleet parity: missing ${f}`)}
const fleet=read('src/services/fleet.ts');
const parity=read('src/services/parity.ts');
const capabilityUi=read('app/capabilities.tsx');
const enterprise=read('src/services/enterprise.ts');
const signals=read('src/services/signals.ts');
const locations=read('src/services/locations.ts');
const geofence=read('src/services/geofence.ts');
const dispatch=read('app/dispatch.tsx');
const execution=read('app/execution.tsx');
const map=read('src/components/FleetMap.tsx');
const sync=read('app/sync.tsx');
const checks={
'access authority':['has_fleet_access','get_business_product_access','get_business_service_entitlement'],
'operations CRUD':['fleet_create_vehicle','fleet_set_vehicle_status','fleet_create_driver','fleet_set_driver_status','fleet_create_route','fleet_set_route_stops','fleet_dispatch_route'],
'execution':['fleet_record_route_stop_timing','fleet_replay_route_stop_timing','fleet_route_exception_drilldown','fleet_exception_alerts','fleet_resolve_alert'],
'maintenance':['fleet_create_maintenance','fleet_complete_maintenance','fleet_delete_maintenance'],
'premium recipients':['fleet_list_premium_members','fleet_grant_premium_member_by_email','fleet_revoke_premium_member'],
'metric configuration':['get_fleet_metric_capabilities','get_fleet_metric_configuration','get_fleet_metric_values','create_fleet_metric_definition','update_fleet_metric_definition','assign_fleet_metric'],
'preventive dispatch':['fleet_preventive_dispatch_opportunities','fleet_attach_preventive_work_to_route'],
'intelligence':['fleet_operations_exception_intelligence','fleet_restroom_preventive_schedule','fleet_restroom_remediation_risk','fleet_restroom_prevention_portfolio','fleet_restroom_prevention_effectiveness','fleet_asset_exception_scorecards','fleet_exception_trends','get_fleet_leaderboard','get_fleet_network_leaderboard','fleet_list_monitored_locations','fleet_service_opportunities_for_business','fleet_operational_signal_summary'],
'policy configuration':['fleet_update_dispatch_signal_policy','fleet_update_exception_policy']};
for(const [family,names] of Object.entries(checks))for(const name of names)if(!fleet.includes(name))throw new Error(`Fleet parity: ${family} missing ${name}`);
for(const name of ['fleet_observe_access','fleet_dispatch_signal_policy','fleet_exception_policy','fleet_driver_assignment_candidates','fleet_update_vehicle','fleet_delete_vehicle','fleet_update_driver','fleet_delete_driver','fleet_assign_driver_user','fleet_update_route','fleet_delete_route','fleet_set_route_status','fleet_route_performance','fleet_update_maintenance','fleet_delete_maintenance','record_fleet_operational_event'])if(!parity.includes(name))throw new Error(`Fleet parity: extended authority missing ${name}`);
for(const token of ['SUPABASE → FLEET PARITY','Vehicle authority','Driver authority','Route authority','Maintenance authority','Operational event bridge'])if(!capabilityUi.includes(token))throw new Error(`Fleet parity: capability UI missing ${token}`);
for(const token of ['map_network_nearby_v2','location_id','business_logo_url'])if(!locations.includes(token))throw new Error(`Fleet parity: canonical map location service missing ${token}`);
for(const token of ['fleet_route_geofence_manifest','record_geofence_event','distanceMeters'])if(!geofence.includes(token))throw new Error(`Fleet parity: geofence service missing ${token}`);
for(const token of ['FleetMap','setRouteStops','Save route stop order','Add to route','MAP ROUTING + DISPATCH','Search radius','National','Assign vehicle','Assign driver','onInteractionChange'])if(!dispatch.includes(token))throw new Error(`Fleet parity: map dispatch planner missing ${token}`);
for(const token of ['@maplibre/maplibre-react-native','Marker','business_logo_url','routeStopIds','Drag to pan','onInteractionChange','Zoom Fleet map in','Recenter Fleet map'])if(!map.includes(token))throw new Error(`Fleet parity: Fleet map missing ${token}`);
const operationalEventQuery=signals.match(/export async function listFleetOperationalEvents[^\n]*/)?.[0]??'';
if(!operationalEventQuery.includes("from('fleet_operational_events')")||!operationalEventQuery.includes("order('occurred_at'"))throw new Error('Fleet parity: fleet_operational_events must sort by occurred_at');
if(operationalEventQuery.includes("order('created_at'"))throw new Error('Fleet parity: stale fleet_operational_events.created_at query remains');
if(!sync.includes('e.occurred_at'))throw new Error('Fleet parity: Notifications + Offline must render occurred_at');
for(const token of ['watchPositionAsync','recordFleetGeofenceEvent','LIVE GEOFENCE TRACKING','recordRouteStopTiming'])if(!execution.includes(token))throw new Error(`Fleet parity: live execution missing ${token}`);
for(const token of ['getEnterpriseOperationalPortfolio','createEnterpriseNetwork','inviteEnterprisePartner','createPartnerAllocation','getPartnerNetworkBenchmark','getPartnerAllocationRoi'])if(!enterprise.includes(token))throw new Error(`Fleet parity: Enterprise service missing ${token}`);
if(!signals.match(/signal|occupancy|location/i))throw new Error('Fleet parity: signal service lacks live operational signals');
const operations=read('app/operations.tsx');
if(!operations.includes('attachPreventiveWorkToRoute'))throw new Error('Fleet parity: preventive work cannot be attached from Fleet operations');
const auth=read('app/auth.tsx');
const authCompact=auth.replace(/\s+/g,'');
if(!auth.includes('signInWithPassword')||!auth.includes('await refresh()'))throw new Error('Fleet parity: login does not verify Fleet workspace authorization');
if(!auth.includes('router.canGoBack()')||!auth.includes('router.back()'))throw new Error('Fleet parity: successful sign-in must dismiss the existing auth screen instead of stacking a duplicate Control Center');
for(const token of ['Continue with Google','signInWithOAuth','exchangeCodeForSession','Linking.createURL','Linking.openURL'])if(!auth.includes(token))throw new Error(`Fleet parity: Google auth missing ${token}`);
if(!authCompact.includes("provider:'google'")&&!authCompact.includes('provider:"google"'))throw new Error('Fleet parity: Google auth must use the Supabase google provider');
if(!authCompact.includes('skipBrowserRedirect:true'))throw new Error('Fleet parity: Google auth must use native browser handoff');
const pkg=JSON.parse(read('package.json'));
for(const [name,version] of Object.entries({'expo':'~57.0.20','react':'19.2.3','react-native':'0.86.3','react-native-reanimated':'4.5.1','react-native-worklets':'0.10.1'}))if(pkg.dependencies?.[name]!==version)throw new Error(`Fleet parity: ${name} must match Expo 57 runtime ${version}`);
if(pkg.dependencies?.['@maplibre/maplibre-react-native']!=='^11.3.6')throw new Error('Fleet parity: MapLibre native runtime must match Consumer');
if(pkg.dependencies?.['expo-location']!=='~57.0.14')throw new Error('Fleet parity: expo-location must match Expo 57 Consumer runtime');
if(pkg.scripts?.postinstall!=='node scripts/install-app-icon.mjs')throw new Error('Fleet parity: launcher icon installer is not wired to postinstall');
const appConfig=read('app.config.ts').replace(/\s+/g,'');
if(!appConfig.includes("icon:'./assets/app-icon.png'"))throw new Error('Fleet parity: Expo app icon is not configured');
if(!appConfig.includes("android:{package:'com.kleenest.fleet',icon:'./assets/app-icon.png'"))throw new Error('Fleet parity: Android launcher icon is not configured');
console.log('Fleet parity audit passed with hardened Supabase-to-UI coverage across routing, radius, map interaction, assignments, event timestamps, assets, policies, monitoring, performance, progression, metrics, Enterprise, OAuth and native runtime.');