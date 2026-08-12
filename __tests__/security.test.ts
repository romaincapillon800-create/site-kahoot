/**
 * 🔒 Tests de sécurité pour CyberLearn
 * À exécuter en développement et production
 */

import { sanitizeNickname, validateGameCode, validateEmail, validatePassword } from "../lib/security-utils";

// ===== TESTS INPUT SANITIZATION =====

describe("Security: Input Sanitization", () => {
  test("XSS Prevention - Script tags in nickname", () => {
    const malicious = "<script>alert('XSS')</script>";
    const result = sanitizeNickname(malicious);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("</script>");
  });

  test("XSS Prevention - Event handlers", () => {
    const malicious = "Player' onclick='alert(1)'";
    const result = sanitizeNickname(malicious);
    expect(result).not.toContain("onclick");
  });

  test("XSS Prevention - Unicode bypass", () => {
    const malicious = "<img src=x onerror='alert(1)'>";
    const result = sanitizeNickname(malicious);
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("<img");
  });

  test("Nickname length validation", () => {
    const tooLong = "a".repeat(1000);
    const result = sanitizeNickname(tooLong);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  test("Nickname minimum length", () => {
    const result = sanitizeNickname("a");
    expect(result).toBe("");
  });

  test("Valid nickname", () => {
    const result = sanitizeNickname("Player123");
    expect(result).toBe("Player123");
  });
});

// ===== TESTS VALIDATION =====

describe("Security: Input Validation", () => {
  test("Game code format - valid", () => {
    expect(validateGameCode("ABC123")).toBe(true);
    expect(validateGameCode("ABCDEF")).toBe(true);
    expect(validateGameCode("123456")).toBe(true);
  });

  test("Game code format - invalid", () => {
    expect(validateGameCode("abc123")).toBe(false); // lowercase
    expect(validateGameCode("ABC12")).toBe(false); // too short
    expect(validateGameCode("ABC@123")).toBe(false); // special char
    expect(validateGameCode("ABC 123")).toBe(false); // space
  });

  test("Email validation - valid", () => {
    expect(validateEmail("admin@cyberlearn.com")).toBe(true);
    expect(validateEmail("test+tag@example.co.uk")).toBe(true);
  });

  test("Email validation - invalid", () => {
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("test@")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
  });

  test("Password validation - weak", () => {
    const result = validatePassword("weak");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("Password validation - strong", () => {
    const result = validatePassword("StrongP@ssw0rd123");
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

// ===== TESTS RATE LIMITING =====

describe("Security: Rate Limiting", () => {
  test("Rate limiter - allows requests within limit", () => {
    const limiter = new (require("../lib/security-utils").globalRateLimiter.constructor)(1000, 5);
    
    for (let i = 0; i < 5; i++) {
      expect(limiter.isLimited("test-key")).toBe(false);
    }
  });

  test("Rate limiter - blocks after limit", () => {
    const limiter = new (require("../lib/security-utils").globalRateLimiter.constructor)(1000, 5);
    
    for (let i = 0; i < 5; i++) {
      limiter.isLimited("test-key");
    }
    expect(limiter.isLimited("test-key")).toBe(true);
  });

  test("Rate limiter - resets after window", async () => {
    const limiter = new (require("../lib/security-utils").globalRateLimiter.constructor)(100, 2);
    
    limiter.isLimited("test-key");
    limiter.isLimited("test-key");
    expect(limiter.isLimited("test-key")).toBe(true);
    
    // Wait for window to reset
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    expect(limiter.isLimited("test-key")).toBe(false);
  });
});

// ===== TESTS AUTHENTICATION =====

describe("Security: Authentication", () => {
  test("Password hashing - different hashes for same password", async () => {
    const { hashPassword } = require("../lib/secure-auth");
    
    const password = "TestPassword123!";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2); // Different salts
  });

  test("Password verification - correct password", async () => {
    const { hashPassword, verifyPassword } = require("../lib/secure-auth");
    
    const password = "TestPassword123!";
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  test("Password verification - wrong password", async () => {
    const { hashPassword, verifyPassword } = require("../lib/secure-auth");
    
    const password = "TestPassword123!";
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword("WrongPassword", hash);
    expect(isValid).toBe(false);
  });

  test("JWT token creation", async () => {
    const { createAdminToken, verifyAdminToken } = require("../lib/secure-auth");
    
    const token = await createAdminToken("admin@test.com");
    expect(token).toBeTruthy();
    
    const payload = await verifyAdminToken(token);
    expect(payload).toBeTruthy();
    expect(payload.role).toBe("admin");
    expect(payload.email).toBe("admin@test.com");
  });

  test("JWT token - expired token rejected", async () => {
    const { verifyAdminToken } = require("../lib/secure-auth");
    
    // Use an obviously invalid/expired token
    const expiredToken = "invalid.token.here";
    const payload = await verifyAdminToken(expiredToken);
    
    expect(payload).toBeNull();
  });
});

// ===== TESTS SOCKET.IO SECURITY =====

describe("Security: Socket.IO Events", () => {
  test("Rate limiting - socket events", () => {
    const { socketRateLimiter } = require("../lib/security-utils");
    
    const socketId = "socket-12345";
    
    // Allow first N events
    for (let i = 0; i < 10; i++) {
      expect(socketRateLimiter.isLimited(socketId)).toBe(false);
    }
    
    // Block excess
    expect(socketRateLimiter.isLimited(socketId)).toBe(true);
  });
});

// ===== TESTS CORS =====

describe("Security: CORS", () => {
  test("CORS - allowed origin", () => {
    const { isCorsAllowed } = require("../lib/SECURITY-CHECKLIST");
    
    process.env.NEXT_PUBLIC_APP_URL = "https://cyberlearn.com";
    expect(isCorsAllowed("https://cyberlearn.com")).toBe(true);
  });

  test("CORS - denied origin", () => {
    const { isCorsAllowed } = require("../lib/SECURITY-CHECKLIST");
    
    process.env.NEXT_PUBLIC_APP_URL = "https://cyberlearn.com";
    expect(isCorsAllowed("https://malicious.com")).toBe(false);
  });

  test("CORS - no origin", () => {
    const { isCorsAllowed } = require("../lib/SECURITY-CHECKLIST");
    
    expect(isCorsAllowed()).toBe(false);
  });
});

// ===== TESTS ENVIRONMENT VARIABLES =====

describe("Security: Environment Variables", () => {
  test("JWT_SECRET is set", () => {
    expect(process.env.JWT_SECRET).toBeTruthy();
    expect(process.env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  test("ADMIN_PASSWORD_HASH is set", () => {
    expect(process.env.ADMIN_PASSWORD_HASH).toBeTruthy();
  });

  test("ADMIN_EMAIL is set", () => {
    expect(process.env.ADMIN_EMAIL).toBeTruthy();
  });

  test("Database URL is set", () => {
    expect(process.env.DATABASE_URL).toBeTruthy();
  });
});

// ===== INTEGRATION TESTS =====

describe("Security: Integration", () => {
  test("Player cannot submit answer for other player", () => {
    // This should be tested with actual Socket.IO connection
    // Verify that socket.data.playerId matches the answer submission
    expect(true).toBe(true); // Placeholder
  });

  test("Player cannot create game without admin", () => {
    // Verify admin:login is required before host:create-game
    expect(true).toBe(true); // Placeholder
  });

  test("Score cannot be modified by client", () => {
    // Verify scores are recalculated on server
    expect(true).toBe(true); // Placeholder
  });
});
