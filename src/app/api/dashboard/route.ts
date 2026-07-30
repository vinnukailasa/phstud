import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();

    if (session.role === "SUPER_ADMIN") {
      const studios = await prisma.studio.count();
      const activeStudios = await prisma.studio.count({ where: { isActive: true } });
      const totalEvents = await prisma.event.count();
      const totalRevenue = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED" },
      });

      return NextResponse.json({
        studios,
        activeStudios,
        totalEvents,
        totalRevenue: totalRevenue._sum.amount || 0,
      });
    }

    const studioId = session.studioId!;
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const [
      clientCount,
      eventCount,
      upcomingEvents,
      pendingInvoices,
      revenue,
      pendingReminders,
    ] = await Promise.all([
      prisma.client.count({ where: { studioId } }),
      prisma.event.count({ where: { studioId, parentId: null } }),
      prisma.event.findMany({
        where: {
          studioId,
          parentId: null,
          eventDate: { gte: now, lte: weekFromNow },
          status: "SCHEDULED",
        },
        include: { client: { select: { name: true } } },
        orderBy: { eventDate: "asc" },
        take: 5,
      }),
      prisma.invoice.count({
        where: {
          studioId,
          status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "COMPLETED",
          invoice: { studioId },
        },
      }),
      prisma.reminder.count({
        where: { studioId, isSent: false, scheduledFor: { lte: now } },
      }),
    ]);

    return NextResponse.json({
      clientCount,
      eventCount,
      upcomingEvents,
      pendingInvoices,
      revenue: revenue._sum.amount || 0,
      pendingReminders,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
