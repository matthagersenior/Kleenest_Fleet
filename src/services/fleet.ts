import { getSupabaseClient } from '@/lib/supabase';

const client = () => getSupabaseClient();

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data == null) throw new Error('Fleet service returned no data.');
  return data;
}

export async function getFleetAccess(businessId: string) {
  const { data, error } = await client().rpc('has_fleet_access', { p_business_id: businessId });
  return unwrap(Boolean(data), error);
}

export async function getFleetProductAccess(businessId: string) {
  const [{ data: access, error: accessError }, { data: service, error: serviceError }] = await Promise.all([
    client().rpc('get_business_product_access', { p_business_id: businessId }),
    client().rpc('get_business_service_entitlement', { p_business_id: businessId }),
  ]);
  if (accessError) throw new Error(accessError.message);
  if (serviceError) throw new Error(serviceError.message);
  return {
    productAccess: Array.isArray(access) ? access[0] ?? null : access,
    serviceEntitlement: service ?? null,
  };
}

export async function getFleetDashboard(businessId: string) {
  const { data, error } = await client().rpc('fleet_dashboard_summary_v2', { p_business_id: businessId });
  return unwrap(data as Record<string, unknown> | null, error);
}

export async function getCurrentDispatch(businessId: string) {
  const { data, error } = await client().rpc('fleet_current_user_dispatch', { p_business_id: businessId });
  return unwrap(data as Record<string, unknown> | null, error);
}

export async function getFleetIntelligence(businessId: string) {
  const [ops, prevention, risk, effectiveness, metrics, config, values] = await Promise.all([
    client().rpc('fleet_operations_exception_intelligence', { p_business_id: businessId, p_window_hours: 24 }),
    client().rpc('fleet_restroom_preventive_schedule', { p_business_id: businessId, p_days: 90 }),
    client().rpc('fleet_restroom_remediation_risk', { p_business_id: businessId, p_days: 90 }),
    client().rpc('fleet_restroom_prevention_effectiveness', { p_business_id: businessId, p_days: 90 }),
    client().rpc('get_fleet_metric_capabilities', { p_business_id: businessId }),
    client().rpc('get_fleet_metric_configuration', { p_business_id: businessId }),
    client().rpc('get_fleet_metric_values', { p_business_id: businessId, p_as_of: new Date().toISOString().slice(0, 10) }),
  ]);
  for (const result of [ops, prevention, risk, effectiveness, metrics, config, values]) if (result.error) throw new Error(result.error.message);
  return { operations: ops.data, prevention: prevention.data, remediationRisk: risk.data, preventionEffectiveness: effectiveness.data, metricCapabilities: metrics.data, metricConfiguration: config.data, metricValues: values.data };
}

export async function createVehicle(businessId: string, input: Record<string, unknown>) {
  const { data, error } = await client().rpc('fleet_create_vehicle', {
    p_business_id: businessId,
    p_name: input.name ?? 'Fleet vehicle',
    p_unit_code: input.unit_code ?? null,
    p_vehicle_type: input.vehicle_type ?? null,
    p_status: input.status ?? 'active',
    p_driver_name: input.driver_name ?? null,
    p_current_lat: input.current_lat ?? null,
    p_current_lng: input.current_lng ?? null,
    p_odometer_miles: input.odometer_miles ?? null,
    p_metadata: input.metadata ?? {},
  });
  return unwrap(data, error);
}

export async function createDriver(businessId: string, input: Record<string, unknown>) {
  const { data, error } = await client().rpc('fleet_create_driver', {
    p_business_id: businessId,
    p_name: input.name ?? 'Fleet driver',
    p_email: input.email ?? null,
    p_phone: input.phone ?? null,
    p_status: input.status ?? 'active',
    p_vehicle_id: input.vehicle_id ?? null,
    p_metadata: input.metadata ?? {},
  });
  return unwrap(data, error);
}

