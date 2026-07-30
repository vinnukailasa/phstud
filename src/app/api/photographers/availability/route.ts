import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

function dayBounds(dateStr: string) {
  const date = new Date(dateStr);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const excludeBookingId = searchParams.get("excludeBookingId");

    if (!date) {
      return NextResponse.json({ error: "date parameter required" }, { status: 400 });
    }

    const { start, end } = dayBounds(date);
    const studioId = session.studioId!;

    let excludeEventIds: string[] = [];
    if (excludeBookingId) {
      const booking = await prisma.event.findFirst({
        where: { id: excludeBookingId, studioId },
        include: { subEvents: { select: { id: true } } },
      });
      if (booking) {
        excludeEventIds = [booking.id, ...booking.subEvents.map((s) => s.id)];
      }
    }

    const photographers = await prisma.photographer.findMany({
      where: { studioId, isActive: true },
      orderBy: { name: "asc" },
    });

    const assignments = await prisma.eventPhotographer.findMany({
      where: {
        photographer: { studioId, isActive: true },
        event: {
          status: { not: "CANCELLED" },
          eventDate: { gte: start, lte: end },
          ...(excludeEventIds.length > 0 ? { id: { notIn: excludeEventIds } } : {}),
        },
      },
      include: {
        photographer: { select: { id: true, name: true } },
        event: { select: { id: true, title: true, eventDate: true } },
      },
    });

    const busyMap: Record<string, { eventId: string; eventTitle: string }[]> = {};
    for (const a of assignments) {
      if (!busyMap[a.photographerId]) busyMap[a.photographerId] = [];
      busyMap[a.photographerId].push({
        eventId: a.event.id,
        eventTitle: a.event.title,
      });
    }

    const result = photographers.map((p) => ({
      id: p.id,
      name: p.name,
      specialty: p.specialty,
      available: !busyMap[p.id]?.length,
      bookings: busyMap[p.id] ?? [],
    }));

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 });
  }
}
