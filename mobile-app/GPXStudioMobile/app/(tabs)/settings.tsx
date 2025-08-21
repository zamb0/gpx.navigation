import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useNavigation, useDeepLink } from '../../src/context';
import { SettingsScreen } from '../../src/screens';

export default function SettingsTab() {
  const params = useLocalSearchParams();
  const { setDeepLinkData } = useNavigation();
  const { deepLinkData, clearDeepLinkData } = useDeepLink();

  // Handle deep link parameters
  useEffect(() => {
    if (params.section) {
      setDeepLinkData({
        section: params.section as string,
      });
    }
  }, [params, setDeepLinkData]);

  // Handle deep link data
  useEffect(() => {
    if (deepLinkData) {
      // TODO: Navigate to specific settings section based on deep link data
      console.log('Settings deep link data:', deepLinkData);

      // Clear deep link data after handling
      setTimeout(() => {
        clearDeepLinkData();
      }, 1000);
    }
  }, [deepLinkData, clearDeepLinkData]);

  return <SettingsScreen />;
}
