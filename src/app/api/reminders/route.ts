import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { getPendingReminders, markReminderSent } from "@/lib/reminders";

export async function GET() {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF", "SUPER_ADMIN"]);
    const studioId = session.role === "SUPER_ADMIN" ? undefined : session.studioId!;
    const reminders = await getPendingReminders(studioId);
    return NextResponse.json(reminders);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const { id } = await request.json();
    await markReminderSent(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to mark reminder" }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const events = await prisma.event.findMany({
      where: {
        studioId: session.studioId!,
        status: "SCHEDULED",
        eventDate: { gte: new Date() },
      },
      select: { id: true },
    });

    const { scheduleEventReminders } = await import("@/lib/reminders");
    for (const event of events) {
      await scheduleEventReminders(event.id);
    }

    return NextResponse.json({ scheduled: events.length });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to reschedule reminders" }, { status: 500 });
  }
}
