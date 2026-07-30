"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { PhotographerPicker } from "@/components/PhotographerPicker";
import { formatCurrency, EVENT_TYPE_LABELS, cn } from "@/lib/utils";

const eventTypes = Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

interface SubEventForm {
  key: string;
  id?: string;
  title: string;
  eventType: string;
  eventDate: string;
  location: string;
  price: string;
  photographerIds: string[];
  status: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface BookingEditModalProps {
  bookingId: string | null;
  clients: Client[];
  onClose: () => void;
  onSaved: () => void;
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingEditModal({ bookingId, clients, onClose, onSaved }: BookingEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState("");
  const [pricingMode, setPricingMode] = useState<"LUMP_SUM" | "PER_SUB_EVENT">("LUMP_SUM");
  const [mainEvent, setMainEvent] = useState({
    title: "",
    eventType: "WEDDING",
    eventDate: "",
    location: "",
    lumpSumPrice: "",
    photographerIds: [] as string[],
    notes: "",
  });
  const [subEvents, setSubEvents] = useState<SubEventForm[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("SCHEDULED");

  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((b) => {
        setClientId(b.client.id);
        setPricingMode((b.pricingMode as "LUMP_SUM" | "PER_SUB_EVENT") || "LUMP_SUM");
        setStatus(b.status);
        setMainEvent({
          title: b.title,
          eventType: b.eventType,
          eventDate: toLocalDatetime(b.eventDate),
          location: b.location || "",
          lumpSumPrice: b.price != null ? String(b.price) : "",
          photographerIds: b.photographers?.map((p: { photographer: { id: string } }) => p.photographer.id) ?? [],
          notes: b.notes || "",
        });
        setSubEvents(
          (b.subEvents || []).map((s: {
            id: string;
            title: string;
            eventType: string;
            eventDate: string;
            location: string | null;
            price: number | null;
            status: string;
            photographers: { photographer: { id: string } }[];
          }) => ({
            key: s.id,
            id: s.id,
            title: s.title,
            eventType: s.eventType,
            eventDate: toLocalDatetime(s.eventDate),
            location: s.location || "",
            price: s.price != null ? String(s.price) : "",
            photographerIds: s.photographers?.map((p) => p.photographer.id) ?? [],
            status: s.status,
          }))
        );
        const inv = b.invoices?.[0];
        if (inv?.dueDate) setDueDate(inv.dueDate.slice(0, 10));
      });
  }, [bookingId]);

  const calculatedTotal = useMemo(() => {
    if (pricingMode === "LUMP_SUM") return parseFloat(mainEvent.lumpSumPrice) || 0;
    return subEvents
      .filter((s) => s.status !== "CANCELLED")
      .reduce((sum, e) => sum + (parseFloat(e.price) || 0), 0);
  }, [pricingMode, mainEvent.lumpSumPrice, subEvents]);

  const handleCancelBooking = async () => {
    if (!bookingId || !confirm("Cancel entire booking and all sub-events?")) return;
    setLoading(true);
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setLoading(false);
    onSaved();
    onClose();
  };

  const handleCancelSub = async (subId: string) => {
    if (!bookingId || !confirm("Cancel this sub-event?")) return;
    setLoading(true);
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel_sub", subEventId: subId }),
    });
    setLoading(false);
    onSaved();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) return;
    setError("");
    setLoading(true);

    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        mainEvent: {
          title: mainEvent.title,
          eventType: mainEvent.eventType,
          eventDate: mainEvent.eventDate,
          location: mainEvent.location || undefined,
          pricingMode,
          lumpSumPrice: pricingMode === "LUMP_SUM" ? parseFloat(mainEvent.lumpSumPrice) : undefined,
          photographerIds: mainEvent.photographerIds,
          notes: mainEvent.notes || undefined,
        },
        subEvents: subEvents.map((s) => ({
          id: s.id,
          title: s.title,
          eventType: s.eventType,
          eventDate: s.eventDate,
          location: s.location || undefined,
          price: pricingMode === "PER_SUB_EVENT" ? parseFloat(s.price) || 0 : undefined,
          photographerIds: s.photographerIds,
          status: s.status,
        })),
        dueDate: dueDate || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update");
      setLoading(false);
      return;
    }
    setLoading(false);
    onSaved();
    onClose();
  };

  const addSub = () => {
    setSubEvents([
      ...subEvents,
      {
        key: crypto.randomUUID(),
        title: "",
        eventType: "PRE_WEDDING",
        eventDate: "",
        location: "",
        price: "",
        photographerIds: [],
        status: "SCHEDULED",
      },
    ]);
  };

  return (
    <Modal open={!!bookingId} onClose={onClose} title="Edit Booking" size="lg">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {status === "CANCELLED" && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            This booking is cancelled.
          </div>
        )}

        <Select
          label="Client"
          options={clients.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` }))}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Booking Title" value={mainEvent.title} onChange={(e) => setMainEvent({ ...mainEvent, title: e.target.value })} required />
          <Select label="Type" options={eventTypes} value={mainEvent.eventType} onChange={(e) => setMainEvent({ ...mainEvent, eventType: e.target.value })} />
          <Input label="Primary Date" type="datetime-local" value={mainEvent.eventDate} onChange={(e) => setMainEvent({ ...mainEvent, eventDate: e.target.value })} required />
          <Input label="Location" value={mainEvent.location} onChange={(e) => setMainEvent({ ...mainEvent, location: e.target.value })} />
        </div>

        <PhotographerPicker
          date={mainEvent.eventDate}
          selectedIds={mainEvent.photographerIds}
          onChange={(ids) => setMainEvent({ ...mainEvent, photographerIds: ids })}
          excludeBookingId={bookingId || undefined}
          label="Main Event Photographers"
        />

        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-700">Sub-Events</h4>
          <Button type="button" variant="secondary" className="!py-1 !px-2 !text-xs" onClick={addSub}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>

        {subEvents.map((sub, idx) => (
          <div
            key={sub.key}
            className={cn(
              "rounded-xl border p-3",
              sub.status === "CANCELLED" ? "border-red-100 bg-red-50/50 opacity-60" : "border-slate-100 bg-slate-50/50"
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Sub-Event {idx + 1}
                {sub.status === "CANCELLED" && " (Cancelled)"}
              </span>
              {sub.id && sub.status !== "CANCELLED" && (
                <button type="button" onClick={() => handleCancelSub(sub.id!)} className="text-xs text-red-500 hover:underline">
                  Cancel event
                </button>
              )}
              {!sub.id && (
                <button type="button" onClick={() => setSubEvents(subEvents.filter((s) => s.key !== sub.key))}>
                  <Trash2 className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label="Title" value={sub.title} onChange={(e) => { const n = [...subEvents]; n[idx] = { ...sub, title: e.target.value }; setSubEvents(n); }} />
              <Input label="Date" type="datetime-local" value={sub.eventDate} onChange={(e) => { const n = [...subEvents]; n[idx] = { ...sub, eventDate: e.target.value }; setSubEvents(n); }} />
              {pricingMode === "PER_SUB_EVENT" && (
                <Input label="Price" type="number" value={sub.price} onChange={(e) => { const n = [...subEvents]; n[idx] = { ...sub, price: e.target.value }; setSubEvents(n); }} />
              )}
            </div>
            {sub.eventDate && sub.status !== "CANCELLED" && (
              <div className="mt-2">
                <PhotographerPicker
                  date={sub.eventDate}
                  selectedIds={sub.photographerIds}
                  onChange={(ids) => { const n = [...subEvents]; n[idx] = { ...sub, photographerIds: ids }; setSubEvents(n); }}
                  excludeBookingId={bookingId || undefined}
                  label="Photographers"
                />
              </div>
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <button type="button" onClick={() => setPricingMode("LUMP_SUM")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${pricingMode === "LUMP_SUM" ? "bg-brand text-white" : "bg-slate-100"}`}>
            Lump Sum
          </button>
          <button type="button" onClick={() => setPricingMode("PER_SUB_EVENT")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${pricingMode === "PER_SUB_EVENT" ? "bg-brand text-white" : "bg-slate-100"}`}>
            Per Sub-Event
          </button>
        </div>

        {pricingMode === "LUMP_SUM" && (
          <Input label="Total Price (₹)" type="number" value={mainEvent.lumpSumPrice} onChange={(e) => setMainEvent({ ...mainEvent, lumpSumPrice: e.target.value })} />
        )}

        <Input label="Invoice Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

        <div className="flex justify-between rounded-xl bg-brand/5 px-4 py-3">
          <span className="text-sm font-medium">Invoice Total</span>
          <span className="font-bold text-brand">{formatCurrency(calculatedTotal)}</span>
        </div>

        {error && <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" loading={loading} disabled={status === "CANCELLED"}>Save Changes</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          {status !== "CANCELLED" && (
            <Button type="button" variant="danger" onClick={handleCancelBooking} loading={loading}>
              Cancel Booking
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
