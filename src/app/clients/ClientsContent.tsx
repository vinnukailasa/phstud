"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Phone, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  notes: string | null;
  _count: { events: number; invoices: number };
}

export default function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [loading, setLoading] = useState(false);

  const fetchClients = () => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  };

  useEffect(() => { fetchClients(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", address: "", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      email: c.email || "",
      phone: c.phone,
      address: c.address || "",
      notes: c.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = editingId
      ? await fetch(`/api/clients/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

    if (res.ok) {
      setModalOpen(false);
      fetchClients();
    }
    setLoading(false);
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
          <p className="text-slate-500">{clients.length} total clients</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow relative">
            <button
              onClick={() => openEdit(client)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <h3 className="font-semibold text-slate-800 pr-8">{client.name}</h3>
            <div className="mt-2 space-y-1">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Phone className="h-3.5 w-3.5" /> {client.phone}
              </p>
              {client.email && (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="h-3.5 w-3.5" /> {client.email}
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-3 text-xs text-slate-400">
              <span>{client._count.events} events</span>
              <span>{client._count.invoices} invoices</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Client" : "Add Client"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>{editingId ? "Save" : "Add Client"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
