import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType?: 'bike' | 'scooter' | 'cycle';
  vehicleNumber?: string;
  isOnline: boolean;
  rating: number;
  totalDeliveries: number;
}

export interface RiderSession {
  token: string;
  refreshToken: string;
  profile: RiderProfile;
  expiresAt: number;
}

const RIDER_TOKEN_KEY = 'rider_token';
const RIDER_REFRESH_TOKEN_KEY = 'rider_refresh_token';
const RIDER_PROFILE_KEY = 'rider_profile';
const RIDER_EXPIRES_KEY = 'rider_expires';

class RiderAuthStore {
  async saveSession(session: RiderSession): Promise<void> {
    await AsyncStorage.setItem(RIDER_TOKEN_KEY, session.token);
    await AsyncStorage.setItem(RIDER_REFRESH_TOKEN_KEY, session.refreshToken);
    await AsyncStorage.setItem(
      RIDER_PROFILE_KEY,
      JSON.stringify(session.profile),
    );
    await AsyncStorage.setItem(RIDER_EXPIRES_KEY, session.expiresAt.toString());
  }

  async getSession(): Promise<RiderSession | null> {
    try {
      const token = await AsyncStorage.getItem(RIDER_TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(RIDER_REFRESH_TOKEN_KEY);
      const profileStr = await AsyncStorage.getItem(RIDER_PROFILE_KEY);
      const expiresStr = await AsyncStorage.getItem(RIDER_EXPIRES_KEY);

      if (!token || !refreshToken || !profileStr || !expiresStr) {
        return null;
      }

      const expiresAt = parseInt(expiresStr, 10);
      const profile = JSON.parse(profileStr) as RiderProfile;

      if (Date.now() > expiresAt) {
        await this.clearSession();
        return null;
      }

      return { token, refreshToken, profile, expiresAt };
    } catch (error) {
      console.error('Failed to get rider session:', error);
      return null;
    }
  }

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(RIDER_TOKEN_KEY);
  }

  async getProfile(): Promise<RiderProfile | null> {
    try {
      const profileStr = await AsyncStorage.getItem(RIDER_PROFILE_KEY);
      if (!profileStr) return null;
      return JSON.parse(profileStr) as RiderProfile;
    } catch {
      return null;
    }
  }

  async updateProfile(profile: RiderProfile): Promise<void> {
    await AsyncStorage.setItem(RIDER_PROFILE_KEY, JSON.stringify(profile));
  }

  async updateOnlineStatus(isOnline: boolean): Promise<void> {
    const profile = await this.getProfile();
    if (profile) {
      profile.isOnline = isOnline;
      await this.updateProfile(profile);
    }
  }

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(RIDER_TOKEN_KEY);
    await AsyncStorage.removeItem(RIDER_REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(RIDER_PROFILE_KEY);
    await AsyncStorage.removeItem(RIDER_EXPIRES_KEY);
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }
}

export const riderAuthStore = new RiderAuthStore();
export default riderAuthStore;
