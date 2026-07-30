import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const booking = await prisma.event.findUnique({
    where: { shareToken: params.token, parentId: null },
    include: {
      client: true,
      studio: true,
      subEvents: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { eventDate: "asc" },
        include: {
          photographers: { include: { photographer: { select: { name: true } } } },
        },
      },
      photographers: { include: { photographer: { select: { name: true } } } },
      invoices: {
        include: {
          payments: { where: { status: "COMPLETED" } },
          lineItems: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invoice = booking.invoices[0];
  const paid = invoice?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;

  return NextResponse.json({
    type: "booking",
    studio: {
      name: booking.studio.name,
      phone: booking.studio.phone,
      address: booking.studio.address,
      upiId: booking.studio.upiId,
      payeeName: booking.studio.payeeName || booking.studio.name,
    },
    booking: {
      title: booking.title,
      eventType: booking.eventType,
      eventDate: booking.eventDate,
      location: booking.location,
      status: booking.status,
      subEvents: booking.subEvents,
      photographers: booking.photographers.map((p) => p.photographer.name),
    },
    client: { name: booking.client.name, phone: booking.client.phone },
    invoice: invoice
      ? {
          id: invoice.id,
          number: invoice.invoiceNumber,
          total: invoice.total,
          paid,
          balance: invoice.total - paid,
          lineItems: invoice.lineItems,
          payments: invoice.payments,
          dueDate: invoice.dueDate,
          shareToken: invoice.shareToken,
        }
      : null,
  });
}
