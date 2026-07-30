"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Camera, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

interface Photographer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  isActive: boolean;
  _count: { assignments: number };
}

export default function PhotographersContent() {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", specialty: "" });

  const fetchData = () => {
    const q = showInactive ? "?includeInactive=true" : "";
    fetch(`/api/photographers${q}`).then((r) => r.json()).then(setPhotographers);
  };

  useEffect(() => { fetchData(); }, [showInactive]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", specialty: "" });
    setModalOpen(true);
  };

  const openEdit = (p: Photographer) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      email: p.email || "",
      phone: p.phone || "",
      specialty: p.specialty || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = editingId
      ? await fetch(`/api/photographers/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await fetch("/api/photographers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

    if (res.ok) {
      setModalOpen(false);
      fetchData();
    }
    setLoading(false);
  };

  const toggleActive = async (p: Photographer) => {
    const action = p.isActive ? "mark as unavailable" : "reactivate";
    if (!confirm(`${p.isActive ? "Mark" : "Reactivate"} ${p.name}?`)) return;
    await fetch(`/api/photographers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    fetchData();
  };

  const visible = showInactive ? photographers : photographers.filter((p) => p.isActive);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Photographers</h1>
          <p className="text-slate-500">Manage your team and availability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowInactive(!showInactive)}>
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Photographer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <Card key={p.id} className={!p.isActive ? "opacity-60" : ""}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${p.isActive ? "bg-brand/10 text-brand" : "bg-slate-100 text-slate-400"}`}>
                  <Camera className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{p.name}</h3>
                    {!p.isActive && <span className="badge-neutral">Unavailable</span>}
                  </div>
                  {p.specialty && <p className="text-sm text-brand">{p.specialty}</p>}
                  {p.phone && <p className="text-xs text-slate-500 mt-1">{p.phone}</p>}
                  <p className="text-xs text-slate-400 mt-2">{p._count.assignments} events assigned</p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive(p)}
                  title={p.isActive ? "Mark unavailable" : "Reactivate"}
                  className={`rounded-lg p-1.5 ${p.isActive ? "text-slate-400 hover:bg-amber-50 hover:text-amber-600" : "text-emerald-500 hover:bg-emerald-50"}`}
                >
                  {p.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Photographer" : "Add Photographer"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Weddings, Portraits" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>{editingId ? "Save" : "Add"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
