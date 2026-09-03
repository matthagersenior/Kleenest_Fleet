import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { Image, Pressable, Text, View } from 'react-native';
import { routeLocationId, type FleetRouteLocation } from '@/services/locations';

const OSM_STYLE: any = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export function FleetMap({
  center,
  locations,
  selectedId,
  routeStopIds,
  onSelect,
}: {
  center: [number, number];
  locations: FleetRouteLocation[];
  selectedId: string;
  routeStopIds: string[];
  onSelect: (location: FleetRouteLocation) => void;
}) {
  return <View style={{ height: 330, borderRadius: 18, overflow: 'hidden', backgroundColor: '#dfe8e2' }}>
    <Map androidView="texture" style={{ flex: 1 }} mapStyle={OSM_STYLE}>
      <Camera key={`${center[0]}-${center[1]}`} initialViewState={{ center, zoom: 11.5 }} />
      {locations.map(item => {
        const id = routeLocationId(item);
        const selected = id === selectedId;
        const stopIndex = routeStopIds.indexOf(id);
        return <Marker key={id} id={`route-location-${id}`} lngLat={[Number(item.longitude), Number(item.latitude)]} anchor="bottom" onPress={() => onSelect(item)}>
          <View style={{ minWidth: selected ? 40 : 32, height: selected ? 40 : 32, borderRadius: 22, backgroundColor: stopIndex >= 0 ? '#0f5132' : '#ffffff', borderWidth: selected ? 3 : 2, borderColor: selected ? '#f4b942' : '#173f2d', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {item.business_logo_url ? <Image source={{ uri: String(item.business_logo_url) }} style={{ width: selected ? 30 : 24, height: selected ? 30 : 24, borderRadius: 15 }} resizeMode="contain" /> : <Text style={{ color: stopIndex >= 0 ? 'white' : '#173f2d', fontWeight: '900', fontSize: stopIndex >= 0 ? 13 : 11 }}>{stopIndex >= 0 ? stopIndex + 1 : String(item.business_name ?? item.name ?? 'K').slice(0, 1).toUpperCase()}</Text>}
          </View>
        </Marker>;
      })}
    </Map>
    <View pointerEvents="none" style={{ position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(255,255,255,.94)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 }}>
      <Text style={{ color: '#173024', fontWeight: '900', fontSize: 12 }}>{locations.length} route candidates · {routeStopIds.length} selected stops</Text>
    </View>
  </View>;
}

export function FleetSelectedLocationCard({
  item,
  stopIndex,
  onToggleStop,
}: {
  item: FleetRouteLocation;
  stopIndex: number;
  onToggleStop: () => void;
}) {
  const distance = Number(item.distance_meters);
  const distanceText = Number.isFinite(distance) ? `${(distance / 1609.344).toFixed(distance < 16093 ? 1 : 0)} mi` : 'distance unavailable';
  return <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 7 }}>
    <Text style={{ fontSize: 18, fontWeight: '900', color: '#173024' }}>{item.name ?? item.business_name ?? 'Route location'}</Text>
    {item.business_name && item.business_name !== item.name ? <Text style={{ color: '#53685d', fontWeight: '700' }}>{item.business_name}</Text> : null}
    <Text style={{ color: '#66766e' }}>{[item.address, item.city, item.state].filter(Boolean).join(', ') || 'Address unavailable'} · {distanceText}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {item.bathroom_verification_status ? <Badge text={String(item.bathroom_verification_status).replaceAll('_', ' ')} /> : null}
      {item.accessible ? <Badge text="Accessible" /> : null}
      {item.changing_table ? <Badge text="Changing table" /> : null}
      {item.smart_bathroom ? <Badge text="Smart bathroom" /> : null}
      {item.rating != null ? <Badge text={`★ ${Number(item.rating).toFixed(1)}`} /> : null}
    </View>
    <Pressable onPress={onToggleStop} style={{ alignSelf: 'flex-start', backgroundColor: stopIndex >= 0 ? '#edf3ef' : '#173f2d', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 }}>
      <Text style={{ color: stopIndex >= 0 ? '#244d39' : 'white', fontWeight: '900' }}>{stopIndex >= 0 ? `Remove stop ${stopIndex + 1}` : 'Add to route'}</Text>
    </Pressable>
  </View>;
}

function Badge({ text }: { text: string }) {
  return <View style={{ backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: '#28533c', fontWeight: '800', fontSize: 11 }}>{text}</Text></View>;
}
