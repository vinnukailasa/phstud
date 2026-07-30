"use client";

import { useEffect, useState } from "react";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { formatDate, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  eventType: string;
  status: string;
  eventDate: string;
  location: string | null;
  client: { id: string; name: string };
  package: { name: string; price: number } | null;
  photographers: { photographer: { name: string } }[];
}

interface Client { id: string; name: string }
interface Package { id: string; name: string; price: number }
interface Photographer { id: string; name: string }

const eventTypes = Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export default function EventsContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    eventType: "WEDDING",
    eventDate: "",
    location: "",
    clientId: "",
    packageId: "",
    photographerIds: [] as string[],
    notes: "",
  });

  const fetchData = () => {
    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/packages").then((r) => r.json()),
      fetch("/api/photographers").then((r) => r.json()),
    ]).then(([ev, cl, pk, ph]) => {
      setEvents(ev);
      setClients(cl);
      setPackages(pk.filter((p: Package & { isActive: boolean }) => p.isActive !== false));
      setPhotographers(ph);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        packageId: form.packageId || undefined,
        photographerIds: form.photographerIds,
      }),
    });
    if (res.ok) {
      setModalOpen(false);
      setForm({ title: "", eventType: "WEDDING", eventDate: "", location: "", clientId: "", packageId: "", photographerIds: [], notes: "" });
      fetchData();
    }
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      SCHEDULED: "badge-info",
      IN_PROGRESS: "badge-warning",
      COMPLETED: "badge-success",
      CANCELLED: "badge-danger",
    };
    return <span className={map[status] || "badge-neutral"}>{EVENT_STATUS_LABELS[status]}</span>;
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Events</h1>
          <p className="text-slate-500">Schedule and manage photo shoots</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New Event
        </Button>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="!p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{event.title}</h3>
                  {statusBadge(event.status)}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {event.client.name} · {EVENT_TYPE_LABELS[event.eventType]}
                </p>
                {event.location && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="h-3 w-3" /> {event.location}
                  </p>
                )}
                {event.photographers.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    📷 {event.photographers.map((p) => p.photographer.name).join(", ")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-medium text-brand">{formatDate(event.eventDate)}</p>
                {event.package && (
                  <p className="text-xs text-slate-400">{event.package.name}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
        {events.length === 0 && (
          <div className="py-16 text-center text-slate-400">No events scheduled yet</div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Schedule New Event" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Event Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Event Type" options={eventTypes} value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} />
            <Input label="Event Date *" type="datetime-local" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
          </div>
          <Select
            label="Client *"
            options={[{ value: "", label: "Select client..." }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            required
          />
          <Select
            label="Package"
            options={[{ value: "", label: "No package" }, ...packages.map((p) => ({ value: p.id, label: `${p.name} (₹${p.price})` }))]}
            value={form.packageId}
            onChange={(e) => setForm({ ...form, packageId: e.target.value })}
          />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Venue address or location name" />
          <div>
            <label className="label">Assign Photographers</label>
            <div className="flex flex-wrap gap-2">
              {photographers.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.photographerIds.includes(p.id)}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        photographerIds: e.target.checked
                          ? [...form.photographerIds, p.id]
                          : form.photographerIds.filter((id) => id !== p.id),
                      });
                    }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Event</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
