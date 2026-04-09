import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export interface LocationCoords {
  lat: number;
  lng: number;
  address: string;
}

interface GeolocationCoordinatesLike {
  latitude: number;
  longitude: number;
}

interface GeolocationPositionLike {
  coords: GeolocationCoordinatesLike;
}

interface GeolocationErrorLike {
  code: number;
  message: string;
}

interface GeolocationLike {
  getCurrentPosition: (
    success: (position: GeolocationPositionLike) => void,
    error?: (error: GeolocationErrorLike) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
      distanceFilter?: number;
      interval?: number;
      fastestInterval?: number;
    },
  ) => void;
  watchPosition: (
    success: (position: GeolocationPositionLike) => void,
    error?: (error: GeolocationErrorLike) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
      distanceFilter?: number;
      interval?: number;
      fastestInterval?: number;
    },
  ) => number;
  clearWatch: (watchId: number) => void;
}

type LocationWatchCallback = (location: LocationCoords) => void;

const DEFAULT_LOCATION: LocationCoords = {
  lat: 25.4358,
  lng: 81.8463,
  address: 'Prayagraj',
};

const getGeolocation = (): GeolocationLike | undefined => {
  if (Geolocation) {
    return Geolocation as GeolocationLike;
  }

  return (globalThis.navigator as Navigator & { geolocation?: GeolocationLike }).geolocation;
};

const buildAddress = (payload: {
  display_name?: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}) => {
  if (payload.display_name) {
    return payload.display_name;
  }

  const addressParts = [
    payload.address?.suburb || payload.address?.neighbourhood,
    payload.address?.city || payload.address?.town || payload.address?.village,
    payload.address?.state,
  ].filter(Boolean);

  return addressParts.join(', ') || `${DEFAULT_LOCATION.lat}, ${DEFAULT_LOCATION.lng}`;
};

class LocationService {
  private riderWatchId: number | null = null;
  private riderPushInterval: ReturnType<typeof setInterval> | null = null;
  private lastRiderLocation: LocationCoords | null = null;

  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'FoodieGo needs location access to show nearby restaurants.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (fine === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    const coarse = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      {
        title: 'Approximate Location Permission',
        message: 'FoodieGo can use approximate location for delivery discovery.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    return coarse === PermissionsAndroid.RESULTS.GRANTED;
  }

  async getAddressFromCoords(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }

      const payload = (await response.json()) as {
        display_name?: string;
        address?: {
          suburb?: string;
          neighbourhood?: string;
          city?: string;
          town?: string;
          village?: string;
          state?: string;
        };
      };

      return buildAddress(payload);
    } catch (_error) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  async getCurrentLocation(): Promise<LocationCoords> {
    const hasPermission = await this.requestLocationPermission();
    const geolocation = getGeolocation();

    if (!hasPermission || !geolocation) {
      return DEFAULT_LOCATION;
    }

    return new Promise(resolve => {
      geolocation.getCurrentPosition(
        async position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const address = await this.getAddressFromCoords(lat, lng);
          resolve({ lat, lng, address });
        },
        async _error => {
          const address = await this.getAddressFromCoords(
            DEFAULT_LOCATION.lat,
            DEFAULT_LOCATION.lng,
          );
          resolve({ ...DEFAULT_LOCATION, address });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    });
  }

  watchLocation(callback: LocationWatchCallback): () => void {
    const geolocation = getGeolocation();
    if (!geolocation) {
      return () => undefined;
    }

    const watchId = geolocation.watchPosition(
      async position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const address = await this.getAddressFromCoords(lat, lng);
        callback({ lat, lng, address });
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        distanceFilter: 15,
        interval: 5000,
        fastestInterval: 3000,
      },
    );

    return () => {
      geolocation.clearWatch(watchId);
    };
  }

  async startRiderTracking(onPush: (location: LocationCoords) => Promise<void> | void): Promise<() => void> {
    const hasPermission = await this.requestLocationPermission();
    const geolocation = getGeolocation();

    if (!hasPermission || !geolocation) {
      return () => undefined;
    }

    this.stopRiderTracking();

    const initial = await this.getCurrentLocation();
    this.lastRiderLocation = initial;
    await onPush(initial);

    this.riderWatchId = geolocation.watchPosition(
      async position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const address = await this.getAddressFromCoords(lat, lng);
        this.lastRiderLocation = { lat, lng, address };
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 4000,
        fastestInterval: 2000,
      },
    );

    // Push updates to backend every 10 seconds while rider is online.
    this.riderPushInterval = setInterval(() => {
      if (this.lastRiderLocation) {
        void onPush(this.lastRiderLocation);
      }
    }, 10000);

    this.showOnlineTrackingNotification();

    return () => {
      this.stopRiderTracking();
    };
  }

  stopRiderTracking() {
    const geolocation = getGeolocation();

    if (this.riderWatchId !== null && geolocation) {
      geolocation.clearWatch(this.riderWatchId);
      this.riderWatchId = null;
    }

    if (this.riderPushInterval) {
      clearInterval(this.riderPushInterval);
      this.riderPushInterval = null;
    }
  }

  private showOnlineTrackingNotification() {
    // Placeholder for persistent foreground notification.
    // Full Android foreground service wiring requires native service setup.
  }
}

export const locationService = new LocationService();
export default locationService;
