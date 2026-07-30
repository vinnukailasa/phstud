import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

const photographerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  specialty: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const photographers = await prisma.photographer.findMany({
      where: {
        studioId: session.studioId!,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: { _count: { select: { assignments: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(photographers);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch photographers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN"]);
    const body = await request.json();
    const data = photographerSchema.parse(body);

    const photographer = await prisma.photographer.create({
      data: {
        ...data,
        email: data.email || null,
        studioId: session.studioId!,
      },
    });

    return NextResponse.json(photographer, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to create photographer" }, { status: 500 });
  }
}
