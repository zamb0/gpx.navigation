import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useNavigation, useDeepLink } from '../../src/context';
import { FilesScreen } from '../../src/screens/FilesScreen';
import { GPXFileMetadata } from '../../src/types/gpx';

export default function FilesTab() {
  const params = useLocalSearchParams();
  const { setDeepLinkData } = useNavigation();
  const { deepLinkData, clearDeepLinkData } = useDeepLink();

  // Handle deep link parameters
  useEffect(() => {
    if (params.importUrl || params.filter) {
      setDeepLinkData({
        importUrl: params.importUrl as string,
        filter: params.filter as string,
      });
    }
  }, [params, setDeepLinkData]);

  // Handle deep link data
  useEffect(() => {
    if (deepLinkData) {
      // TODO: Implement file import or filtering based on deep link data
      console.log('Files deep link data:', deepLinkData);

      // Clear deep link data after handling
      setTimeout(() => {
        clearDeepLinkData();
      }, 1000);
    }
  }, [deepLinkData, clearDeepLinkData]);

  const handleFileSelect = (file: GPXFileMetadata) => {
    // TODO: Navigate to map view with selected file
    console.log('Selected file for viewing:', file.name || file.filename);
  };

  return <FilesScreen onFileSelect={handleFileSelect} />;
}
