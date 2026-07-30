import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { scheduleEventReminders, updateInvoiceStatus } from "@/lib/reminders";
import { Prisma } from "@prisma/client";

const subEventUpdateSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  eventType: z.enum(["PRE_WEDDING", "BEFORE_WEDDING", "WEDDING", "BIRTHDAY", "CUSTOM"]),
  eventDate: z.string(),
  location: z.string().optional(),
  price: z.number().min(0).optional(),
  photographerIds: z.array(z.string()).optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

const updateSchema = z.object({
  action: z.enum(["update", "cancel", "cancel_sub"]).optional(),
  subEventId: z.string().optional(),
  clientId: z.string().optional(),
  mainEvent: z
    .object({
      title: z.string().min(2).optional(),
      eventType: z.enum(["PRE_WEDDING", "BEFORE_WEDDING", "WEDDING", "BIRTHDAY", "CUSTOM"]).optional(),
      eventDate: z.string().optional(),
      location: z.string().optional(),
      pricingMode: z.enum(["LUMP_SUM", "PER_SUB_EVENT"]).optional(),
      lumpSumPrice: z.number().min(0).optional(),
      photographerIds: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
    .optional(),
  subEvents: z.array(subEventUpdateSchema).optional(),
  dueDate: z.string().optional().nullable(),
  discount: z.number().min(0).optional(),
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
  invoices: { include: { payments: true, lineItems: true } },
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const booking = await prisma.event.findFirst({
      where: { id: params.id, studioId: session.studioId!, parentId: null },
      include: bookingInclude,
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const studioId = session.studioId!;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const main = await prisma.event.findFirst({
      where: { id: params.id, studioId, parentId: null },
      include: { subEvents: true, invoices: { include: { payments: true, lineItems: true } } },
    });
    if (!main) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (data.action === "cancel") {
      await prisma.event.updateMany({
        where: { OR: [{ id: main.id }, { parentId: main.id }] },
        data: { status: "CANCELLED" },
      });
      const invoice = main.invoices[0];
      if (invoice) {
        const paid = invoice.payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);
        if (paid === 0) {
          await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "CANCELLED" } });
        }
      }
      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    if (data.action === "cancel_sub" && data.subEventId) {
      const sub = main.subEvents.find((s) => s.id === data.subEventId);
      if (!sub) {
        return NextResponse.json({ error: "Sub-event not found" }, { status: 404 });
      }
      await prisma.event.update({ where: { id: sub.id }, data: { status: "CANCELLED" } });
      await syncInvoiceFromBooking(main.id, studioId);
      return NextResponse.json({ success: true });
    }

    await prisma.$transaction(async (tx) => {
      if (data.clientId) {
        await tx.event.updateMany({
          where: { OR: [{ id: main.id }, { parentId: main.id }] },
          data: { clientId: data.clientId },
        });
      }

      const pricingMode = data.mainEvent?.pricingMode ?? main.pricingMode ?? "LUMP_SUM";

      if (data.mainEvent) {
        const me = data.mainEvent;
        await tx.event.update({
          where: { id: main.id },
          data: {
            title: me.title,
            eventType: me.eventType,
            eventDate: me.eventDate ? new Date(me.eventDate) : undefined,
            location: me.location,
            notes: me.notes,
            pricingMode: me.pricingMode,
            price: pricingMode === "LUMP_SUM" ? me.lumpSumPrice : null,
          },
        });

        if (me.photographerIds !== undefined) {
          await tx.eventPhotographer.deleteMany({ where: { eventId: main.id } });
          if (me.photographerIds.length > 0) {
            await tx.eventPhotographer.createMany({
              data: me.photographerIds.map((pid) => ({ eventId: main.id, photographerId: pid })),
            });
          }
        }
      }

      if (data.subEvents) {
        const existingIds = main.subEvents.map((s) => s.id);
        const incomingIds = data.subEvents.filter((s) => s.id).map((s) => s.id!);
        const toRemove = existingIds.filter((id) => !incomingIds.includes(id));
        if (toRemove.length > 0) {
          await tx.event.updateMany({
            where: { id: { in: toRemove } },
            data: { status: "CANCELLED" },
          });
        }

        for (const sub of data.subEvents) {
          const subData = {
            title: sub.title,
            eventType: sub.eventType,
            eventDate: new Date(sub.eventDate),
            location: sub.location,
            price: pricingMode === "PER_SUB_EVENT" ? (sub.price ?? 0) : null,
            status: sub.status ?? "SCHEDULED",
          };

          let eventId: string;
          if (sub.id) {
            await tx.event.update({ where: { id: sub.id }, data: subData });
            eventId = sub.id;
          } else {
            const created = await tx.event.create({
              data: { ...subData, parentId: main.id, clientId: data.clientId ?? main.clientId, studioId },
            });
            eventId = created.id;
          }

          if (sub.photographerIds !== undefined) {
            await tx.eventPhotographer.deleteMany({ where: { eventId } });
            if (sub.photographerIds.length > 0) {
              await tx.eventPhotographer.createMany({
                data: sub.photographerIds.map((pid) => ({ eventId, photographerId: pid })),
              });
            }
          }
        }
      }

      const invoice = main.invoices[0];
      if (invoice && (data.mainEvent || data.subEvents || data.discount !== undefined)) {
        await rebuildInvoice(tx, main.id, invoice.id, data.discount ?? invoice.discount, pricingMode);
      } else if (invoice && data.dueDate !== undefined) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { dueDate: data.dueDate ? new Date(data.dueDate) : null },
        });
      }
    });

    await scheduleEventReminders(main.id);
    const subs = await prisma.event.findMany({ where: { parentId: main.id, status: { not: "CANCELLED" } } });
    for (const s of subs) await scheduleEventReminders(s.id);

    const updated = await prisma.event.findFirst({
      where: { id: main.id },
      include: bookingInclude,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Booking update error:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

async function rebuildInvoice(
  tx: Prisma.TransactionClient,
  mainEventId: string,
  invoiceId: string,
  discount: number,
  pricingMode: string
) {
  const main = await tx.event.findUnique({ where: { id: mainEventId } });
  const subs = await tx.event.findMany({
    where: { parentId: mainEventId, status: { not: "CANCELLED" } },
    orderBy: { eventDate: "asc" },
  });

  const lineItems: { description: string; quantity: number; unitPrice: number; total: number }[] = [];

  if (pricingMode === "LUMP_SUM") {
    lineItems.push({
      description: `${main!.title} (Package)`,
      quantity: 1,
      unitPrice: main!.price ?? 0,
      total: main!.price ?? 0,
    });
  } else {
    for (const sub of subs) {
      const p = sub.price ?? 0;
      lineItems.push({ description: sub.title, quantity: 1, unitPrice: p, total: p });
    }
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
  const total = subtotal - discount;

  await tx.invoiceLineItem.deleteMany({ where: { invoiceId } });
  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      discount,
      total,
      lineItems: { create: lineItems },
    },
  });

  await updateInvoiceStatus(invoiceId);
}

async function syncInvoiceFromBooking(mainEventId: string, studioId: string) {
  const main = await prisma.event.findFirst({
    where: { id: mainEventId, studioId },
    include: { invoices: true },
  });
  if (!main?.invoices[0]) return;
  await prisma.$transaction(async (tx) => {
    await rebuildInvoice(tx, mainEventId, main.invoices[0].id, main.invoices[0].discount, main.pricingMode ?? "PER_SUB_EVENT");
  });
}
