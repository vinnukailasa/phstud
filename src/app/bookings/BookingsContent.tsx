"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  UserPlus,
  Calendar,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  MapPin,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PhotographerPicker } from "@/components/PhotographerPicker";
import { BookingEditModal } from "@/components/BookingEditModal";
import { SharePrintActions } from "@/components/SharePrintActions";
import { formatBookingWhatsAppMessage } from "@/lib/share-messages";
import {
  formatCurrency,
  formatDate,
  EVENT_TYPE_LABELS,
} from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
}

interface Photographer {
  id: string;
  name: string;
}

interface SubEventForm {
  key: string;
  title: string;
  eventType: string;
  eventDate: string;
  location: string;
  price: string;
  photographerIds: string[];
}

interface Booking {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  location: string | null;
  pricingMode: string | null;
  status: string;
  client: { id?: string; name: string; phone: string };
  subEvents: { id: string; title: string; eventDate: string; price: number | null; location?: string | null }[];
  invoiceSummary: {
    id: string;
    invoiceNumber: string;
    total: number;
    paid: number;
    balance: number;
    status: string;
  } | null;
}

const eventTypes = Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const emptySubEvent = (): SubEventForm => ({
  key: crypto.randomUUID(),
  title: "",
  eventType: "PRE_WEDDING",
  eventDate: "",
  location: "",
  price: "",
  photographerIds: [],
});

