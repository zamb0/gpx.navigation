import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavigationProvider, EditingProvider } from '../src/context';

export default function RootLayout() {
  return (
    <NavigationProvider>
      <EditingProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </EditingProvider>
    </NavigationProvider>
  );
}
