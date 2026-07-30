import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

const photographerSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN"]);
    const body = await request.json();
    const data = photographerSchema.parse(body);

    const existing = await prisma.photographer.findFirst({
      where: { id: params.id, studioId: session.studioId! },
    });
    if (!existing) {
      return NextResponse.json({ error: "Photographer not found" }, { status: 404 });
    }

    const photographer = await prisma.photographer.update({
      where: { id: params.id },
      data: {
        ...data,
        email: data.email === "" ? null : data.email,
      },
    });

    return NextResponse.json(photographer);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update photographer" }, { status: 500 });
  }
}
