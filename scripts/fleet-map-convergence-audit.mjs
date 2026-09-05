import fs from 'node:fs';

const source = fs.readFileSync('src/services/locations.ts', 'utf8');
const required = [
  'routeLocationRequestGeneration',
  'latestRouteLocationRequest',
  'generation === routeLocationRequestGeneration',
  'newest.catch(() => rows)',
  "rpc('map_network_nearby_v2'",
];

for (const token of required) {
  if (!source.includes(token)) throw new Error(`Fleet map convergence contract missing: ${token}`);
}

const generationIncrement = source.indexOf('++routeLocationRequestGeneration');
const rpcCall = source.indexOf("rpc('map_network_nearby_v2'");
const staleGuard = source.indexOf('generation === routeLocationRequestGeneration');
if (generationIncrement < 0 || rpcCall < generationIncrement || staleGuard < rpcCall) {
  throw new Error('Fleet route-location requests must be sequenced before RPC execution and guarded after resolution.');
}

console.log('Fleet map convergence audit passed.');
