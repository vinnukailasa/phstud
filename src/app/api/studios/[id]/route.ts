import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, requireStudioAccess, AuthError } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  surfaceColor: z.string().optional(),
  upiId: z.string().optional().nullable(),
  payeeName: z.string().optional().nullable(),
  preEventReminderDays: z.number().min(1).max(90).optional(),
  postEventReminderDays: z.number().min(1).max(30).optional(),
  paymentReminderDays: z.number().min(1).max(30).optional(),
  licenseTier: z.enum(["TRIAL", "BASIC", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  licenseExpires: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    if (session.role !== "SUPER_ADMIN") {
      await requireStudioAccess(params.id);
    }

    const studio = await prisma.studio.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { users: true, clients: true, events: true, packages: true } },
      },
    });

    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }

    return NextResponse.json(studio);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch studio" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    if (session.role === "STUDIO_STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.role !== "SUPER_ADMIN") {
      await requireStudioAccess(params.id);
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...data };
    if (data.licenseExpires) {
      updateData.licenseExpires = new Date(data.licenseExpires);
    }

    // Only super admin can change license
    if (session.role !== "SUPER_ADMIN") {
      delete updateData.licenseTier;
      delete updateData.licenseExpires;
      delete updateData.isActive;
    }

    const studio = await prisma.studio.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(studio);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update studio" }, { status: 500 });
  }
}
