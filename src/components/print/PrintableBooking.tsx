"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDateTime, EVENT_TYPE_LABELS } from "@/lib/utils";

interface BookingPrintData {
  studio: { name: string; phone: string | null; address: string | null; upiId?: string | null };
  booking: {
    title: string;
    eventType: string;
    eventDate: string;
    location: string | null;
    status: string;
    photographers: string[];
    subEvents: {
      title: string;
      eventType: string;
      eventDate: string;
      location: string | null;
      photographers?: { photographer: { name: string } }[];
    }[];
  };
  client: { name: string; phone: string };
  invoice: {
    id?: string;
    number: string;
    shareToken?: string | null;
    total: number;
    paid: number;
    balance: number;
    lineItems: { description: string; total: number }[];
    payments: { paymentType: string; amount: number; paymentDate: string }[];
  } | null;
}

export function PrintableBooking({ token }: { token: string }) {
  const [data, setData] = useState<BookingPrintData | null>(null);

  useEffect(() => {
    fetch(`/api/share/booking/${token}`).then((r) => r.json()).then(setData);
  }, [token]);

  if (!data) return <div className="p-8 text-center">Loading…</div>;

  const { studio, booking, client, invoice } = data;
  const qrUrl =
    invoice && invoice.balance > 0 && studio.upiId
      ? invoice.id
        ? `/api/qr?invoiceId=${invoice.id}`
        : invoice.shareToken
          ? `/api/qr?token=${invoice.shareToken}`
          : null
      : null;

  return (
    <div className="print-document mx-auto max-w-2xl bg-white p-8 text-slate-900">
      <header className="border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-bold">{studio.name}</h1>
        {studio.address && <p className="text-sm text-slate-600">{studio.address}</p>}
        {studio.phone && <p className="text-sm">Tel: {studio.phone}</p>}
      </header>

      <div className="mt-6 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">Booking Confirmation</p>
        <h2 className="mt-1 text-2xl font-bold">{booking.title}</h2>
        {booking.status === "CANCELLED" && (
          <span className="mt-2 inline-block rounded bg-red-100 px-3 py-1 text-sm text-red-700">CANCELLED</span>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-xs uppercase text-slate-500">Client</p>
          <p className="font-semibold">{client.name}</p>
          <p>{client.phone}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Primary Event</p>
          <p>{EVENT_TYPE_LABELS[booking.eventType] || booking.eventType}</p>
          <p className="font-medium">{formatDateTime(booking.eventDate)}</p>
          {booking.location && <p className="text-slate-600">{booking.location}</p>}
        </div>
      </div>

      {booking.photographers.length > 0 && (
        <p className="mt-4 text-sm"><span className="text-slate-500">Photographers:</span> {booking.photographers.join(", ")}</p>
      )}

      {booking.subEvents.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Event Schedule</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500">
                <th className="py-2">Event</th>
                <th className="py-2">Date & Time</th>
                <th className="py-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {booking.subEvents.map((s, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 font-medium">{s.title}</td>
                  <td className="py-2">{formatDateTime(s.eventDate)}</td>
                  <td className="py-2 text-slate-600">{s.location || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invoice && (
        <div className="mt-8 border-t pt-6">
          <p className="text-xs uppercase text-slate-500">Payment Summary</p>
          <p className="font-mono font-semibold">{invoice.number}</p>
          <div className="mt-3 space-y-1 text-sm">
            {invoice.lineItems.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>{item.description}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t pt-3 text-sm">
            <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
            <div className="flex justify-between text-emerald-700"><span>Paid</span><span>{formatCurrency(invoice.paid)}</span></div>
            {invoice.balance > 0 && (
              <div className="flex justify-between text-lg font-bold text-amber-700">
                <span>Balance Due</span><span>{formatCurrency(invoice.balance)}</span>
              </div>
            )}
          </div>
          {qrUrl && (
            <div className="mt-6 flex flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-6">
              <p className="mb-1 text-sm font-semibold uppercase">Scan to Pay via UPI</p>
              <p className="mb-4 text-xs text-slate-500">{studio.upiId} · Pay {formatCurrency(invoice.balance)}</p>
              <img src={qrUrl} alt="UPI QR Code" width={180} height={180} className="rounded-lg" />
              <p className="mt-2 font-mono text-[10px] tracking-widest">{invoice.number}</p>
            </div>
          )}
        </div>
      )}

      <footer className="mt-8 text-center text-xs text-slate-400">
        {studio.name} · We look forward to your event!
      </footer>
    </div>
  );
}
