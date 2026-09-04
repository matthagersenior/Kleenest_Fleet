import { Text, View } from 'react-native';

type Row = Record<string, unknown>;

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\b\w/g, letter => letter.toUpperCase());
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function scalar(value: unknown) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '—';
  if (typeof value === 'string') {
    if (isIsoDate(value)) return new Date(value).toLocaleString();
    if (isUuid(value)) return `${value.slice(0, 8)}…${value.slice(-4)}`;
    return value.replaceAll('_', ' ');
  }
  return String(value);
}

function isRecord(value: unknown): value is Row {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function StructuredData({ value, empty = 'No data returned yet.' }: { value: unknown; empty?: string }) {
  if (Array.isArray(value)) {
    if (!value.length) return <Text style={{ color: '#66766e' }}>{empty}</Text>;
    const hasStructuredItems = value.some(item => Array.isArray(item) || isRecord(item));
    if (!hasStructuredItems) {
      return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{value.map((item, index) => <Pill key={index} text={scalar(item)} />)}</View>;
    }
    return <View style={{ gap: 9 }}>{value.map((item, index) => <StructuredItem key={index} value={item} fallbackTitle={`Item ${index + 1}`} />)}</View>;
  }
  if (isRecord(value)) return <StructuredRecord value={value} />;
  return <Text style={{ color: '#66766e' }}>{scalar(value)}</Text>;
}

function StructuredItem({ value, fallbackTitle }: { value: unknown; fallbackTitle?: string }) {
  if (Array.isArray(value)) return <StructuredData value={value} />;
  if (isRecord(value)) return <StructuredRecord value={value} fallbackTitle={fallbackTitle} />;
  return <Text style={{ color: '#66766e' }}>{scalar(value)}</Text>;
}

function StructuredRecord({ value, fallbackTitle }: { value: Row; fallbackTitle?: string }) {
  const entries = Object.entries(value);
  const titleEntry = entries.find(([key]) => ['name', 'title', 'metric_key', 'feature_code', 'unit', 'domain', 'label'].includes(key));
  const title = titleEntry ? scalar(titleEntry[1]) : fallbackTitle;
  const bodyEntries = entries.filter(([key]) => key !== titleEntry?.[0]);

  return <View style={{ backgroundColor: '#f7faf8', borderWidth: 1, borderColor: '#dbe6df', borderRadius: 14, padding: 12, gap: 8 }}>
    {title ? <Text style={{ color: '#173f2d', fontWeight: '900', fontSize: 15 }}>{title}</Text> : null}
    {bodyEntries.map(([key, item]) => {
      if (Array.isArray(item)) {
        return <View key={key} style={{ gap: 6 }}>
          <Text style={fieldLabel}>{humanize(key)}</Text>
          <StructuredData value={item} empty="None" />
        </View>;
      }
      if (isRecord(item)) {
        return <View key={key} style={{ gap: 6 }}>
          <Text style={fieldLabel}>{humanize(key)}</Text>
          <StructuredRecord value={item} />
        </View>;
      }
      return <View key={key} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Text style={[fieldLabel, { width: 118 }]}>{humanize(key)}</Text>
        <Text style={{ flex: 1, color: '#66766e', lineHeight: 18 }}>{scalar(item)}</Text>
      </View>;
    })}
  </View>;
}

function Pill({ text }: { text: string }) {
  return <View style={{ backgroundColor: '#edf3ef', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: '#28533c', fontWeight: '800', fontSize: 11 }}>{text}</Text></View>;
}

const fieldLabel = { color: '#486154' as const, fontSize: 11, fontWeight: '900' as const };
