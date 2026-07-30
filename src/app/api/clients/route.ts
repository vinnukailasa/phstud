import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(10),
  address: z.string().optional(),
  notes: z.string().optional(),
});

function getStudioId(session: { role: string; studioId: string | null }) {
  if (!session.studioId) throw new AuthError("No studio assigned", 403);
  return session.studioId;
}

export async function GET() {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const studioId = getStudioId(session);

    const clients = await prisma.client.findMany({
      where: { studioId },
      include: { _count: { select: { events: true, invoices: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const studioId = getStudioId(session);
    const body = await request.json();
    const data = clientSchema.parse(body);

    const client = await prisma.client.create({
      data: {
        ...data,
        email: data.email || null,
        studioId,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
