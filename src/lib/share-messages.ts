import { formatDate, formatDateTime, PAYMENT_TYPE_LABELS } from "./utils";
import { formatCurrencyPlain } from "./share";

interface ShareInvoiceInput {
  studioName: string;
  studioPhone?: string | null;
  invoiceNumber: string;
  clientName: string;
  eventTitle?: string | null;
  lineItems: { description: string; total: number }[];
  total: number;
  paid: number;
  balance: number;
  dueDate?: string | null;
  payments: { paymentType: string; amount: number; paymentDate: string }[];
  shareUrl?: string;
}

export function formatInvoiceWhatsAppMessage(data: ShareInvoiceInput) {
  const lines = [
    `📸 *${data.studioName}*`,
    ``,
    `*INVOICE: ${data.invoiceNumber}*`,
    `Client: ${data.clientName}`,
    data.eventTitle ? `Booking: ${data.eventTitle}` : "",
    ``,
    `*Details:*`,
    ...data.lineItems.map((i) => `• ${i.description} — ${formatCurrencyPlain(i.total)}`),
    ``,
    `*Total:* ${formatCurrencyPlain(data.total)}`,
    `*Paid:* ${formatCurrencyPlain(data.paid)}`,
    `*Balance Due:* ${formatCurrencyPlain(data.balance)}`,
    data.dueDate ? `Due Date: ${formatDate(data.dueDate)}` : "",
  ];

  if (data.payments.length > 0) {
    lines.push(``, `*Payment History:*`);
    for (const p of data.payments) {
      lines.push(
        `• ${PAYMENT_TYPE_LABELS[p.paymentType] || p.paymentType}: ${formatCurrencyPlain(p.amount)} (${formatDate(p.paymentDate)})`
      );
    }
  }

  if (data.balance > 0) {
    lines.push(``, `Please pay the balance at your earliest convenience. Thank you! 🙏`);
  }

  if (data.shareUrl) {
    lines.push(``, `View & print: ${data.shareUrl}`);
  }

  return lines.filter((l) => l !== "").join("\n");
}

interface ShareBookingInput {
  studioName: string;
  title: string;
  clientName: string;
  clientPhone: string;
  eventDate: string;
  location?: string | null;
  subEvents: { title: string; eventDate: string; location?: string | null }[];
  invoiceNumber?: string;
  total?: number;
  paid?: number;
  balance?: number;
  shareUrl?: string;
}

export function formatBookingWhatsAppMessage(data: ShareBookingInput) {
  const lines = [
    `📸 *${data.studioName}*`,
    ``,
    `*BOOKING CONFIRMATION*`,
    `*${data.title}*`,
    ``,
    `Client: ${data.clientName}`,
    `Primary Date: ${formatDateTime(data.eventDate)}`,
    data.location ? `Location: ${data.location}` : "",
  ];

  if (data.subEvents.length > 0) {
    lines.push(``, `*Schedule:*`);
    for (const s of data.subEvents) {
      lines.push(`• ${s.title} — ${formatDateTime(s.eventDate)}${s.location ? ` @ ${s.location}` : ""}`);
    }
  }

  if (data.invoiceNumber) {
    lines.push(
      ``,
      `*Invoice:* ${data.invoiceNumber}`,
      data.total != null ? `Total: ${formatCurrencyPlain(data.total)}` : "",
      data.paid != null ? `Paid: ${formatCurrencyPlain(data.paid)}` : "",
      data.balance != null && data.balance > 0 ? `*Balance Due: ${formatCurrencyPlain(data.balance)}*` : ""
    );
  }

  lines.push(``, `We look forward to capturing your special moments! ✨`);

  if (data.shareUrl) {
    lines.push(``, `View details: ${data.shareUrl}`);
  }

  return lines.filter((l) => l !== "").join("\n");
}
