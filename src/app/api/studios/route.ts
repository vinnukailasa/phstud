import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const studioSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  licenseTier: z.enum(["TRIAL", "BASIC", "PROFESSIONAL", "ENTERPRISE"]).default("TRIAL"),
  licenseDays: z.number().min(1).default(30),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  primaryColor: z.string().default("#6366f1"),
  accentColor: z.string().default("#f59e0b"),
});

export async function GET() {
  try {
    await requireSession(["SUPER_ADMIN"]);
    const studios = await prisma.studio.findMany({
      include: {
        _count: { select: { users: true, clients: true, events: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(studios);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch studios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(["SUPER_ADMIN"]);
    const body = await request.json();
    const data = studioSchema.parse(body);

    const slug = slugify(data.name);
    const existing = await prisma.studio.findFirst({
      where: { OR: [{ slug }, { email: data.email }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Studio name or email already exists" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingUser) {
      return NextResponse.json({ error: "Admin email already in use" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(data.adminPassword, 12);
    const licenseExpires = new Date();
    licenseExpires.setDate(licenseExpires.getDate() + data.licenseDays);

    const studio = await prisma.studio.create({
      data: {
        name: data.name,
        slug: `${slug}-${Date.now().toString(36)}`,
        email: data.email,
        phone: data.phone,
        address: data.address,
        licenseTier: data.licenseTier,
        licenseExpires,
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
        users: {
          create: {
            email: data.adminEmail,
            password: hashed,
            name: data.adminName,
            role: "STUDIO_ADMIN",
          },
        },
      },
      include: { users: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json(studio, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create studio" }, { status: 500 });
  }
}
