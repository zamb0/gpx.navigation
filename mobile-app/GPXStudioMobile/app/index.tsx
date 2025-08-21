import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the tabs layout with map as default
  return <Redirect href="/(tabs)/map" />;
}
