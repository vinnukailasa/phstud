import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

const packageSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  items: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN"]);
    const body = await request.json();
    const data = packageSchema.parse(body);

    const existing = await prisma.package.findFirst({
      where: { id: params.id, studioId: session.studioId! },
    });
    if (!existing) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const pkg = await prisma.package.update({
      where: { id: params.id },
      data: {
        ...data,
        items: data.items ? JSON.stringify(data.items) : undefined,
      },
    });

    return NextResponse.json(pkg);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN"]);
    const existing = await prisma.package.findFirst({
      where: { id: params.id, studioId: session.studioId! },
    });
    if (!existing) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    await prisma.package.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
  }
}
