export interface Profile {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

export interface Address {
  id: string;
  user_id: string;
  label?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_default?: boolean;
  [key: string]: unknown;
}

