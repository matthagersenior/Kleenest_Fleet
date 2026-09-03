import { Text, View } from 'react-native';

type Row = Record<string, unknown>;

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function scalar(value: unknown) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function StructuredData({ value, empty = 'No data returned yet.' }: { value: unknown; empty?: string }) {
  if (Array.isArray(value)) {
    if (!value.length) return <Text style={{ color: '#66766e' }}>{empty}</Text>;
    return <View style={{ gap: 9 }}>{value.map((item, index) => <StructuredRecord key={index} value={item} fallbackTitle={`Item ${index + 1}`} />)}</View>;
  }
  if (value && typeof value === 'object') return <StructuredRecord value={value} />;
  return <Text style={{ color: '#66766e' }}>{scalar(value)}</Text>;
}

function StructuredRecord({ value, fallbackTitle }: { value: unknown; fallbackTitle?: string }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return <Text style={{ color: '#66766e' }}>{scalar(value)}</Text>;
  const entries = Object.entries(value as Row);
  const titleEntry = entries.find(([key]) => ['name','title','metric_key','feature_code','unit','domain'].includes(key));
  const title = titleEntry ? scalar(titleEntry[1]) : fallbackTitle;
  return <View style={{ backgroundColor: '#f7faf8', borderWidth: 1, borderColor: '#dbe6df', borderRadius: 14, padding: 12, gap: 8 }}>
    {title ? <Text style={{ color: '#173f2d', fontWeight: '900', fontSize: 15 }}>{title}</Text> : null}
    {entries.filter(([key]) => key !== titleEntry?.[0]).map(([key, item]) => {
      if (Array.isArray(item)) return <View key={key} style={{ gap: 4 }}><Text style={{ color: '#486154', fontSize: 11, fontWeight: '900' }}>{humanize(key)}</Text><Text style={{ color: '#66766e', lineHeight: 19 }}>{item.length ? item.map(scalar).join(' • ') : '—'}</Text></View>;
      if (item && typeof item === 'object') return <View key={key} style={{ gap: 5 }}><Text style={{ color: '#486154', fontSize: 11, fontWeight: '900' }}>{humanize(key)}</Text><StructuredData value={item} /></View>;
      return <View key={key} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}><Text style={{ width: 118, color: '#486154', fontSize: 11, fontWeight: '900' }}>{humanize(key)}</Text><Text style={{ flex: 1, color: '#66766e', lineHeight: 18 }}>{scalar(item)}</Text></View>;
    })}
  </View>;
}
