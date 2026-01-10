import crypto from 'crypto';
import prisma from '@/shared/infrastructure/prisma/prismaClient';
import AppError from '@/shared/utils/error-handling/AppError';
import { authClientService } from '@/shared/infrastructure/auth/services/authClientService';
import { supabaseAdmin } from '@/shared/infrastructure/auth/client/supaBaseClient';
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
function isPasswordStrong(password) {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return minLength && hasUppercase && hasLowercase && hasNumber;
}
export async function requestPasswordReset(email) {
    // Find local user
    const user = await prisma.user.findUnique({ where: { email } });
    // Don't reveal existence
    console.log('Password reset requested for email:', email, user?.email);
    if (!user)
        return;
    // Generate token and store hash
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.passwordResetToken.create({
        data: {
            userId: user.userId,
            tokenHash,
            expiresAt,
        },
    });
    // Build reset link
    const appUrl = process.env.CLIENT_URL;
    const resetLink = `${appUrl}/auth/reset-password?token=${token}`;
    const { data, error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: resetLink,
    });
    console.log(data, error);
    // In production hook this up to your email provider. For now we log it.
    console.info(`Password reset link for ${email}: ${resetLink}`);
    return;
}
export async function resetPassword(token, newPassword) {
    if (!isPasswordStrong(newPassword)) {
        throw new AppError('Password does not meet strength requirements', 400);
    }
    const tokenHash = hashToken(token);
    // Find valid token (not used and not expired)
    const record = await prisma.passwordResetToken.findFirst({
        where: {
            tokenHash,
            used: false,
            expiresAt: { gt: new Date() },
        },
        include: { user: true },
    });
    if (!record)
        throw new AppError('Invalid or expired token', 400);
    const user = record.user;
    if (!user)
        throw new AppError('User not found for token', 500);
    // Update password in Supabase via admin API
    try {
        await authClientService.updateUser(user.externalAuthId, { password: newPassword });
    }
    catch (err) {
        throw new AppError('Failed to update password', 500, err);
    }
    // Mark token used
    await prisma.passwordResetToken.update({
        where: { tokenId: record.tokenId },
        data: { used: true, usedAt: new Date() },
    });
    // Optionally: emit audit event or invalidate sessions (not implemented)
    return;
}
//# sourceMappingURL=passwordResetService.js.map