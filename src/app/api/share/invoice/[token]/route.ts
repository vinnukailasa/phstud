import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { shareToken: params.token },
    include: {
      client: true,
      studio: true,
      event: {
        include: {
          subEvents: {
            where: { status: { not: "CANCELLED" } },
            orderBy: { eventDate: "asc" },
          },
        },
      },
      lineItems: true,
      payments: { where: { status: "COMPLETED" }, orderBy: { paymentDate: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);

  return NextResponse.json({
    type: "invoice",
    studio: {
      name: invoice.studio.name,
      phone: invoice.studio.phone,
      address: invoice.studio.address,
      upiId: invoice.studio.upiId,
      payeeName: invoice.studio.payeeName || invoice.studio.name,
    },
    invoice: {
      number: invoice.invoiceNumber,
      status: invoice.status,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax: invoice.tax,
      total: invoice.total,
      paid,
      balance: invoice.total - paid,
      lineItems: invoice.lineItems,
      payments: invoice.payments,
    },
    client: { name: invoice.client.name, phone: invoice.client.phone, email: invoice.client.email },
    booking: invoice.event
      ? {
          title: invoice.event.title,
          eventDate: invoice.event.eventDate,
          location: invoice.event.location,
          subEvents: invoice.event.subEvents,
        }
      : null,
  });
}
