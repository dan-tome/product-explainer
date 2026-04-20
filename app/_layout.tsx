import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f4511e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Scanner', headerShown: false }} />
        <Stack.Screen name="results" options={{ title: 'Analysis' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