export default function BookingsContent() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientModal, setClientModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const [studioName, setStudioName] = useState("Photo Studio");

  const [clientId, setClientId] = useState("");
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
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
  const [subEvents, setSubEvents] = useState<SubEventForm[]>([emptySubEvent()]);
  const [dueDate, setDueDate] = useState("");

  const fetchData = () => {
    Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/photographers").then((r) => r.json()),
    ]).then(([b, c, p]) => {
      setBookings(Array.isArray(b) ? b : []);
      setClients(c);
      setPhotographers(p);
    });
  };

  useEffect(() => {
    fetchData();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.studio?.name) setStudioName(d.user.studio.name);
      });
  }, []);

  const calculatedTotal = useMemo(() => {
    if (pricingMode === "LUMP_SUM") {
      return parseFloat(mainEvent.lumpSumPrice) || 0;
    }
    return subEvents.reduce((s, e) => s + (parseFloat(e.price) || 0), 0);
  }, [pricingMode, mainEvent.lumpSumPrice, subEvents]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient),
    });
    if (res.ok) {
      const client = await res.json();
      setClients((prev) => [client, ...prev]);
      setClientId(client.id);
      setClientModal(false);
      setNewClient({ name: "", phone: "", email: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      clientId: clientId || undefined,
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
      subEvents: subEvents
        .filter((s) => s.title && s.eventDate)
        .map((s) => ({
          title: s.title,
          eventType: s.eventType,
          eventDate: s.eventDate,
          location: s.location || undefined,
          price: pricingMode === "PER_SUB_EVENT" ? parseFloat(s.price) || 0 : undefined,
          photographerIds: s.photographerIds,
        })),
      dueDate: dueDate || undefined,
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create booking");
      setLoading(false);
      return;
    }

    setShowForm(false);
    setClientId("");
    setMainEvent({ title: "", eventType: "WEDDING", eventDate: "", location: "", lumpSumPrice: "", photographerIds: [], notes: "" });
    setSubEvents([emptySubEvent()]);
    setDueDate("");
    fetchData();
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bookings</h1>
          <p className="text-slate-500">Client, events & invoicing in one place</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Booking
          </Button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Client */}
          <Card title="1. Select Client">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Select
                  label="Client"
                  options={[
                    { value: "", label: "Choose a client..." },
                    ...clients.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` })),
                  ]}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                />
              </div>
              <Button type="button" variant="secondary" onClick={() => setClientModal(true)}>
                <UserPlus className="h-4 w-4" /> New Client
              </Button>
            </div>
          </Card>

          {/* Step 2: Main Event */}
          <Card title="2. Main Event">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Booking Title *"
                placeholder="e.g. Raj & Priya Wedding"
                value={mainEvent.title}
                onChange={(e) => setMainEvent({ ...mainEvent, title: e.target.value })}
                required
              />
              <Select
                label="Event Type"
                options={eventTypes}
                value={mainEvent.eventType}
                onChange={(e) => setMainEvent({ ...mainEvent, eventType: e.target.value })}
              />
              <Input
                label="Primary Date *"
                type="datetime-local"
                value={mainEvent.eventDate}
                onChange={(e) => setMainEvent({ ...mainEvent, eventDate: e.target.value })}
                required
              />
              <Input
                label="Location"
                placeholder="Venue or address"
                value={mainEvent.location}
                onChange={(e) => setMainEvent({ ...mainEvent, location: e.target.value })}
              />
            </div>
            {photographers.length > 0 && (
              <div className="mt-4">
                <PhotographerPicker
                  label="Photographers (main event)"
                  date={mainEvent.eventDate}
                  selectedIds={mainEvent.photographerIds}
                  onChange={(ids) => setMainEvent({ ...mainEvent, photographerIds: ids })}
                />
              </div>
            )}
          </Card>

          {/* Step 3: Sub Events */}
          <Card
            title="3. Sub-Events"
            action={
              <Button type="button" variant="secondary" className="!py-1.5 !px-3 !text-xs" onClick={() => setSubEvents([...subEvents, emptySubEvent()])}>
                <Plus className="h-3 w-3" /> Add Sub-Event
              </Button>
            }
          >
            <p className="mb-4 text-sm text-slate-500">
              Add individual shoots or ceremonies (Pre-Wedding, Mehndi, Reception, etc.)
            </p>
            <div className="space-y-4">
              {subEvents.map((sub, idx) => (
                <div key={sub.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Sub-Event {idx + 1}</span>
                    {subEvents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSubEvents(subEvents.filter((s) => s.key !== sub.key))}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Input
                      label="Title"
                      placeholder="Pre-Wedding Shoot"
                      value={sub.title}
                      onChange={(e) => {
                        const next = [...subEvents];
                        next[idx] = { ...sub, title: e.target.value };
                        setSubEvents(next);
                      }}
                    />
                    <Select
                      label="Type"
                      options={eventTypes}
                      value={sub.eventType}
                      onChange={(e) => {
                        const next = [...subEvents];
                        next[idx] = { ...sub, eventType: e.target.value };
                        setSubEvents(next);
                      }}
                    />
                    <Input
                      label="Date"
                      type="datetime-local"
                      value={sub.eventDate}
                      onChange={(e) => {
                        const next = [...subEvents];
                        next[idx] = { ...sub, eventDate: e.target.value };
                        setSubEvents(next);
                      }}
                    />
                    <Input
                      label="Location"
                      value={sub.location}
                      onChange={(e) => {
                        const next = [...subEvents];
                        next[idx] = { ...sub, location: e.target.value };
                        setSubEvents(next);
                      }}
                    />
                    {pricingMode === "PER_SUB_EVENT" && (
                      <Input
                        label="Price (₹)"
                        type="number"
                        value={sub.price}
                        onChange={(e) => {
                          const next = [...subEvents];
                          next[idx] = { ...sub, price: e.target.value };
                          setSubEvents(next);
                        }}
                      />
                    )}
                  </div>
                  {sub.eventDate && (
                    <div className="mt-3">
                      <PhotographerPicker
                        label="Photographers"
                        date={sub.eventDate}
                        selectedIds={sub.photographerIds}
                        onChange={(ids) => {
                          const next = [...subEvents];
                          next[idx] = { ...sub, photographerIds: ids };
                          setSubEvents(next);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Step 4: Pricing & Invoice */}
          <Card title="4. Pricing & Invoice">
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPricingMode("LUMP_SUM")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  pricingMode === "LUMP_SUM"
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Total Package Price
              </button>
              <button
                type="button"
                onClick={() => setPricingMode("PER_SUB_EVENT")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  pricingMode === "PER_SUB_EVENT"
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Price Per Sub-Event
              </button>
            </div>

            {pricingMode === "LUMP_SUM" && (
              <Input
                label="Total Package Price (₹) *"
                type="number"
                value={mainEvent.lumpSumPrice}
                onChange={(e) => setMainEvent({ ...mainEvent, lumpSumPrice: e.target.value })}
                required
              />
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Invoice Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl bg-brand/5 px-5 py-4">
              <div className="flex items-center gap-2 text-slate-700">
                <IndianRupee className="h-5 w-5 text-brand" />
                <span className="font-medium">Invoice Total</span>
              </div>
              <span className="text-2xl font-bold text-brand">{formatCurrency(calculatedTotal)}</span>
            </div>
          </Card>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Booking & Invoice
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <Card className="py-16 text-center">
              <Calendar className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">No bookings yet. Create your first one!</p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> New Booking
              </Button>
            </Card>
          ) : (
            bookings.map((b) => (
              <Card key={b.id} className="!p-0 overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{b.title}</h3>
                      {b.status === "CANCELLED" && <span className="badge-danger">Cancelled</span>}
                    </div>
                    <p className="text-sm text-slate-500">
                      {b.client.name} · {formatDate(b.eventDate)} · {b.subEvents.length} sub-events
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {b.invoiceSummary && (
                      <div className="text-right">
                        <p className="font-bold text-slate-800">{formatCurrency(b.invoiceSummary.total)}</p>
                        {b.invoiceSummary.balance > 0 ? (
                          <p className="text-xs text-amber-600">Due: {formatCurrency(b.invoiceSummary.balance)}</p>
                        ) : (
                          <p className="text-xs text-emerald-600">Paid</p>
                        )}
                      </div>
                    )}
                    {expandedId === b.id ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedId === b.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">{b.client.name}</span> · {b.client.phone}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditBookingId(b.id); }}
                          className="flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        {b.invoiceSummary && (
                          <Link
                            href={`/invoice-tracker?invoice=${b.invoiceSummary.id}`}
                            className="text-sm font-medium text-brand hover:underline"
                          >
                            Track Payments →
                          </Link>
                        )}
                      </div>
                    </div>
                    {b.location && (
                      <p className="mb-3 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" /> {b.location}
                      </p>
                    )}
                    <SharePrintActions
                      clientPhone={b.client.phone}
                      printUrl={b.invoiceSummary ? `/print/invoice/${b.invoiceSummary.id}` : undefined}
                      message={formatBookingWhatsAppMessage({
                        studioName,
                        title: b.title,
                        clientName: b.client.name,
                        clientPhone: b.client.phone,
                        eventDate: b.eventDate,
                        location: b.location,
                        subEvents: b.subEvents.map((s) => ({
                          title: s.title,
                          eventDate: s.eventDate,
                          location: s.location,
                        })),
                        invoiceNumber: b.invoiceSummary?.invoiceNumber,
                        total: b.invoiceSummary?.total,
                        paid: b.invoiceSummary?.paid,
                        balance: b.invoiceSummary?.balance,
                      })}
                      onShareLink={async () => {
                        const res = await fetch(`/api/bookings/${b.id}/share`, { method: "POST" });
                        const data = await res.json();
                        return data.invoiceShareUrl || data.shareUrl || null;
                      }}
                      onBookingPrintLink={async () => {
                        const res = await fetch(`/api/bookings/${b.id}/share`, { method: "POST" });
                        const data = await res.json();
                        return data.shareUrl || null;
                      }}
                      printLabel="Invoice"
                      label="Booking"
                    />
                    <div className="mt-4 space-y-2">
                      {b.subEvents.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                        >
                          <span className="text-slate-700">{sub.title}</span>
                          <span className="text-slate-500">
                            {formatDate(sub.eventDate)}
                            {sub.price != null && sub.price > 0 && ` · ${formatCurrency(sub.price)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      <BookingEditModal
        bookingId={editBookingId}
        clients={clients}
        onClose={() => setEditBookingId(null)}
        onSaved={fetchData}
      />

      <Modal open={clientModal} onClose={() => setClientModal(false)} title="Quick Add Client">
        <form onSubmit={handleCreateClient} className="space-y-4">
          <Input label="Name *" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} required />
          <Input label="Phone *" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} required />
          <Input label="Email" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setClientModal(false)}>Cancel</Button>
            <Button type="submit">Add & Select</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
