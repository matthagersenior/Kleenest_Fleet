import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FleetWorkspaceProvider } from '@/state/FleetWorkspace';

export default function RootLayout() {
  return (
    <FleetWorkspaceProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false, contentStyle: { backgroundColor: '#f5f7f6' } }}>
        <Stack.Screen name="index" options={{ title: 'Fleet Control Center' }} />
        <Stack.Screen name="operations" options={{ title: 'Fleet Operations' }} />
        <Stack.Screen name="execution" options={{ title: 'Route Execution' }} />
        <Stack.Screen name="intelligence" options={{ title: 'Fleet Intelligence' }} />
        <Stack.Screen name="metrics" options={{ title: 'Fleet Metrics' }} />
        <Stack.Screen name="premium" options={{ title: 'Fleet Premium' }} />
      </Stack>
    </FleetWorkspaceProvider>
  );
}
