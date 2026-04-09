import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { authService, Profile } from '../services/authService';

type AuthActionResult = {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
};

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  hasInitialized: boolean;
  isAuthenticated: boolean;
  signInWithPhone: (phone: string) => Promise<AuthActionResult>;
  verifyOTP: (phone: string, token: string) => Promise<AuthActionResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  updateProfile: (
    data: Partial<Pick<Profile, 'name' | 'avatar_url' | 'phone'>>,
  ) => Promise<AuthActionResult>;
  initialize: () => Promise<void>;
  handleSessionChange: (session: Session | null) => Promise<void>;
}

const unauthenticatedState = {
  user: null,
  session: null,
  profile: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...unauthenticatedState,
  isLoading: true,
  hasInitialized: false,

  signInWithPhone: async phone => {
    set({ isLoading: true });
    const result = await authService.signInWithPhone(phone);
    set({ isLoading: false });
    return { success: result.success, error: result.error };
  },

  verifyOTP: async (phone, token) => {
    set({ isLoading: true });
    const result = await authService.verifyOTP(phone, token);

    if (!result.success || !result.session || !result.user || !result.profile) {
      set({ isLoading: false });
      return { success: false, error: result.error || 'OTP verification failed' };
    }

    set({
      user: result.user,
      session: result.session,
      profile: result.profile,
      isAuthenticated: true,
      isLoading: false,
    });

    return { success: true };
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });
    const result = await authService.signInWithEmail(email, password);

    if (!result.success || !result.session || !result.user || !result.profile) {
      set({ isLoading: false });
      return { success: false, error: result.error || 'Email sign-in failed' };
    }

    set({
      user: result.user,
      session: result.session,
      profile: result.profile,
      isAuthenticated: true,
      isLoading: false,
    });

    return { success: true };
  },

  signUp: async (email, password, name) => {
    set({ isLoading: true });
    const result = await authService.signUp(email, password, name);

    if (!result.success) {
      set({ isLoading: false });
      return { success: false, error: result.error || 'Sign-up failed' };
    }

    if (result.session && result.user && result.profile) {
      set({
        user: result.user,
        session: result.session,
        profile: result.profile,
        isAuthenticated: true,
        isLoading: false,
      });
      return {
        success: true,
        requiresEmailConfirmation: result.requiresEmailConfirmation,
      };
    }

    set({ isLoading: false });
    return {
      success: true,
      requiresEmailConfirmation: result.requiresEmailConfirmation,
    };
  },

  signOut: async () => {
    set({ isLoading: true });
    const result = await authService.signOut();
    if (!result.success) {
      set({ isLoading: false });
      return { success: false, error: result.error || 'Failed to sign out' };
    }

    set({
      ...unauthenticatedState,
      isLoading: false,
    });
    return { success: true };
  },

  updateProfile: async data => {
    const currentUser = get().user;
    if (!currentUser) {
      return { success: false, error: 'No authenticated user' };
    }

    set({ isLoading: true });
    const result = await authService.updateProfile(currentUser.id, data);
    if (!result.success || !result.profile) {
      set({ isLoading: false });
      return { success: false, error: result.error || 'Failed to update profile' };
    }

    set({
      profile: result.profile,
      isLoading: false,
    });
    return { success: true };
  },

  initialize: async () => {
    set({ isLoading: true });
    const { session, error } = await authService.getSession();
    if (error || !session) {
      set({
        ...unauthenticatedState,
        isLoading: false,
        hasInitialized: true,
      });
      return;
    }

    const profileResult = await authService.fetchOrCreateProfile(session.user);
    if (!profileResult.success || !profileResult.profile) {
      set({
        ...unauthenticatedState,
        isLoading: false,
        hasInitialized: true,
      });
      return;
    }

    set({
      user: session.user,
      session,
      profile: profileResult.profile,
      isAuthenticated: true,
      isLoading: false,
      hasInitialized: true,
    });
  },

  handleSessionChange: async session => {
    if (!session) {
      set({
        ...unauthenticatedState,
        isLoading: false,
        hasInitialized: true,
      });
      return;
    }

    const profileResult = await authService.fetchOrCreateProfile(session.user);
    if (!profileResult.success || !profileResult.profile) {
      set({
        user: session.user,
        session,
        profile: null,
        isAuthenticated: true,
        isLoading: false,
        hasInitialized: true,
      });
      return;
    }

    set({
      user: session.user,
      session,
      profile: profileResult.profile,
      isAuthenticated: true,
      isLoading: false,
      hasInitialized: true,
    });
  },
}));

export default useAuthStore;
