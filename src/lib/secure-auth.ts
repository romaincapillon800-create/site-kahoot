import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || (() => {
    throw new Error(
      "❌ JWT_SECRET not set! Set it in .env.local (generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    );
  })()
);

export interface AdminPayload {
  role: "admin";
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash a password securely
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await hash(password, 12);
  return salt;
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return compare(password, hash);
}

/**
 * Create a JWT admin token
 */
export async function createAdminToken(email: string): Promise<string> {
  return new SignJWT({ role: "admin", email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

/**
 * Verify a JWT admin token
 */
export async function verifyAdminToken(
  token: string
): Promise<AdminPayload | null> {
  try {
    const result = await jwtVerify(token, secret);
    const payload = result.payload as unknown;

    if (
      typeof payload === "object" &&
      payload !== null &&
      "role" in payload &&
      (payload as { role?: unknown }).role === "admin"
    ) {
      return payload as AdminPayload;
    }

    return null;
  } catch (error) {
    console.error("[Auth] Token verification failed:", error);
    return null;
  }
}

/**
 * Validate admin credentials
 */
export async function validateAdminCredentials(
  email: string,
  password: string
): Promise<{ valid: boolean; message: string }> {
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    return {
      valid: false,
      message: "Admin credentials not configured",
    };
  }

  const normalizedEmail = (email || "").trim().toLowerCase();

  if (normalizedEmail !== adminEmail) {
    return {
      valid: false,
      message: "Email ou mot de passe incorrect",
    };
  }

  const passwordValid = await verifyPassword(password, adminPasswordHash);

  if (!passwordValid) {
    return {
      valid: false,
      message: "Email ou mot de passe incorrect",
    };
  }

  return {
    valid: true,
    message: "Authentification réussie",
  };
}

/**
 * Session store for tracking admin sessions
 */
interface SessionData {
  email: string;
  createdAt: number;
  expiresAt: number;
}

class SessionStore {
  private sessions = new Map<string, SessionData>();
  private sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

  createSession(email: string): string {
    const sessionId = Math.random().toString(36).slice(2);
    const now = Date.now();

    this.sessions.set(sessionId, {
      email,
      createdAt: now,
      expiresAt: now + this.sessionTimeout,
    });

    return sessionId;
  }

  validateSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.email;
  }

  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // Clean up expired sessions every hour
  constructor() {
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions.entries()) {
        if (now > session.expiresAt) {
          this.sessions.delete(id);
        }
      }
    }, 60 * 60 * 1000);
  }
}

export const sessionStore = new SessionStore();
