"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";

interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  items: string | null;
  isActive: boolean;
}

export default function PackagesContent() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", items: "" });

  const fetchPackages = () => {
    fetch("/api/packages").then((r) => r.json()).then(setPackages);
  };

  useEffect(() => { fetchPackages(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", description: "", price: "", items: "" });
    setModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    const items = pkg.items ? JSON.parse(pkg.items).join("\n") : "";
    setForm({
      name: pkg.name,
      description: pkg.description || "",
      price: String(pkg.price),
      items,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const items = form.items.split("\n").filter(Boolean);
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      items,
    };

    const res = editingId
      ? await fetch(`/api/packages/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      setModalOpen(false);
      fetchPackages();
    }
    setLoading(false);
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this package? It will no longer appear in new bookings.")) return;
    await fetch(`/api/packages/${id}`, { method: "DELETE" });
    fetchPackages();
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Packages</h1>
          <p className="text-slate-500">Customize your service packages</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Package
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.filter((p) => p.isActive).map((pkg) => {
          const items = pkg.items ? JSON.parse(pkg.items) : [];
          return (
            <Card key={pkg.id} className="relative overflow-hidden">
              <div className="absolute top-3 right-3 flex gap-1">
                <button onClick={() => openEdit(pkg)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDeactivate(pkg.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-semibold text-lg text-slate-800 pr-16">{pkg.name}</h3>
              <p className="mt-2 text-2xl font-bold text-brand">{formatCurrency(pkg.price)}</p>
              {pkg.description && <p className="mt-2 text-sm text-slate-500">{pkg.description}</p>}
              {items.length > 0 && (
                <ul className="mt-4 space-y-1">
                  {items.map((item: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="h-1 w-1 rounded-full bg-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Package" : "Create Package"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Package Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Price (₹) *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <div>
            <label className="label">Included Items (one per line)</label>
            <textarea
              className="input min-h-[100px]"
              value={form.items}
              onChange={(e) => setForm({ ...form, items: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>{editingId ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
