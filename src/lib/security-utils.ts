import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string, maxLength: number = 255): string {
  if (typeof input !== "string") return "";
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, ""); // Remove event handlers
}

/**
 * Sanitize nickname specifically
 */
export function sanitizeNickname(nickname: string): string {
  const sanitized = sanitizeInput(nickname, 50);
  
  // Only allow alphanumeric, spaces, hyphens, underscores
  const cleaned = sanitized.replace(/[^a-zA-Z0-9 _-]/g, "");
  
  if (cleaned.trim().length < 2) {
    return "";
  }
  
  return cleaned.trim();
}

/**
 * Escape HTML to prevent XSS in templates
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate game code format (6 uppercase alphanumeric)
 */
export function validateGameCode(code: string): boolean {
  const codeRegex = /^[A-Z0-9]{6}$/;
  return codeRegex.test(code);
}

/**
 * Check if password meets minimum security requirements
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push("Le mot de passe doit avoir au moins 12 caractères");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une majuscule");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une minuscule");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limiter in-memory store
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 900000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isLimited(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    entry.count++;
    if (entry.count > this.maxRequests) {
      return true;
    }

    return false;
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

export const globalRateLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100")
);

export const socketRateLimiter = new RateLimiter(
  parseInt(process.env.SOCKET_RATE_LIMIT_WINDOW_MS || "1000"),
  parseInt(process.env.SOCKET_RATE_LIMIT_MAX_EVENTS || "10")
);
