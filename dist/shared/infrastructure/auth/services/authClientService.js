import { supabase, supabaseAdmin } from '@/shared/infrastructure/auth/client/supaBaseClient';
/**
 * Basic Supabase auth client service.
 * Provides thin wrappers around Supabase client for common operations.
 * Replace or extend with your application's specific error handling and typing.
 */
export class AuthClientService {
    /** Create a new user (admin)
     * payload may include: email, password, phone, user_metadata
     */
    async createUser(payload) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser(payload);
        if (error)
            throw error;
        return data?.user;
    }
    /** Invite a user by email.
     * Current implementation creates a user without a password and returns the result.
     * You may replace this with a dedicated invite flow (generate invite link + email).
     */
    async inviteUser(email, userMetadata) {
        // Create user without password so they can complete signup via email link
        const payload = {
            email,
            user_metadata: userMetadata,
            email_confirm: true,
            // note: Supabase supports creating users and sending invite emails when using
            // the Admin API in conjunction with appropriate project settings. Adjust
            // fields below when integrating a real invite flow.
        };
        const { data, error } = await supabaseAdmin.auth.admin.createUser(payload);
        if (error)
            throw error;
        return data?.user;
    }
    /** Get user by id (admin)
     */
    async getUserById(userId) {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (error)
            throw error;
        return data?.user;
    }
    /** List users with optional pagination
     */
    async listUsers({ page = 1, perPage = 100 } = {}) {
        const opts = { page, perPage };
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
            page: opts.page,
            per_page: opts.perPage,
        });
        if (error)
            throw error;
        return data?.users ?? [];
    }
    /** Update user (admin) metadata or attributes
     */
    async updateUser(userId, updates) {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
        if (error)
            throw error;
        return data?.user;
    }
    /** Delete a user (admin)
     */
    async deleteUser(userId) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error)
            throw error;
    }
    /** Send password reset email to user (public client)
     */
    async sendPasswordResetEmail(email) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        if (error)
            throw error;
        return data;
    }
}
// Default singleton
export const authClientService = new AuthClientService();
//# sourceMappingURL=authClientService.js.map