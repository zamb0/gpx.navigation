import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    heading?: number;
    speed?: number;
}

interface UseLocationResult {
    location: LocationData | null;
    error: string | null;
    loading: boolean;
    requestPermission: () => Promise<boolean>;
    getCurrentLocation: () => Promise<void>;
    hasPermission: boolean;
}

export function useLocation(): UseLocationResult {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasPermission, setHasPermission] = useState<boolean>(false);

    // Check permission status on mount
    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            setHasPermission(status === 'granted');
        } catch (err) {
            setError('Failed to check location permission');
        }
    };

    const requestPermission = async (): Promise<boolean> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            const granted = status === 'granted';
            setHasPermission(granted);

            if (!granted) {
                setError('Location permission denied');
            } else {
                setError(null);
            }

            return granted;
        } catch (err) {
            setError('Failed to request location permission');
            return false;
        }
    };

    const getCurrentLocation = async () => {
        setLoading(true);
        setError(null);

        try {
            if (!hasPermission) {
                const granted = await requestPermission();
                if (!granted) {
                    setLoading(false);
                    return;
                }
            }

            const locationResult = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 1000,
            });

            const { coords } = locationResult;
            setLocation({
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy || undefined,
                altitude: coords.altitude || undefined,
                heading: coords.heading || undefined,
                speed: coords.speed || undefined,
            });
        } catch (err) {
            setError('Failed to get current location');
            console.error('Location error:', err);
        } finally {
            setLoading(false);
        }
    };

    return {
        location,
        error,
        loading,
        requestPermission,
        getCurrentLocation,
        hasPermission,
    };
}