export async function createRoute(businessId: string, input: Record<string, unknown>) {
  const { data, error } = await client().rpc('fleet_create_route', {
    p_business_id: businessId,
    p_name: input.name ?? 'Fleet route',
    p_status: input.status ?? 'planned',
    p_vehicle_id: input.vehicle_id ?? null,
    p_driver_id: input.driver_id ?? null,
    p_scheduled_for: input.scheduled_for ?? null,
    p_distance_miles: input.distance_miles ?? null,
    p_estimated_minutes: input.estimated_minutes ?? null,
    p_stops_count: input.stops_count ?? 0,
    p_metadata: input.metadata ?? {},
  });
  return unwrap(data, error);
}

export async function setRouteStops(businessId: string, routeId: string, stops: unknown[]) {
  const { data, error } = await client().rpc('fleet_set_route_stops', { p_business_id: businessId, p_route_id: routeId, p_stops: stops });
  return unwrap(data ?? [], error);
}

export async function dispatchRoute(businessId: string, routeId: string) {
  const { data, error } = await client().rpc('fleet_dispatch_route', { p_business_id: businessId, p_route_id: routeId });
  return unwrap(data, error);
}

export async function recordRouteStopTiming(businessId: string, routeId: string, routeStopId: string, eventType: string, occurredAt = new Date().toISOString()) {
  const { data, error } = await client().rpc('fleet_record_route_stop_timing', { p_business_id: businessId, p_route_id: routeId, p_route_stop_id: routeStopId, p_event_type: eventType, p_occurred_at: occurredAt });
  return unwrap(data, error);
}

export async function replayRouteStopTiming(packId: string, businessId: string, routeId: string, routeStopId: string, eventType: string, occurredAt: string, clientEventId: string) {
  const { data, error } = await client().rpc('fleet_replay_route_stop_timing', { p_pack_id: packId, p_business_id: businessId, p_route_id: routeId, p_route_stop_id: routeStopId, p_event_type: eventType, p_occurred_at: occurredAt, p_client_event_id: clientEventId });
  return unwrap(data as Record<string, unknown> | null, error);
}

export async function getRouteExceptionDetail(businessId: string, routeId: string) {
  const { data, error } = await client().rpc('fleet_route_exception_drilldown', { p_business_id: businessId, p_route_id: routeId });
  return unwrap(data as Record<string, unknown> | null, error);
}

export async function listFleetAlerts(businessId: string, status: string | null = null, limit = 100) {
  const { data, error } = await client().rpc('fleet_exception_alerts', { p_business_id: businessId, p_status: status, p_limit: limit });
  return unwrap(data ?? [], error);
}

export async function updateDispatchPolicy(businessId: string, policy: { occupancyEnabled: boolean; occupancyFreshMinutes: number; highUtilizationPct: number; queueThreshold: number; highUtilizationWeight: number; queueWeight: number }) {
  const { data, error } = await client().rpc('fleet_update_dispatch_signal_policy', {
    p_business_id: businessId,
    p_occupancy_enabled: policy.occupancyEnabled,
    p_occupancy_fresh_minutes: policy.occupancyFreshMinutes,
    p_high_utilization_pct: policy.highUtilizationPct,
    p_queue_threshold: policy.queueThreshold,
    p_high_utilization_weight: policy.highUtilizationWeight,
    p_queue_weight: policy.queueWeight,
  });
  return unwrap(data as Record<string, unknown> | null, error);
}

export async function updateExceptionPolicy(businessId: string, policy: { lateStopMinutes: number; dwellOverrunMinutes: number; geofenceDwellMinutes: number; notifyWarning: boolean; notifyCritical: boolean }) {
  const { data, error } = await client().rpc('fleet_update_exception_policy', {
    p_business_id: businessId,
    p_late_stop_minutes: policy.lateStopMinutes,
    p_dwell_overrun_minutes: policy.dwellOverrunMinutes,
    p_geofence_dwell_minutes: policy.geofenceDwellMinutes,
    p_notify_warning: policy.notifyWarning,
    p_notify_critical: policy.notifyCritical,
  });
  return unwrap(data as Record<string, unknown> | null, error);
}
