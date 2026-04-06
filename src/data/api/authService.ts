import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Seller, Admin, UserRole, Address } from '../../domain/types';
import {
  clearSessionTokens,
  createApiClient,
  persistSessionTokens,
} from './httpClient';
import {
  asArray,
  asBoolean,
  asEnum,
  asErrorMessage,
  asObject,
  asOptionalString,
  asTypedObject,
} from './contracts';
import {
  clearGuardState,
  enforceLocalVelocityGuard,
  parseRateLimitMessage,
  recordGuardedFailure,
} from './securityGuard';

const USER_ROLES: readonly UserRole[] = ['customer', 'seller', 'admin'] as const;

const parseAuthSuccess = (value: unknown, path: string) => {
  const data = asObject(value, path);
  return {
    success: asBoolean(data.success, `${path}.success`),
    message: asOptionalString(data.message, `${path}.message`),
    token: asOptionalString(data.token, `${path}.token`),
    refreshToken: asOptionalString(data.refreshToken, `${path}.refreshToken`),
    user: data.user as User | undefined,
    seller: data.seller as Seller | undefined,
    admin: data.admin as Admin | undefined,
  };
};

const parseAddresses = (value: unknown, path: string): Address[] =>
  asArray(value, path, (item, itemPath) => asTypedObject<Address>(item, itemPath));

class AuthService {
  private api = createApiClient();

