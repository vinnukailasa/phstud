import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";
import { updateInvoiceStatus } from "@/lib/reminders";

const invoiceSchema = z.object({
  clientId: z.string(),
  eventId: z.string().optional(),
  dueDate: z.string().optional(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  notes: z.string().optional(),
  showSubEvents: z.boolean().default(false),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().min(1).default(1),
      unitPrice: z.number().min(0),
    })
  ).min(1),
});

export async function GET() {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const invoices = await prisma.invoice.findMany({
      where: { studioId: session.studioId! },
      include: {
        client: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
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
    const data = invoiceSchema.parse(body);

    const studio = await prisma.studio.findUnique({
      where: { id: session.studioId! },
    });
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }

    const count = await prisma.invoice.count({ where: { studioId: studio.id } });
    const subtotal = data.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const total = subtotal - data.discount + data.tax;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(studio.slug, count),
        subtotal,
        discount: data.discount,
        tax: data.tax,
        total,
        status: "SENT",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes,
        showSubEvents: data.showSubEvents,
        clientId: data.clientId,
        eventId: data.eventId,
        studioId: studio.id,
        lineItems: {
          create: data.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        client: true,
        lineItems: true,
        payments: true,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
