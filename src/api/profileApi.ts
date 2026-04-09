import { supabase } from '@/config/supabase';
import type { Address, Profile } from '@/types/user.types';

type ProfileUpdates = Partial<Profile>;
type AddressPayload = Partial<Address> & { user_id: string };

export const profileApi = {
  getProfile: async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      throw error;
    }
    return data as Profile;
  },

  updateProfile: async (userId: string, updates: ProfileUpdates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data as Profile;
  },

  uploadAvatar: async (userId: string, fileUri: string, fileType: string) => {
    const extension = fileType.split('/')[1] || 'jpg';
    const fileName = `${userId}/avatar.${extension}`;
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, { upsert: true, contentType: fileType });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  },

  getAddresses: async (userId: string) => {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });
    if (error) {
      throw error;
    }
    return (data ?? []) as Address[];
  },

  upsertAddress: async (address: AddressPayload) => {
    const { data, error } = await supabase.from('addresses').upsert(address).select().single();
    if (error) {
      throw error;
    }
    return data as Address;
  },

  deleteAddress: async (addressId: string) => {
    const { error } = await supabase.from('addresses').delete().eq('id', addressId);
    if (error) {
      throw error;
    }
  },

  setDefaultAddress: async (userId: string, addressId: string) => {
    const { error: clearError } = await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId);
    if (clearError) {
      throw clearError;
    }

    const { error: setError } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId);
    if (setError) {
      throw setError;
    }
  },
};

export default profileApi;

