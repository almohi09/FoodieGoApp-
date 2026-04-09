import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { riderService } from '../api/riderService';

type LocationUpdateCallback = (lat: number, lng: number) => void;

// Fix: declare geolocation on navigator for React Native
declare const navigator: Navigator & {
  geolocation: {
    getCurrentPosition: (
      success: (position: any) => void,
      error: (error: any) => void,
      options?: any,
    ) => void;
    watchPosition: (
      success: (position: any) => void,
      error: (error: any) => void,
      options?: any,
    ) => number;
    clearWatch: (id: number) => void;
  };
};

class RiderLocationService {
  private watchId: number | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private lastLocation: { lat: number; lng: number } | null = null;
  private isTracking = false;
  private locationUpdateCallbacks: LocationUpdateCallback[] = [];

  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message:
              'FoodieGo Rider needs access to your location to receive delivery assignments and navigate to restaurants and customers.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Permission Required',
            'Location permission is required to work as a rider. Please enable it in app settings.',
            [{ text: 'OK' }],
          );
          return false;
        }
        return false;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    return true;
  }

  async getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        (position: any) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error: any) => {
          console.warn('Failed to get current position:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    });
  }

  async startTracking(): Promise<boolean> {
    if (this.isTracking) {
      return true;
    }

    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      return false;
    }

    this.isTracking = true;

    this.watchId = navigator.geolocation.watchPosition(
      async (position: any) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        this.lastLocation = location;

        this.locationUpdateCallbacks.forEach(callback => {
          callback(location.lat, location.lng);
        });

        try {
          await riderService.updateLocation(location.lat, location.lng);
        } catch (error) {
          console.warn('Failed to update location to server:', error);
        }
      },
      (error: any) => {
        console.warn('Location watch error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 50,
        interval: 30000,
        fastestInterval: 15000,
      },
    );

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.updateInterval = setInterval(async () => {
      if (this.lastLocation) {
        try {
          await riderService.updateLocation(
            this.lastLocation.lat,
            this.lastLocation.lng,
          );
        } catch (error) {
          console.warn('Failed to send periodic location update:', error);
        }
      }
    }, 60000);

    return true;
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isTracking = false;
    this.lastLocation = null;
  }

  onLocationUpdate(callback: LocationUpdateCallback): () => void {
    this.locationUpdateCallbacks.push(callback);
    return () => {
      const index = this.locationUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationUpdateCallbacks.splice(index, 1);
      }
    };
  }

  getLastLocation(): { lat: number; lng: number } | null {
    return this.lastLocation;
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  calculateETA(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): number {
    const distance = this.calculateDistance(fromLat, fromLng, toLat, toLng);
    const averageSpeedKmH = 30;
    const etaHours = distance / averageSpeedKmH;
    return Math.round(etaHours * 60);
  }

  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  }

  formatETA(minutes: number): string {
    if (minutes < 1) {
      return 'Arriving';
    }
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
}

export const riderLocationService = new RiderLocationService();
export default riderLocationService;

