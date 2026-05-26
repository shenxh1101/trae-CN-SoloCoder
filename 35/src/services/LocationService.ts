import * as Location from 'expo-location';
import { Task } from '../types/models';

export const LocationService = {
  requestPermissions: async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
    return backgroundStatus.status === 'granted';
  },

  getCurrentPosition: async (): Promise<{ latitude: number; longitude: number; address: string } | null> => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let address = '';
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (results.length > 0) {
          const r = results[0];
          address = [r.name, r.street, r.city, r.region, r.country]
            .filter(Boolean)
            .join(' ');
        }
      } catch {
        address = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
      };
    } catch {
      return null;
    }
  },

  getDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  isNearLocation: (
    task: Task,
    currentLat: number,
    currentLng: number
  ): boolean => {
    if (!task.location) return false;
    const distance = LocationService.getDistance(
      currentLat,
      currentLng,
      task.location.latitude,
      task.location.longitude
    );
    return distance <= task.location.radius;
  },

  watchPosition: async (
    callback: (location: { latitude: number; longitude: number }) => void
  ): Promise<Location.LocationSubscription> => {
    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );
  },

  geocodeAddress: async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const results = await Location.geocodeAsync(address);
      if (results.length > 0) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};
