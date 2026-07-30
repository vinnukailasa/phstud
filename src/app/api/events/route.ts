import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { scheduleEventReminders } from "@/lib/reminders";

const eventSchema = z.object({
  title: z.string().min(2),
  eventType: z.enum(["PRE_WEDDING", "BEFORE_WEDDING", "WEDDING", "BIRTHDAY", "CUSTOM"]),
  eventDate: z.string(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  notes: z.string().optional(),
  clientId: z.string(),
  packageId: z.string().optional(),
  photographerIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const upcoming = searchParams.get("upcoming");

    const where: Record<string, unknown> = { studioId: session.studioId!, parentId: null };
    if (status) where.status = status;
    if (upcoming === "true") {
      where.eventDate = { gte: new Date() };
      where.status = "SCHEDULED";
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        package: { select: { id: true, name: true, price: true } },
        photographers: {
          include: { photographer: { select: { id: true, name: true } } },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const body = await request.json();
    const data = eventSchema.parse(body);

    const client = await prisma.client.findFirst({
      where: { id: data.clientId, studioId: session.studioId! },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { photographerIds, ...eventData } = data;

    const event = await prisma.event.create({
      data: {
        ...eventData,
        eventDate: new Date(data.eventDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        studioId: session.studioId!,
        photographers: photographerIds?.length
          ? {
              create: photographerIds.map((id) => ({
                photographerId: id,
              })),
            }
          : undefined,
      },
      include: {
        client: true,
        package: true,
        photographers: { include: { photographer: true } },
      },
    });

    await scheduleEventReminders(event.id);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
