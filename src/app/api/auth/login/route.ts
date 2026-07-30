import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { studio: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.studio && !user.studio.isActive) {
      return NextResponse.json({ error: "Studio account is inactive" }, { status: 403 });
    }

    if (user.studio?.licenseExpires && new Date() > user.studio.licenseExpires) {
      return NextResponse.json({ error: "Studio license has expired" }, { status: 403 });
    }

    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      studioId: user.studioId,
      studioSlug: user.studio?.slug ?? null,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studioId: user.studioId,
        studioName: user.studio?.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
