import { PermissionsAndroid, Platform, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from '../../domain/types';

const LOCATION_STORAGE_KEY = '@saved_location';

type PositionCallback = (location: Location) => void;
type ErrorCallback = (error: any) => void;

class LocationService {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'FoodieGo needs access to your location to show nearby restaurants and deliver to your address.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    return true;
  }

  async getCurrentLocation(): Promise<Location | null> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Location permission is required to show nearby restaurants and deliver food to you.',
        [{ text: 'OK' }],
      );
      return null;
    }

    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        async position => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          const updatedLocation = await this.reverseGeocode(location);
          await this.saveLocation(updatedLocation);
          resolve(updatedLocation);
        },
        error => {
          console.warn('Geolocation error:', error);
          this.getSavedLocation().then(resolve);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    });
  }

  watchLocation(
    callback: PositionCallback,
    errorCallback?: ErrorCallback,
  ): number {
    return Geolocation.watchPosition(
      async position => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const updatedLocation = await this.reverseGeocode(location);
        callback(updatedLocation);
      },
      error => {
        console.warn('Watch location error:', error);
        if (errorCallback) {
          errorCallback(error);
        }
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 100,
        interval: 10000,
        fastestInterval: 5000,
      },
    );
  }

  clearWatch(watchId: number): void {
    Geolocation.clearWatch(watchId);
  }

  async reverseGeocode(location: Location): Promise<Location> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=YOUR_GOOGLE_API_KEY`,
      );
      const data = (await response.json()) as {
        results?: Array<{ formatted_address?: string }>;
      };
      if (data.results && data.results.length > 0) {
        location.address = data.results[0].formatted_address;
      }
    } catch (error) {
      console.warn('Reverse geocode error:', error);
      location.address = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }
    return location;
  }

  async geocodeAddress(address: string): Promise<Location | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=YOUR_GOOGLE_API_KEY`,
      );
      const data = (await response.json()) as {
        results?: Array<{
          geometry: { location: { lat: number; lng: number } };
          formatted_address?: string;
        }>;
      };
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address || address,
        };
      }
    } catch (error) {
      console.warn('Geocode error:', error);
    }
    return null;
  }

  calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371;
    const dLat = this.deg2rad(loc2.lat - loc1.lat);
    const dLon = this.deg2rad(loc2.lng - loc1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(loc1.lat)) *
        Math.cos(this.deg2rad(loc2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async saveLocation(location: Location): Promise<void> {
    try {
      await AsyncStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify(location),
      );
    } catch (error) {
      console.warn('Save location error:', error);
    }
  }

  async getSavedLocation(): Promise<Location | null> {
    try {
      const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Get saved location error:', error);
    }
    return null;
  }

  async getLastKnownLocation(): Promise<Location | null> {
    const saved = await this.getSavedLocation();
    if (saved) {
      return saved;
    }
    return this.getCurrentLocation();
  }

  formatAddress(address: string, maxLength = 50): string {
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength - 3) + '...';
  }

  getAddressComponents(address: string): {
    house?: string;
    street?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } {
    const components: {
      house?: string;
      street?: string;
      area?: string;
      city?: string;
      state?: string;
      pincode?: string;
    } = {};
    const parts = address.split(',').map(p => p.trim());

    parts.forEach(part => {
      const match = part.match(/\d+/);
      if (match && !components.house) {
        components.house = part;
      }
      if (part.toLowerCase().includes('sector')) {
        components.street = part;
      }
      const pincodeMatch = part.match(/\b\d{6}\b/);
      if (pincodeMatch) {
        components.pincode = pincodeMatch[0];
      }
    });

    if (parts.length > 0) components.area = parts[0];
    if (parts.length > 1) components.city = parts[parts.length - 2]?.trim();
    if (parts.length > 0) components.state = parts[parts.length - 1]?.trim();

    return components;
  }
}

export const locationService = new LocationService();
export default locationService;
