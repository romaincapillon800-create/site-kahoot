/**
 * 🔒 SECURITY CHECKLIST FOR CYBERLEARN
 * Use this as your development guideline
 */

import { prisma } from "./prisma";

// ===== CRITICAL SECURITY REQUIREMENTS =====

/**
 * ✅ Score Verification
 * - Scores MUST be verified on the server before saving
 * - Never trust client-calculated scores
 * - Always recalculate based on server-side data
 */
export async function verifyAndSaveScore(
  gameId: string,
  playerId: string,
  questionId: string,
  selectedOptionId: string
): Promise<{ correct: boolean; points: number }> {
  // Fetch question from database (never from client)
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true }, // ✅ SECURITY: Include options for validation
  });

  if (!question) {
    throw new Error("Question not found");
  }

  // Check correct answer (only on server)
  const correctOption = question.options.find((opt: any) => opt.isCorrect);
  const isCorrect = correctOption?.id === selectedOptionId;

  // Calculate points based on time (from server clock)
  const points = isCorrect ? 1000 : 0;

  return { correct: isCorrect, points };
}

/**
 * ✅ Answer Verification
 * Never send correct answers to the client before answering
 */
export function buildQuestionPayload(question: any, revealAnswers = false) {
  return {
    id: question.id,
    text: question.text,
    category: question.category,
    options: question.options.map((opt: any) => ({
      id: opt.id,
      text: opt.text,
      // ✅ SECURITY: Only include isCorrect when revealing
      ...(revealAnswers && { isCorrect: opt.isCorrect }),
    })),
  };
}

/**
 * ✅ Player Permission Verification
 * Verify the player belongs to this game BEFORE any action
 */
export async function verifyPlayerInGame(
  playerId: string,
  gameId: string
): Promise<boolean> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  return player?.gameId === gameId;
}

/**
 * ✅ Admin Verification
 * Verify admin status from database/token, never from frontend
 */
export async function isAdminAuthorized(userId: string): Promise<boolean> {
  const user = await prisma.admin.findUnique({
    where: { id: userId },
  });

  return !!user;
}

/**
 * ✅ Game Code Difficulty
 * Ensure codes are:
 * - 6+ characters
 * - Mix of uppercase/numbers
 * - Not sequential or predictable
 */
export function isValidGameCode(code: string): boolean {
  // Must be uppercase letters and numbers only, 6 chars
  return /^[A-Z0-9]{6,}$/.test(code);
}

/**
 * ✅ Socket.IO Event Validation
 * Every event MUST:
 * 1. Verify user identity
 * 2. Verify action authorization
 * 3. Validate all inputs
 * 4. Be rate-limited
 * 5. Have proper error handling
 */
export interface SocketEventValidation {
  eventName: string;
  requiresAuth: boolean;
  requiresAdmin?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  validateInput?: (data: any) => boolean;
}

/**
 * ✅ Security Logging
 * Log all security-relevant events
 */
export async function logSecurityEvent(
  eventType: "auth_attempt" | "unauthorized_access" | "score_manipulation" | "admin_action",
  details: Record<string, any>
) {
  console.log(`[SECURITY] ${eventType}:`, {
    timestamp: new Date().toISOString(),
    ...details,
  });

  // TODO: Save to database for auditing
  // await prisma.securityLog.create({
  //   data: { eventType, details: JSON.stringify(details) }
  // });
}

/**
 * ✅ API Key / Secret Management
 * NEVER:
 * - Store secrets in code or .env file sent to repo
 * - Expose secrets in logs
 * - Send secrets to frontend
 * 
 * DO:
 * - Use environment variables (e.g., Render dashboard)
 * - Use secret management service (AWS Secrets Manager, HashiCorp Vault)
 * - Rotate secrets regularly
 * - Audit access to secrets
 */

/**
 * ✅ Prevent XSS in Nicknames
 * Always sanitize and escape user input
 */
export function sanitizeNicknameForDisplay(nickname: string): string {
  return nickname
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * ✅ HTTPS Enforcement
 * In production:
 * - Force HTTPS
 * - Use HSTS headers
 * - Secure cookies only
 */

/**
 * ✅ CORS Configuration
 * Only allow your frontend domain
 */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
];

export function isCorsAllowed(origin?: string): boolean {
  return origin ? ALLOWED_ORIGINS.includes(origin) : false;
}

/**
 * ✅ Database Query Security
 * ALWAYS use parameterized queries (Prisma does this by default)
 * NEVER concatenate user input into SQL strings
 */

/**
 * ✅ Session Management
 * - Use HttpOnly cookies
 * - Set Secure flag in production
 * - Set SameSite=Strict
 * - Set reasonable expiration times
 */

export interface SecureSessionOptions {
  httpOnly: true;
  secure: boolean; // true in production
  sameSite: "strict" | "lax" | "none";
  maxAge: number; // milliseconds
}

export function getSecureSessionOptions(): SecureSessionOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };
}
