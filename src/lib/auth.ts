import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);

export interface AdminPayload {
  role: "admin";
  iat?: number;
  exp?: number;
}

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

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
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(
  password: string
): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  return password === adminPassword;
}
