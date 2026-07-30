import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

const reminderSchema = z.object({
  invoiceId: z.string(),
  scheduledFor: z.string(),
  message: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);

    const invoices = await prisma.invoice.findMany({
      where: { studioId: session.studioId! },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        event: {
          select: {
            id: true,
            title: true,
            subEvents: { select: { id: true, title: true, eventDate: true }, orderBy: { eventDate: "asc" } },
          },
        },
        payments: { orderBy: { paymentDate: "desc" } },
        lineItems: true,
        reminders: {
          where: { type: "PAYMENT_DUE" },
          orderBy: { scheduledFor: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = invoices.map((inv) => {
      const paid = inv.payments
        .filter((p) => p.status === "COMPLETED")
        .reduce((s, p) => s + p.amount, 0);
      return {
        ...inv,
        paidAmount: paid,
        balance: inv.total - paid,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const body = await request.json();
    const data = reminderSchema.parse(body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, studioId: session.studioId! },
      include: { client: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const paid = await prisma.payment.aggregate({
      where: { invoiceId: invoice.id, status: "COMPLETED" },
      _sum: { amount: true },
    });
    const balance = invoice.total - (paid._sum.amount ?? 0);

    const reminder = await prisma.reminder.create({
      data: {
        type: "PAYMENT_DUE",
        title: `Payment reminder: ${invoice.invoiceNumber}`,
        message:
          data.message ||
          `Hi ${invoice.client.name}, friendly reminder for invoice ${invoice.invoiceNumber}. Balance due: ₹${balance.toLocaleString("en-IN")}.`,
        scheduledFor: new Date(data.scheduledFor),
        invoiceId: invoice.id,
        eventId: invoice.eventId,
        studioId: session.studioId!,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to schedule reminder" }, { status: 500 });
  }
}
