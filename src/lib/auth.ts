import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { UserRole } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  studioId: string | null;
  studioSlug: string | null;
}

const COOKIE_NAME = "phstud_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  cookies().delete(COOKIE_NAME);
}

export async function requireSession(allowedRoles?: UserRole[]) {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Unauthorized", 401);
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

export async function requireStudioAccess(studioId: string) {
  const session = await requireSession();
  if (session.role === "SUPER_ADMIN") return session;
  if (session.studioId !== studioId) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getStudioTheme(studioId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      primaryColor: true,
      accentColor: true,
      surfaceColor: true,
      name: true,
      logoUrl: true,
    },
  });
  return studio;
}
