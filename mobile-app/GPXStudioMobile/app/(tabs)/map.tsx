import React, { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation, useDeepLink } from '../../src/context';
import { MapScreen } from '../../src/screens/MapScreen';

export default function MapTab() {
  const params = useLocalSearchParams();
  const { setDeepLinkData } = useNavigation();
  const { deepLinkData, clearDeepLinkData } = useDeepLink();

  // Handle deep link parameters
  useEffect(() => {
    if (params.fileId || params.lat || params.lng || params.zoom) {
      setDeepLinkData({
        fileId: params.fileId as string,
        lat: params.lat ? parseFloat(params.lat as string) : undefined,
        lng: params.lng ? parseFloat(params.lng as string) : undefined,
        zoom: params.zoom ? parseFloat(params.zoom as string) : undefined,
      });
    }
  }, [params, setDeepLinkData]);

  // Handle deep link data
  useEffect(() => {
    if (deepLinkData) {
      console.log('Map deep link data:', deepLinkData);

      // Clear deep link data after handling
      setTimeout(() => {
        clearDeepLinkData();
      }, 1000);
    }
  }, [deepLinkData, clearDeepLinkData]);

  return (
    <MapScreen
      initialFileId={deepLinkData?.fileId}
      initialLocation={
        deepLinkData?.lat && deepLinkData?.lng
          ? { latitude: deepLinkData.lat, longitude: deepLinkData.lng }
          : undefined
      }
      initialZoom={deepLinkData?.zoom}
    />
  );
}
