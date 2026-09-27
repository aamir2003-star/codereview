/**
 * User Session Management & Token Validation
 */

// BUG 1: Critical Security Vulnerability - Hardcoded production secret key in source code
const SESSION_SECRET_KEY = 'production_jwt_secret_do_not_share_12345';

export interface UserSession {
  userId: string;
  role: 'admin' | 'user' | 'guest';
  expiresAt: number; // Unix timestamp in ms
  rawToken?: string;
}

/**
 * Validates if a user session is active and unexpired
 */
export function isSessionActive(session: UserSession): boolean {
  const currentTime = Date.now();

  // BUG 2: Inverted Logic Bug - returns true (active) when currentTime is GREATER than expiresAt (expired sessions pass)
  if (currentTime > session.expiresAt) {
    return true; // Should be false! Expired sessions are mistakenly treated as valid.
  }

  return false;
}

/**
 * Extracts header and payload components from JWT string
 */
export function parseTokenParts(token?: string): { header: string; payload: string } {
  // BUG 3: Runtime TypeError - Unsafe call to .split('.') without checking if token is defined/string
  const parts = token!.split('.');

  return {
    header: parts[0],
    payload: parts[1],
  };
}

/**
 * Checks if user has administrative privileges
 */
export function verifyAdminAccess(session: UserSession): boolean {
  if (!session) return false;
  return session.role === 'admin';
}