  constructor() {
    this.api.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          await this.logout();
        }
        return Promise.reject(error);
      },
    );
  }

  async sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
    const localGuard = await enforceLocalVelocityGuard('otp_send', {
      maxAttempts: 5,
      windowSec: 300,
      cooldownSec: 120,
      blockedMessage: 'Too many OTP requests',
    });
    if (!localGuard.allowed) {
      return { success: false, message: localGuard.message || 'Try again later' };
    }

    try {
      const response = await this.api.post('/auth/send-otp', { phone });
      const data = parseAuthSuccess(response.data, 'auth.sendOTP');
      await clearGuardState('otp_send');
      return {
        success: data.success,
        message: data.message || (data.success ? 'OTP sent' : 'Failed to send OTP'),
      };
    } catch (error) {
      await recordGuardedFailure('otp_send');
      const parsed = parseRateLimitMessage(
        error,
        asErrorMessage(error, 'Failed to send OTP. Please try again.'),
      );
      return {
        success: false,
        message: parsed.message,
      };
    }
  }

  async verifyOTP(
    phone: string,
    otp: string,
  ): Promise<{ success: boolean; token?: string; user?: User; message?: string }> {
    const localGuard = await enforceLocalVelocityGuard('otp_verify', {
      maxAttempts: 8,
      windowSec: 600,
      cooldownSec: 180,
      blockedMessage: 'Too many OTP verification attempts',
    });
    if (!localGuard.allowed) {
      return { success: false, message: localGuard.message };
    }

    try {
      const response = await this.api.post('/auth/verify-otp', { phone, otp });
      const data = parseAuthSuccess(response.data, 'auth.verifyOTP');
      await persistSessionTokens(data.token, data.refreshToken);
      await clearGuardState('otp_verify');
      return { success: data.success, token: data.token, user: data.user };
    } catch (error) {
      await recordGuardedFailure('otp_verify');
      const parsed = parseRateLimitMessage(
        error,
        asErrorMessage(error, 'Failed to verify OTP'),
      );
      return { success: false, message: parsed.message };
    }
  }

  async registerUser(
    phone: string,
    name: string,
    email?: string,
  ): Promise<{ success: boolean; user?: User }> {
    try {
      const response = await this.api.post('/auth/register', {
        phone,
        name,
        email,
        role: 'customer',
      });
      const data = parseAuthSuccess(response.data, 'auth.registerUser');
      await persistSessionTokens(data.token, data.refreshToken);
      return { success: data.success, user: data.user };
    } catch (error) {
      asErrorMessage(error, 'Failed to register user');
      return { success: false };
    }
  }

  async loginUser(
    phone: string,
    password?: string,
  ): Promise<{ success: boolean; user?: User }> {
    try {
      const response = await this.api.post('/auth/login', {
        phone,
        password,
        role: 'customer',
      });
      const data = parseAuthSuccess(response.data, 'auth.loginUser');
      await persistSessionTokens(data.token, data.refreshToken);
      return { success: data.success, user: data.user };
    } catch (error) {
      asErrorMessage(error, 'Failed to login user');
      return { success: false };
    }
  }

  async loginSeller(
    email: string,
    password: string,
  ): Promise<{ success: boolean; seller?: Seller }> {
    try {
      const response = await this.api.post('/auth/login', {
        email,
        password,
        role: 'seller',
      });
      const data = parseAuthSuccess(response.data, 'auth.loginSeller');
      await persistSessionTokens(data.token, data.refreshToken);
      if (data.seller) {
        await AsyncStorage.setItem('seller_data', JSON.stringify(data.seller));
      }
      return { success: data.success, seller: data.seller };
    } catch (error) {
      asErrorMessage(error, 'Failed to login seller');
      return { success: false };
    }
  }

  async registerSeller(
    sellerData: Partial<Seller>,
  ): Promise<{ success: boolean; seller?: Seller }> {
    try {
      const response = await this.api.post('/auth/register', {
        ...sellerData,
        role: 'seller',
      });
      const data = parseAuthSuccess(response.data, 'auth.registerSeller');
      await persistSessionTokens(data.token, data.refreshToken);
      if (data.seller) {
        await AsyncStorage.setItem('seller_data', JSON.stringify(data.seller));
      }
      return { success: data.success, seller: data.seller };
    } catch (error) {
      asErrorMessage(error, 'Failed to register seller');
      return { success: false };
    }
  }

  async loginAdmin(
    email: string,
    password: string,
  ): Promise<{ success: boolean; admin?: Admin }> {
    try {
      const response = await this.api.post('/auth/login', {
        email,
        password,
        role: 'admin',
      });
      const data = parseAuthSuccess(response.data, 'auth.loginAdmin');
      await persistSessionTokens(data.token, data.refreshToken);
      if (data.admin) {
        await AsyncStorage.setItem('admin_data', JSON.stringify(data.admin));
      }
      return { success: data.success, admin: data.admin };
    } catch (error) {
      asErrorMessage(error, 'Failed to login admin');
      return { success: false };
    }
  }

  async logout(): Promise<void> {
    await clearSessionTokens();
    await AsyncStorage.multiRemove([
      'user_data',
      'seller_data',
      'admin_data',
    ]);
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.api.get('/auth/me');
      const data = asObject(response.data, 'auth.getCurrentUser');
      return asTypedObject<User>(data.user, 'auth.getCurrentUser.user');
    } catch {
      return null;
    }
  }

  async updateProfile(
    data: Partial<User>,
  ): Promise<{ success: boolean; user?: User }> {
    try {
      const response = await this.api.put('/auth/profile', data);
      const payload = parseAuthSuccess(response.data, 'auth.updateProfile');
      return { success: payload.success, user: payload.user };
    } catch {
      return { success: false };
    }
  }

  async addAddress(
    address: Omit<Address, 'id'>,
  ): Promise<{ success: boolean; address?: Address }> {
    try {
      const response = await this.api.post('/addresses', address);
      const data = asObject(response.data, 'auth.addAddress');
      return {
        success: asBoolean(data.success, 'auth.addAddress.success'),
        address: asTypedObject<Address>(data.address, 'auth.addAddress.address'),
      };
    } catch {
      return { success: false };
    }
  }

  async deleteAddress(addressId: string): Promise<boolean> {
    try {
      await this.api.delete(`/addresses/${addressId}`);
      return true;
    } catch {
      return false;
    }
  }

  async setDefaultAddress(addressId: string): Promise<boolean> {
    try {
      await this.api.put(`/addresses/${addressId}/default`);
      return true;
    } catch {
      return false;
    }
  }

  async getAddresses(): Promise<{
    success: boolean;
    addresses?: Address[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/addresses');
      const data = asObject(response.data, 'auth.getAddresses');
      return {
        success: true,
        addresses: parseAddresses(data.addresses || [], 'auth.getAddresses.addresses'),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to fetch addresses'),
      };
    }
  }

  async resendOTP(phone: string): Promise<{ success: boolean; message?: string }> {
    const localGuard = await enforceLocalVelocityGuard('otp_resend', {
      maxAttempts: 4,
      windowSec: 300,
      cooldownSec: 120,
      blockedMessage: 'Too many OTP resend requests',
    });
    if (!localGuard.allowed) {
      return { success: false, message: localGuard.message };
    }

    try {
      await this.api.post('/auth/resend-otp', { phone });
      await clearGuardState('otp_resend');
      return { success: true };
    } catch (error) {
      await recordGuardedFailure('otp_resend');
      const parsed = parseRateLimitMessage(error, 'Failed to resend OTP');
      return { success: false, message: parsed.message };
    }
  }

  async isPhoneRegistered(
    phone: string,
  ): Promise<{ registered: boolean; role?: UserRole }> {
    try {
      const response = await this.api.post('/auth/check-phone', { phone });
      const data = asObject(response.data, 'auth.isPhoneRegistered');
      return {
        registered: asBoolean(data.registered, 'auth.isPhoneRegistered.registered'),
        role:
          data.role === undefined
            ? undefined
            : asEnum(data.role, 'auth.isPhoneRegistered.role', USER_ROLES),
      };
    } catch {
      return { registered: false };
    }
  }
}

export const authService = new AuthService();
export default authService;
