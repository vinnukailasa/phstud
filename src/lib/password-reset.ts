import crypto from "node:crypto";

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export function createResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getResetUrl(token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  return `${appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

export function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function logDevelopmentResetLink(email: string, resetUrl: string) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[v0] Development password reset link for ${email}: ${resetUrl}`);
  }
}
