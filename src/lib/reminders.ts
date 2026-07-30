import { prisma } from "./prisma";
import { addDays, subDays } from "date-fns";
import type { ReminderType, InvoiceStatus } from "./types";

export async function scheduleEventReminders(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      client: true,
      studio: true,
    },
  });

  if (!event) return;

  const { studio, client } = event;
  const reminders: {
    type: ReminderType;
    title: string;
    message: string;
    scheduledFor: Date;
    eventId: string;
    studioId: string;
  }[] = [];

  // Pre-event client reminder
  reminders.push({
    type: "PRE_EVENT_CLIENT",
    title: `Upcoming: ${event.title}`,
    message: `Hi ${client.name}, your ${event.title} is scheduled on ${event.eventDate.toLocaleDateString()}.${event.location ? ` Location: ${event.location}` : ""}`,
    scheduledFor: subDays(event.eventDate, studio.preEventReminderDays),
    eventId: event.id,
    studioId: studio.id,
  });

  // Pre-event studio reminder
  reminders.push({
    type: "PRE_EVENT_STUDIO",
    title: `Event in ${studio.preEventReminderDays} days: ${event.title}`,
    message: `Client: ${client.name} | Date: ${event.eventDate.toLocaleDateString()}${event.location ? ` | Location: ${event.location}` : ""}`,
    scheduledFor: subDays(event.eventDate, studio.preEventReminderDays),
    eventId: event.id,
    studioId: studio.id,
  });

  // Post-event client reminder
  reminders.push({
    type: "POST_EVENT_CLIENT",
    title: `Thank you - ${event.title}`,
    message: `Hi ${client.name}, thank you for choosing ${studio.name}! We hope you loved your ${event.title}. We'd love your feedback.`,
    scheduledFor: addDays(event.eventDate, studio.postEventReminderDays),
    eventId: event.id,
    studioId: studio.id,
  });

  // Remove old unsent reminders for this event
  await prisma.reminder.deleteMany({
    where: { eventId: event.id, isSent: false },
  });

  await prisma.reminder.createMany({ data: reminders });
}

export async function getPendingReminders(studioId?: string) {
  const now = new Date();
  return prisma.reminder.findMany({
    where: {
      isSent: false,
      scheduledFor: { lte: now },
      ...(studioId ? { studioId } : {}),
    },
    include: {
      event: { include: { client: true } },
      invoice: { include: { client: true } },
      studio: true,
    },
    orderBy: { scheduledFor: "asc" },
  });
}

export async function markReminderSent(id: string) {
  return prisma.reminder.update({
    where: { id },
    data: { isSent: true, sentAt: new Date() },
  });
}

export async function updateInvoiceStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) return;

  const paid = invoice.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);

  let status: InvoiceStatus = invoice.status as InvoiceStatus;

  if (invoice.status !== "CANCELLED" && invoice.status !== "DRAFT") {
    if (paid >= invoice.total) {
      status = "PAID";
    } else if (paid > 0) {
      status = "PARTIALLY_PAID";
    } else if (invoice.dueDate && new Date() > invoice.dueDate) {
      status = "OVERDUE";
    }
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status },
  });
}
