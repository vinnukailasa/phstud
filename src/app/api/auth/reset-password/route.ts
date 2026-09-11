import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashResetToken, isStrongPassword } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const { token, password } = schema.parse(await request.json());
    if (!isStrongPassword(password)) {
      return NextResponse.json({ error: "Password must be at least 8 characters and include a number." }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashedPassword } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId, id: { not: resetToken.id } } }),
    ]);

    return NextResponse.json({ message: "Your password has been reset." });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid password." }, { status: 400 });
    return NextResponse.json({ error: "Unable to reset your password." }, { status: 500 });
  }
}
