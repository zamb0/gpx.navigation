import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useNavigation, useDeepLink } from '../../src/context';
import { RecordScreen } from '../../src/screens';

export default function RecordTab() {
  const params = useLocalSearchParams();
  const { setDeepLinkData } = useNavigation();
  const { deepLinkData, clearDeepLinkData } = useDeepLink();
  const [autoStart, setAutoStart] = useState(false);

  // Handle deep link parameters
  useEffect(() => {
    if (params.autoStart) {
      setDeepLinkData({
        autoStart: params.autoStart === 'true',
      });
    }
  }, [params, setDeepLinkData]);

  // Handle deep link data
  useEffect(() => {
    if (deepLinkData) {
      console.log('Record deep link data:', deepLinkData);

      if (deepLinkData.autoStart) {
        setAutoStart(true);
      }

      // Clear deep link data after handling
      setTimeout(() => {
        clearDeepLinkData();
      }, 1000);
    }
  }, [deepLinkData, clearDeepLinkData]);

  return <RecordScreen autoStart={autoStart} />;
}
