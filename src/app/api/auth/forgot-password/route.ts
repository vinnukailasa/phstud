import { NextResponse } from "next/server";
import twilio from "twilio";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createVerificationCode,
  getResetUrl,
  logDevelopmentResetLink,
  normalizePhone,
  isValidPhone,
  PASSWORD_RESET_TTL_MS,
} from "@/lib/password-reset";

const schema = z.object({ phone: z.string().min(8) });
const genericMessage = "If the account details match, a verification code has been sent on WhatsApp.";

function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) throw new Error("Twilio is not configured");
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export async function POST(request: Request) {
  try {
    const { phone: rawPhone } = schema.parse(await request.json());
    const phone = normalizePhone(rawPhone);
    const user = await prisma.user.findFirst({ where: { phone } });

    if (!user || !user.isActive || !user.phone || !isValidPhone(phone) || user.phone !== phone) {
      return NextResponse.json({ message: genericMessage });
    }

    const { rawToken, tokenHash } = createVerificationCode();
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
    });

    const resetUrl = getResetUrl(rawToken);
    const code = rawToken;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!from) throw new Error("TWILIO_WHATSAPP_FROM is not configured");
    await getTwilioClient().messages.create({
      from: `whatsapp:${from.replace(/^whatsapp:/, "")}`,
      to: `whatsapp:${phone}`,
      body: `Your PHStud password reset verification code is ${code}. It expires in 30 minutes.`,
    });
    logDevelopmentResetLink(phone, resetUrl);
    return NextResponse.json({ message: genericMessage, resetUrl: "/reset-password" });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid WhatsApp number." }, { status: 400 });
    return NextResponse.json({ error: "Unable to process your request." }, { status: 500 });
  }
}
