import { Session, User } from '@supabase/supabase-js';
import supabase from '../config/supabase';

export interface Profile {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'customer' | 'restaurant_owner' | 'rider' | 'admin';
  created_at: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  session?: Session;
  user?: User;
  profile?: Profile;
  requiresEmailConfirmation?: boolean;
}

const PROFILE_COLUMNS = 'id,name,phone,avatar_url,role,created_at';

const normalizeError = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }
  return fallback;
};

class AuthService {
  async signInWithPhone(phone: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      return { success: false, error: normalizeError(error, 'Failed to send OTP') };
    }
    return { success: true };
  }

  async verifyOTP(phone: string, token: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      return { success: false, error: normalizeError(error, 'Invalid OTP') };
    }

    if (!data.session || !data.user) {
      return { success: false, error: 'Session not created after OTP verification' };
    }

    const profileResult = await this.fetchOrCreateProfile(data.user);
    if (!profileResult.success || !profileResult.profile) {
      return { success: false, error: profileResult.error || 'Failed to sync profile' };
    }

    return {
      success: true,
      session: data.session,
      user: data.user,
      profile: profileResult.profile,
    };
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: normalizeError(error, 'Invalid email or password') };
    }

    if (!data.session || !data.user) {
      return { success: false, error: 'Session not available after sign in' };
    }

    const profileResult = await this.fetchOrCreateProfile(data.user);
    if (!profileResult.success || !profileResult.profile) {
      return { success: false, error: profileResult.error || 'Failed to sync profile' };
    }

    return {
      success: true,
      session: data.session,
      user: data.user,
      profile: profileResult.profile,
    };
  }

  async signUp(email: string, password: string, name: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      return { success: false, error: normalizeError(error, 'Failed to create account') };
    }

    const requiresEmailConfirmation = !data.session;
    if (!data.user) {
      return {
        success: false,
        error: 'Sign-up succeeded but user is missing from response',
      };
    }

    if (!data.session) {
      return {
        success: true,
        user: data.user,
        requiresEmailConfirmation,
      };
    }

    const profileResult = await this.fetchOrCreateProfile(data.user, {
      name,
    });

    if (!profileResult.success || !profileResult.profile) {
      return { success: false, error: profileResult.error || 'Failed to create profile' };
    }

    return {
      success: true,
      session: data.session,
      user: data.user,
      profile: profileResult.profile,
      requiresEmailConfirmation,
    };
  }

  async signOut(): Promise<AuthResult> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: normalizeError(error, 'Failed to sign out') };
    }
    return { success: true };
  }

  async getSession(): Promise<{ session: Session | null; error?: string }> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { session: null, error: normalizeError(error, 'Failed to restore session') };
    }
    return { session: data.session };
  }

  async fetchOrCreateProfile(
    user: User,
    defaults?: { name?: string; avatar_url?: string },
  ): Promise<{ success: boolean; error?: string; profile?: Profile }> {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle<Profile>();

    if (error) {
      return { success: false, error: normalizeError(error, 'Failed to load profile') };
    }

    if (data) {
      return { success: true, profile: data };
    }

    const payload = {
      id: user.id,
      name: defaults?.name ?? '',
      phone: user.phone ?? null,
      avatar_url: defaults?.avatar_url ?? null,
      role: 'customer' as const,
    };

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert(payload)
      .select(PROFILE_COLUMNS)
      .single<Profile>();

    if (createError) {
      return {
        success: false,
        error: normalizeError(createError, 'Failed to create profile'),
      };
    }

    return { success: true, profile: created };
  }

  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'name' | 'avatar_url' | 'phone'>>,
  ): Promise<{ success: boolean; error?: string; profile?: Profile }> {
    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle<Profile>();

    if (existingError) {
      return {
        success: false,
        error: normalizeError(existingError, 'Failed to load profile for update'),
      };
    }

    const payload = {
      id: userId,
      name: updates.name ?? existing?.name ?? '',
      phone: updates.phone ?? existing?.phone ?? null,
      avatar_url: updates.avatar_url ?? existing?.avatar_url ?? null,
      role: existing?.role ?? 'customer',
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select(PROFILE_COLUMNS)
      .single<Profile>();

    if (error) {
      return { success: false, error: normalizeError(error, 'Failed to update profile') };
    }

    return { success: true, profile: data };
  }
}

export const authService = new AuthService();
export default authService;
