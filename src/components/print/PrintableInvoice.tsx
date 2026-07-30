"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, formatDateTime, PAYMENT_TYPE_LABELS } from "@/lib/utils";

interface PrintData {
  studio: {
    name: string;
    phone: string | null;
    address: string | null;
    upiId: string | null;
    payeeName: string;
  };
  invoice: {
    id?: string;
    number: string;
    dueDate: string | null;
    subtotal: number;
    discount: number;
    total: number;
    paid: number;
    balance: number;
    lineItems: { description: string; total: number }[];
    payments: { paymentType: string; amount: number; paymentDate: string }[];
  };
  client: { name: string; phone: string; email?: string | null };
  booking: {
    title: string;
    eventDate: string;
    location: string | null;
  } | null;
  shareToken?: string;
}

export function PrintableInvoice({ token, invoiceId }: { token?: string; invoiceId?: string }) {
  const [data, setData] = useState<PrintData | null>(null);

  useEffect(() => {
    if (token) {
      fetch(`/api/share/invoice/${token}`)
        .then((r) => r.json())
        .then((d) =>
          setData({
            studio: { ...d.studio, payeeName: d.studio.payeeName || d.studio.name },
            invoice: {
              number: d.invoice.number,
              dueDate: d.invoice.dueDate,
              subtotal: d.invoice.subtotal,
              discount: d.invoice.discount,
              total: d.invoice.total,
              paid: d.invoice.paid,
              balance: d.invoice.balance,
              lineItems: d.invoice.lineItems,
              payments: d.invoice.payments,
            },
            client: d.client,
            booking: d.booking,
            shareToken: token,
          })
        );
    } else if (invoiceId) {
      fetch(`/api/invoices/${invoiceId}`)
        .then((r) => r.json())
        .then((d) => {
          const paid = d.paidAmount ?? 0;
          setData({
            studio: {
              name: d.studio.name,
              phone: d.studio.phone,
              address: d.studio.address,
              upiId: d.studio.upiId,
              payeeName: d.studio.payeeName || d.studio.name,
            },
            invoice: {
              id: d.id,
              number: d.invoiceNumber,
              dueDate: d.dueDate,
              subtotal: d.subtotal,
              discount: d.discount,
              total: d.total,
              paid,
              balance: d.balance ?? d.total - paid,
              lineItems: d.lineItems,
              payments: d.payments.filter((p: { status: string }) => p.status === "COMPLETED"),
            },
            client: d.client,
            booking: d.event
              ? { title: d.event.title, eventDate: d.event.eventDate, location: d.event.location }
              : null,
          });
        });
    }
  }, [token, invoiceId]);

  if (!data) return <div className="p-8 text-center text-slate-500">Loading…</div>;

  const { studio, invoice, client, booking } = data;
  const qrUrl = invoice.balance > 0 && studio.upiId
    ? invoice.id
      ? `/api/qr?invoiceId=${invoice.id}`
      : `/api/qr?token=${data.shareToken}`
    : null;

  return (
    <div className="print-document mx-auto max-w-2xl bg-white p-8 text-slate-900">
      <header className="border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-bold">{studio.name}</h1>
        {studio.address && <p className="text-sm text-slate-600">{studio.address}</p>}
        {studio.phone && <p className="text-sm text-slate-600">Tel: {studio.phone}</p>}
      </header>

      <div className="mt-6 flex justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Bill To</p>
          <p className="font-semibold">{client.name}</p>
          <p className="text-sm">{client.phone}</p>
          {client.email && <p className="text-sm text-slate-600">{client.email}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">INVOICE</p>
          <p className="font-mono text-lg">{invoice.number}</p>
          {invoice.dueDate && <p className="text-sm text-slate-600">Due: {formatDate(invoice.dueDate)}</p>}
        </div>
      </div>

      {booking && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium">{booking.title}</p>
          <p className="text-slate-600">{formatDateTime(booking.eventDate)}</p>
          {booking.location && <p className="text-slate-600">{booking.location}</p>}
        </div>
      )}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2">{item.description}</td>
              <td className="py-2 text-right">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-56 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
          {invoice.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(invoice.discount)}</span></div>}
          <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold">
            <span>Total</span><span>{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-emerald-700"><span>Paid</span><span>{formatCurrency(invoice.paid)}</span></div>
          <div className="flex justify-between text-lg font-bold text-amber-700">
            <span>Balance Due</span><span>{formatCurrency(invoice.balance)}</span>
          </div>
        </div>
      </div>

      {invoice.payments.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Payment History</p>
          {invoice.payments.map((p, i) => (
            <div key={i} className="flex justify-between border-b border-slate-100 py-1.5 text-sm">
              <span>{PAYMENT_TYPE_LABELS[p.paymentType] || p.paymentType} · {formatDate(p.paymentDate)}</span>
              <span className="font-medium text-emerald-700">+{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {qrUrl && (
        <div className="mt-8 flex flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-6">
          <p className="mb-1 text-sm font-semibold uppercase">Scan to Pay via UPI</p>
          <p className="mb-4 text-xs text-slate-500">{studio.upiId} · Pay {formatCurrency(invoice.balance)}</p>
          <img src={qrUrl} alt="UPI QR Code" width={200} height={200} className="rounded-lg" />
          <InvoiceBarcode value={invoice.number} />
        </div>
      )}

      <footer className="mt-8 border-t pt-4 text-center text-xs text-slate-400">
        Thank you for your business · {studio.name}
      </footer>
    </div>
  );
}

function InvoiceBarcode({ value }: { value: string }) {
  return (
    <div className="mt-4 flex flex-col items-center">
      <div className="flex items-end gap-px">
        {value.split("").map((c, i) => (
          <div key={i} className="bg-slate-800" style={{ width: (c.charCodeAt(0) % 3) + 1, height: 36 }} />
        ))}
      </div>
      <p className="mt-1 font-mono text-[10px] tracking-widest">{value}</p>
    </div>
  );
}
