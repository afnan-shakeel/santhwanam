# Password Reset via Backend Server

Yes, absolutely. Here's how to handle password reset server-side:

---

## **Approach: Backend-Controlled Password Reset**

### **1. Request Password Reset**

```javascript
// Frontend
POST /api/auth/request-password-reset
{
  "email": "user@example.com"
}
```

**Backend:**
```javascript
async function requestPasswordReset(req, res) {
  const { email } = req.body;
  
  // 1. Find local user
  const user = await db.users.findOne({ where: { email } });
  
  if (!user) {
    // Don't reveal if email exists
    return res.json({ message: 'If email exists, reset link sent' });
  }
  
  // 2. Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour
  
  // 3. Store in DB
  await db.passwordResetTokens.create({
    tokenId: generateUUID(),
    userId: user.userId,
    tokenHash: resetTokenHash,
    expiresAt,
    used: false
  });
  
  // 4. Generate reset link
  const resetLink = `${process.env.APP_URL}/auth/reset-password?token=${resetToken}`;
  
  // 5. Send email
  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    body: `Click to reset: ${resetLink}\n\nExpires in 1 hour.`
  });
  
  return res.json({ message: 'If email exists, reset link sent' });
}
```

---

### **2. Password Reset Token Table**

```javascript
PasswordResetToken {
  tokenId: UUID
  userId: UUID
  tokenHash: string // SHA-256 hash of token
  expiresAt: timestamp
  used: boolean
  usedAt: timestamp?
  createdAt: timestamp
}
```

```sql
CREATE TABLE password_reset_tokens (
  token_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_expires (user_id, expires_at)
);
```

---

### **3. Reset Password**

```javascript
// Frontend
POST /api/auth/reset-password
{
  "token": "abc123...",
  "newPassword": "NewSecure123!"
}
```

**Backend:**
```javascript
async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  
  // 1. Hash token
  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // 2. Find valid token
  const resetToken = await db.passwordResetTokens.findOne({
    where: {
      tokenHash,
      used: false,
      expiresAt: { gt: new Date() }
    },
    include: [{ model: db.users, as: 'user' }]
  });
  
  if (!resetToken) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  
  // 3. Validate password strength
  if (!isPasswordStrong(newPassword)) {
    return res.status(400).json({ 
      error: 'Password must be 8+ chars with uppercase, lowercase, number' 
    });
  }
  
  // 4. Update password in Supabase
  const { error } = await supabase.auth.admin.updateUserById(
    resetToken.user.externalAuthId,
    { password: newPassword }
  );
  
  if (error) {
    return res.status(500).json({ error: 'Failed to update password' });
  }
  
  // 5. Mark token as used
  await db.passwordResetTokens.update({
    used: true,
    usedAt: new Date()
  }, {
    where: { tokenId: resetToken.tokenId }
  });
  
  // 6. Invalidate all user sessions in Supabase
  await supabase.auth.admin.signOut(resetToken.user.externalAuthId);
  
  // 7. Log event
  await emitEvent('PasswordReset', {
    userId: resetToken.userId,
    resetAt: new Date()
  });
  
  return res.json({ message: 'Password reset successful' });
}
```

---

### **4. Password Validation Helper**

```javascript
function isPasswordStrong(password) {
  // Min 8 chars, 1 uppercase, 1 lowercase, 1 number
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return minLength && hasUppercase && hasLowercase && hasNumber;
}
```

---

### **5. Cleanup Job (Optional)**

```javascript
// Run daily to clean expired tokens
async function cleanupExpiredTokens() {
  await db.passwordResetTokens.destroy({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
}
```

---

## **Security Benefits**

✅ **Token never stored plaintext** - Only hash in DB  
✅ **Time-limited** - 1 hour expiry  
✅ **Single-use** - Token marked as used  
✅ **No email enumeration** - Same response regardless  
✅ **Sessions invalidated** - Forces re-login  
✅ **Password strength enforced** - Server-side validation  
