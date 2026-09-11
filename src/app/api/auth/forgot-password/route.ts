import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createResetToken,
  getResetUrl,
  logDevelopmentResetLink,
  normalizeEmail,
  PASSWORD_RESET_TTL_MS,
} from "@/lib/password-reset";

const schema = z.object({ email: z.string().email() });
const genericMessage = "If an account exists for that email, a password reset link has been created.";

export async function POST(request: Request) {
  try {
    const { email: rawEmail } = schema.parse(await request.json());
    const email = normalizeEmail(rawEmail);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) return NextResponse.json({ message: genericMessage });
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Password reset email delivery is not configured." }, { status: 503 });
    }

    const { rawToken, tokenHash } = createResetToken();
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
    });

    const resetUrl = getResetUrl(rawToken);
    logDevelopmentResetLink(email, resetUrl);
    return NextResponse.json({ message: genericMessage, devResetUrl: resetUrl });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    return NextResponse.json({ error: "Unable to process your request." }, { status: 500 });
  }
}
