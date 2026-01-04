import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '@/config/env';
export function signAccessToken(payload, expiresIn) {
    // Use explicit expiresIn value if provided, otherwise fallback to env config.
    const signOpts = { expiresIn: (expiresIn ?? JWT_EXPIRES_IN) };
    // Sign and return token
    return jwt.sign(payload, JWT_SECRET, signOpts);
}
export function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, payload: decoded };
    }
    catch (err) {
        return { valid: false, error: err };
    }
}
//# sourceMappingURL=jwtService.js.map