import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FleetWorkspaceProvider } from '@/state/FleetWorkspace';

export default function RootLayout() {
  return (
    <FleetWorkspaceProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false, contentStyle: { backgroundColor: '#f5f7f6' } }}>
        <Stack.Screen name="index" options={{ title: 'Fleet Control Center' }} />
        <Stack.Screen name="auth" options={{ title: 'Fleet Sign In', presentation: 'modal' }} />
        <Stack.Screen name="dispatch" options={{ title: 'Dispatch Center' }} />
        <Stack.Screen name="operations" options={{ title: 'Vehicles, Drivers & Maintenance' }} />
        <Stack.Screen name="execution" options={{ title: 'Route Execution' }} />
        <Stack.Screen name="progression" options={{ title: 'Fleet Progression' }} />
        <Stack.Screen name="signals" options={{ title: 'Fleet Signals' }} />
        <Stack.Screen name="sync" options={{ title: 'Notifications & Offline' }} />
        <Stack.Screen name="intelligence" options={{ title: 'Fleet Intelligence' }} />
        <Stack.Screen name="metrics" options={{ title: 'Fleet Metrics' }} />
        <Stack.Screen name="premium" options={{ title: 'Fleet Premium' }} />
        <Stack.Screen name="enterprise" options={{ title: 'Enterprise' }} />
      </Stack>
    </FleetWorkspaceProvider>
  );
}
