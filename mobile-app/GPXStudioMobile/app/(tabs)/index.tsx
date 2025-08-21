import { Redirect } from 'expo-router';

export default function TabIndex() {
  // Redirect to the map tab as the default
  return <Redirect href="/map" />;
}
