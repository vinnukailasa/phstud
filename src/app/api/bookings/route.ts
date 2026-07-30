import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { scheduleEventReminders } from "@/lib/reminders";
import { generateInvoiceNumber } from "@/lib/utils";
import { generateShareToken } from "@/lib/share";

const subEventSchema = z.object({
  title: z.string().min(1),
  eventType: z.enum(["PRE_WEDDING", "BEFORE_WEDDING", "WEDDING", "BIRTHDAY", "CUSTOM"]),
  eventDate: z.string(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  price: z.number().min(0).optional(),
  photographerIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const bookingSchema = z.object({
  clientId: z.string().optional(),
  newClient: z
    .object({
      name: z.string().min(2),
      phone: z.string().min(10),
      email: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  mainEvent: z.object({
    title: z.string().min(2),
    eventType: z.enum(["PRE_WEDDING", "BEFORE_WEDDING", "WEDDING", "BIRTHDAY", "CUSTOM"]),
    eventDate: z.string(),
    endDate: z.string().optional(),
    location: z.string().optional(),
    pricingMode: z.enum(["LUMP_SUM", "PER_SUB_EVENT"]),
    lumpSumPrice: z.number().min(0).optional(),
    photographerIds: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
  subEvents: z.array(subEventSchema).default([]),
  dueDate: z.string().optional(),
  discount: z.number().min(0).default(0),
});

const bookingInclude = {
  client: { select: { id: true, name: true, phone: true, email: true } },
  subEvents: {
    include: {
      photographers: { include: { photographer: { select: { id: true, name: true } } } },
    },
    orderBy: { eventDate: "asc" as const },
  },
  photographers: { include: { photographer: { select: { id: true, name: true } } } },
  invoices: {
    include: {
      payments: { where: { status: "COMPLETED" }, orderBy: { paymentDate: "desc" as const } },
      lineItems: true,
    },
  },
};

export async function GET(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const booking = await prisma.event.findFirst({
        where: { id, studioId: session.studioId!, parentId: null },
        include: bookingInclude,
      });
      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      return NextResponse.json(enrichBooking(booking));
    }

    const bookings = await prisma.event.findMany({
      where: { studioId: session.studioId!, parentId: null },
      include: bookingInclude,
      orderBy: { eventDate: "desc" },
    });

    return NextResponse.json(bookings.map(enrichBooking));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const studioId = session.studioId!;
    const body = await request.json();
    const data = bookingSchema.parse(body);

    if (!data.clientId && !data.newClient) {
      return NextResponse.json({ error: "Select a client or create a new one" }, { status: 400 });
    }

    let clientId = data.clientId;
    if (!clientId && data.newClient) {
      const client = await prisma.client.create({
        data: {
          name: data.newClient.name,
          phone: data.newClient.phone,
          email: data.newClient.email || null,
          address: data.newClient.address || null,
          studioId,
        },
      });
      clientId = client.id;
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId!, studioId },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { mainEvent, subEvents, pricingMode } = {
      ...data,
      pricingMode: data.mainEvent.pricingMode,
    };

    if (pricingMode === "LUMP_SUM" && (mainEvent.lumpSumPrice === undefined || mainEvent.lumpSumPrice < 0)) {
      return NextResponse.json({ error: "Enter a total price for lump-sum pricing" }, { status: 400 });
    }

    if (pricingMode === "PER_SUB_EVENT" && subEvents.length === 0) {
      return NextResponse.json({ error: "Add at least one sub-event for per-event pricing" }, { status: 400 });
    }

    const studio = await prisma.studio.findUnique({ where: { id: studioId } });
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const main = await tx.event.create({
        data: {
          title: mainEvent.title,
          eventType: mainEvent.eventType,
          eventDate: new Date(mainEvent.eventDate),
          endDate: mainEvent.endDate ? new Date(mainEvent.endDate) : null,
          location: mainEvent.location,
          notes: mainEvent.notes,
          pricingMode: mainEvent.pricingMode,
          price: mainEvent.pricingMode === "LUMP_SUM" ? mainEvent.lumpSumPrice : null,
          shareToken: generateShareToken(),
          clientId: client!.id,
          studioId,
          photographers: mainEvent.photographerIds?.length
            ? { create: mainEvent.photographerIds.map((pid) => ({ photographerId: pid })) }
            : undefined,
        },
      });

      const createdSubs = [];
      for (const sub of subEvents) {
        const subEvent = await tx.event.create({
          data: {
            title: sub.title,
            eventType: sub.eventType,
            eventDate: new Date(sub.eventDate),
            endDate: sub.endDate ? new Date(sub.endDate) : null,
            location: sub.location,
            notes: sub.notes,
            price: mainEvent.pricingMode === "PER_SUB_EVENT" ? (sub.price ?? 0) : null,
            parentId: main.id,
            clientId: client!.id,
            studioId,
            photographers: sub.photographerIds?.length
              ? { create: sub.photographerIds.map((pid) => ({ photographerId: pid })) }
              : undefined,
          },
        });
        createdSubs.push(subEvent);
      }

      const lineItems: { description: string; quantity: number; unitPrice: number; total: number }[] = [];

      if (mainEvent.pricingMode === "LUMP_SUM") {
        lineItems.push({
          description: `${mainEvent.title} (Package)`,
          quantity: 1,
          unitPrice: mainEvent.lumpSumPrice!,
          total: mainEvent.lumpSumPrice!,
        });
      } else {
        for (const sub of createdSubs) {
          const p = sub.price ?? 0;
          lineItems.push({
            description: sub.title,
            quantity: 1,
            unitPrice: p,
            total: p,
          });
        }
      }

      const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
      const total = subtotal - data.discount;
      const invoiceCount = await tx.invoice.count({ where: { studioId } });

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(studio.slug, invoiceCount),
          shareToken: generateShareToken(),
          subtotal,
          discount: data.discount,
          tax: 0,
          total,
          status: "SENT",
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          clientId: client!.id,
          eventId: main.id,
          studioId,
          lineItems: { create: lineItems },
        },
        include: { lineItems: true, payments: true },
      });

      return { main, createdSubs, invoice };
    });

    await scheduleEventReminders(result.main.id);
    for (const sub of result.createdSubs) {
      await scheduleEventReminders(sub.id);
    }

    const booking = await prisma.event.findFirst({
      where: { id: result.main.id },
      include: bookingInclude,
    });

    return NextResponse.json(enrichBooking(booking!), { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Booking creation error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

function enrichBooking(booking: {
  invoices: {
    id: string;
    invoiceNumber: string;
    total: number;
    status: string;
    payments: { amount: number }[];
  }[];
  subEvents: unknown[];
  price: number | null;
  pricingMode: string | null;
  [key: string]: unknown;
}) {
  const invoice = booking.invoices[0];
  const paid = invoice?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const total = invoice?.total ?? booking.price ?? 0;

  return {
    ...booking,
    invoiceSummary: invoice
      ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total,
          paid,
          balance: total - paid,
          status: invoice.status,
        }
      : null,
    subEventCount: booking.subEvents.length,
  };
}
