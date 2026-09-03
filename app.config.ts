import type { ExpoConfig } from 'expo/config';

const EAS_PROJECT_ID = '22a65aa3-c615-4c4f-a34d-084babc28fd7';

const config: ExpoConfig = {
  name: 'Kleenest Fleet',
  slug: 'kleenest-fleet',
  version: '0.1.0',
  runtimeVersion: 'kleenest-fleet-0.1.0',
  updates: {
    enabled: true,
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    requestHeaders: { 'expo-channel-name': 'fleet-production' },
  },
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
  extra: {
    appRole: 'fleet',
    otaChannel: 'fleet-production',
    supabaseProjectRef: 'ssgesjzdvdsqacdtasje',
    eas: { projectId: EAS_PROJECT_ID },
  },
};

export default config;
