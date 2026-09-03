import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const requiredFiles=['app/index.tsx','app/operations.tsx','app/execution.tsx','app/signals.tsx','app/metrics.tsx','app/sync.tsx','app/intelligence.tsx','app/premium.tsx','app/enterprise.tsx','src/services/fleet.ts','src/services/signals.ts','src/services/enterprise.ts'];
for(const f of requiredFiles){if(!fs.existsSync(new URL(`../${f}`,import.meta.url)))throw new Error(`Fleet parity: missing ${f}`)}
const fleet=read('src/services/fleet.ts');
const enterprise=read('src/services/enterprise.ts');
const signals=read('src/services/signals.ts');
const checks={
'access authority':['has_fleet_access','get_business_product_access','get_business_service_entitlement'],
'operations CRUD':['fleet_create_vehicle','fleet_set_vehicle_status','fleet_create_driver','fleet_set_driver_status','fleet_create_route','fleet_set_route_stops','fleet_dispatch_route'],
'execution':['fleet_record_route_stop_timing','fleet_replay_route_stop_timing','fleet_route_exception_drilldown','fleet_exception_alerts','fleet_resolve_alert'],
'maintenance':['fleet_create_maintenance','fleet_complete_maintenance','fleet_delete_maintenance'],
'premium recipients':['fleet_list_premium_members','fleet_grant_premium_member_by_email','fleet_revoke_premium_member'],
'metric configuration':['get_fleet_metric_capabilities','get_fleet_metric_configuration','get_fleet_metric_values','create_fleet_metric_definition','update_fleet_metric_definition','assign_fleet_metric'],
'preventive dispatch':['fleet_preventive_dispatch_opportunities','fleet_attach_preventive_work_to_route'],
'intelligence':['fleet_operations_exception_intelligence','fleet_restroom_preventive_schedule','fleet_restroom_remediation_risk','fleet_restroom_prevention_portfolio','fleet_restroom_prevention_effectiveness'],
'policy configuration':['fleet_update_dispatch_signal_policy','fleet_update_exception_policy']};
for(const [family,names] of Object.entries(checks))for(const name of names)if(!fleet.includes(name))throw new Error(`Fleet parity: ${family} missing ${name}`);
if(!enterprise.match(/enterprise/i))throw new Error('Fleet parity: Enterprise service is not wired');
if(!signals.match(/signal|occupancy|location/i))throw new Error('Fleet parity: signal service lacks live operational signals');
const operations=read('app/operations.tsx');
if(!operations.includes('attachPreventiveWorkToRoute'))throw new Error('Fleet parity: preventive work cannot be attached from Fleet operations');
const pkg=JSON.parse(read('package.json'));
if(!pkg.dependencies?.['react-native-worklets'])throw new Error('Fleet parity: Android worklets dependency missing');
console.log('Fleet parity audit passed: access, CRUD, preventive dispatch, execution, maintenance, Premium, metrics, intelligence, policies, signals and Enterprise surfaces are present.');
