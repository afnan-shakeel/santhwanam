import { supabase, supabaseAdmin } from '@/shared/infrastructure/auth/client/supaBaseClient';
import { SupabaseUser, CreateSupabaseUserPayload, ListUsersOptions } from '@/shared/infrastructure/auth/types';

/**
 * Basic Supabase auth client service.
 * Provides thin wrappers around Supabase client for common operations.
 * Replace or extend with your application's specific error handling and typing.
 */
export class AuthClientService {
  /** Create a new user (admin)
   * payload may include: email, password, phone, user_metadata
   */
  async createUser(payload: CreateSupabaseUserPayload): Promise<SupabaseUser> {
    const { data, error } = await supabaseAdmin.auth.admin.createUser(payload);
    if (error) throw error;
    return data?.user;
  }

  /** Invite a user by email.
   * Current implementation creates a user without a password and returns the result.
   * You may replace this with a dedicated invite flow (generate invite link + email).
   */
  async inviteUser(email: string, userMetadata?: Record<string, unknown>): Promise<SupabaseUser> {
    // Create user without password so they can complete signup via email link
    const payload: any = {
      email,
      user_metadata: userMetadata,
      email_confirm: true,
      // note: Supabase supports creating users and sending invite emails when using
      // the Admin API in conjunction with appropriate project settings. Adjust
      // fields below when integrating a real invite flow.
    };

    const { data, error } = await supabaseAdmin.auth.admin.createUser(payload);
    if (error) throw error;
    return data?.user;
  }

  /** Get user by id (admin)
   */
  async getUserById(userId: string): Promise<SupabaseUser> {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw error;
    return data?.user;
  }

  /** List users with optional pagination
   */
  async listUsers({ page = 1, perPage = 100 } = {}): Promise<SupabaseUser[]> {
    const opts: ListUsersOptions = { page, perPage };
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: opts.page,
      per_page: opts.perPage,
    } as any);
    if (error) throw error;
    return data?.users ?? [];
  }

  /** Update user (admin) metadata or attributes
   */
  async updateUser(userId: string, updates: Partial<CreateSupabaseUserPayload>): Promise<SupabaseUser> {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates as any);
    if (error) throw error;
    return (data as any)?.user as SupabaseUser;
  }

  /** Delete a user (admin)
   */
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  /** Send password reset email to user (public client)
   */
  async sendPasswordResetEmail(email: string): Promise<any> {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  }
}

// Default singleton
export const authClientService = new AuthClientService();
