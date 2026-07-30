import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { scheduleEventReminders } from "@/lib/reminders";

const eventSchema = z.object({
  title: z.string().min(2).optional(),
  eventType: z.enum(["PRE_WEDDING", "BEFORE_WEDDING", "WEDDING", "BIRTHDAY", "CUSTOM"]).optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  eventDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  location: z.string().optional(),
  notes: z.string().optional(),
  packageId: z.string().optional().nullable(),
  photographerIds: z.array(z.string()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const event = await prisma.event.findFirst({
      where: { id: params.id, studioId: session.studioId! },
      include: {
        client: true,
        package: true,
        photographers: { include: { photographer: true } },
        invoices: { include: { payments: true } },
        reminders: { orderBy: { scheduledFor: "asc" } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const body = await request.json();
    const data = eventSchema.parse(body);

    const existing = await prisma.event.findFirst({
      where: { id: params.id, studioId: session.studioId! },
    });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { photographerIds, ...updateData } = data;
    const eventUpdate: Record<string, unknown> = { ...updateData };
    if (data.eventDate) eventUpdate.eventDate = new Date(data.eventDate);
    if (data.endDate !== undefined) {
      eventUpdate.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    const event = await prisma.event.update({
      where: { id: params.id },
      data: eventUpdate,
      include: {
        client: true,
        package: true,
        photographers: { include: { photographer: true } },
      },
    });

    if (photographerIds !== undefined) {
      await prisma.eventPhotographer.deleteMany({ where: { eventId: params.id } });
      if (photographerIds.length > 0) {
        await prisma.eventPhotographer.createMany({
          data: photographerIds.map((pid) => ({
            eventId: params.id,
            photographerId: pid,
          })),
        });
      }
    }

    if (data.eventDate || data.status) {
      await scheduleEventReminders(params.id);
    }

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN"]);
    const existing = await prisma.event.findFirst({
      where: { id: params.id, studioId: session.studioId! },
    });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
