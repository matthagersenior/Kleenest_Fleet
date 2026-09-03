import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Kleenest Fleet',
  slug: 'kleenest-fleet',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'kleenest-fleet',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.kleenest.fleet',
    supportsTablet: true,
    config: { usesNonExemptEncryption: false },
  },
  android: { package: 'com.kleenest.fleet' },
  web: { output: 'single', bundler: 'metro', name: 'Kleenest Fleet', shortName: 'Kleenest Fleet' },
  plugins: ['expo-router', 'expo-secure-store'],
  experiments: { typedRoutes: true, baseUrl: '/Kleenest_Fleet' },
  extra: { appRole: 'fleet', supabaseProjectRef: 'ssgesjzdvdsqacdtasje' },
};

export default config;
