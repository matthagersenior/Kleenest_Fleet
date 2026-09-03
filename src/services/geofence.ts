import { getSupabaseClient } from '@/lib/supabase';

export type FleetRouteGeofence = {
  route_stop_id: string;
  location_id: string;
  geofence_id: string;
  stop_order: number;
  latitude: number;
  longitude: number;
  radius_meters: number;
  location_name: string | null;
};

export async function getFleetRouteGeofenceManifest(businessId: string, routeId: string): Promise<FleetRouteGeofence[]> {
  const { data, error } = await getSupabaseClient().rpc('fleet_route_geofence_manifest', {
    p_business_id: businessId,
    p_route_id: routeId,
  });
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []) as FleetRouteGeofence[];
}

export async function recordFleetGeofenceEvent(
  businessId: string,
  geofence: FleetRouteGeofence,
  eventType: 'enter' | 'exit',
  distanceMeters: number,
) {
  const supabase = getSupabaseClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!auth.user) throw new Error('Fleet geofence event requires an authenticated user.');
  const { data, error } = await supabase.rpc('record_geofence_event', {
    p_geofence_id: geofence.geofence_id,
    p_user_id: auth.user.id,
    p_location_id: geofence.location_id,
    p_business_id: businessId,
    p_event_type: eventType,
    p_dwell_seconds: null,
    p_metadata: {
      source: 'fleet_foreground_geofence',
      route_stop_id: geofence.route_stop_id,
      stop_order: geofence.stop_order,
      distance_meters: Math.round(distanceMeters),
    },
    p_notification_id: null,
    p_qr_code_id: null,
    p_check_in_id: null,
  });
  if (error) throw new Error(error.message);
  return String(data ?? '');
}

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radius = 6371000;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
