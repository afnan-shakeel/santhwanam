/**
 * Types related to Supabase auth objects used in this project
 */

/**
 * Minimal representation of a Supabase user object.
 * Extend this as needed to reflect additional fields used by your app.
 */
export interface SupabaseUser {
  id: string;
  aud?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_metadata?: Record<string, any> | null;
  app_metadata?: Record<string, any> | null;
}

/**
 * Payload used to create a Supabase user via Admin API
 */
export interface CreateSupabaseUserPayload {
  email?: string;
  phone?: string;
  password?: string;
  user_metadata?: Record<string, any>;
  email_confirm?: boolean;
  email_redirect_to?: string;
}

export type ListUsersOptions = {
  page?: number;
  perPage?: number;
};
