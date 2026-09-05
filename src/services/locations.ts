import { getSupabaseClient } from '@/lib/supabase';

export type FleetRouteLocation = {
  location_id: string;
  place_id?: string | null;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  distance_meters: number | null;
  business_id?: string | null;
  business_name?: string | null;
  business_logo_url?: string | null;
  place_type?: string | null;
  accessible?: boolean | null;
  changing_table?: boolean | null;
  smart_bathroom?: boolean | null;
  rating?: number | null;
  review_count?: number | null;
  bathroom_verification_status?: string | null;
  [key: string]: unknown;
};

const client = () => getSupabaseClient();

let routeLocationRequestGeneration = 0;
let latestRouteLocationRequest: Promise<FleetRouteLocation[]> | null = null;

function normalizeRouteLocations(data: unknown): FleetRouteLocation[] {
  return (Array.isArray(data) ? data : [])
    .map((row: any) => ({ ...row, location_id: String(row.location_id ?? row.place_id ?? '') }))
    .filter((row: FleetRouteLocation) => Boolean(row.location_id) && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)));
}

export async function listFleetRouteLocations(input: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  search?: string;
  limit?: number;
}): Promise<FleetRouteLocation[]> {
  const generation = ++routeLocationRequestGeneration;
  const request = (async () => {
    const { data, error } = await client().rpc('map_network_nearby_v2', {
      p_lat: input.latitude,
      p_lng: input.longitude,
      p_radius_m: input.radiusMeters ?? 30000,
      p_limit: input.limit ?? 150,
      p_category: 'all',
      p_search: input.search?.trim() || null,
      p_amenity_names: [],
    });
    if (error) throw new Error(error.message);
    return normalizeRouteLocations(data);
  })();

  latestRouteLocationRequest = request;
  const rows = await request;
  if (generation === routeLocationRequestGeneration) return rows;

  // First-open location hydration can intentionally replace the national fallback
  // with a GPS-scoped request. If an older RPC resolves after the newer one began,
  // return the newest request's rows to every caller so stale pins cannot overwrite
  // the current map. If the newest request fails, keep the valid older rows as a
  // graceful fallback instead of blanking the map.
  const newest = latestRouteLocationRequest;
  if (newest && newest !== request) return newest.catch(() => rows);
  return rows;
}

export function routeLocationId(item: Pick<FleetRouteLocation, 'location_id' | 'place_id'>) {
  return String(item.location_id || item.place_id || '');
}
