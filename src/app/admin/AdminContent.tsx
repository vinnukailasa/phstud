"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { formatDate, LICENSE_TIER_LABELS } from "@/lib/utils";

interface Studio {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  licenseTier: string;
  licenseExpires: string | null;
  isActive: boolean;
  primaryColor: string;
  createdAt: string;
  _count: { users: number; clients: number; events: number };
}

interface DashboardStats {
  studios: number;
  activeStudios: number;
  totalEvents: number;
  totalRevenue: number;
}

const licenseOptions = Object.entries(LICENSE_TIER_LABELS).map(([value, label]) => ({ value, label }));

export default function AdminContent() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    licenseTier: "TRIAL",
    licenseDays: "30",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    primaryColor: "#6366f1",
    accentColor: "#f59e0b",
  });

  const fetchData = () => {
    Promise.all([
      fetch("/api/studios").then((r) => r.json()),
      fetch("/api/dashboard").then((r) => r.json()),
    ]).then(([st, dash]) => {
      setStudios(st);
      setStats(dash);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/studios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        licenseDays: parseInt(form.licenseDays),
      }),
    });
    if (res.ok) {
      setModalOpen(false);
      setForm({
        name: "", email: "", phone: "", address: "",
        licenseTier: "TRIAL", licenseDays: "30",
        adminName: "", adminEmail: "", adminPassword: "",
        primaryColor: "#6366f1", accentColor: "#f59e0b",
      });
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create studio");
    }
    setLoading(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/studios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchData();
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Super Admin</h1>
          <p className="text-slate-500">Manage photo studio instances</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Onboard Studio
        </Button>
      </div>

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Studios" value={stats.studios} icon={<Building2 className="h-6 w-6" />} />
          <StatCard title="Active Studios" value={stats.activeStudios} icon={<Building2 className="h-6 w-6" />} />
          <StatCard title="Total Events" value={stats.totalEvents} icon={<Calendar className="h-6 w-6" />} />
          <StatCard title="Platform Revenue" value={stats.totalRevenue} format="currency" icon={<Users className="h-6 w-6" />} />
        </div>
      )}

      <div className="space-y-3">
        {studios.map((studio) => (
          <Card key={studio.id} className="!p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: studio.primaryColor }}
                >
                  {studio.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{studio.name}</h3>
                    <span className={studio.isActive ? "badge-success" : "badge-danger"}>
                      {studio.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="badge-info">{LICENSE_TIER_LABELS[studio.licenseTier]}</span>
                  </div>
                  <p className="text-sm text-slate-500">{studio.email}</p>
                  <p className="text-xs text-slate-400">
                    {studio._count.users} users · {studio._count.clients} clients · {studio._count.events} events
                    {studio.licenseExpires && ` · Expires: ${formatDate(studio.licenseExpires)}`}
                  </p>
                </div>
              </div>
              <Button
                variant={studio.isActive ? "danger" : "primary"}
                className="!py-1.5 !px-3 !text-xs shrink-0"
                onClick={() => toggleActive(studio.id, studio.isActive)}
              >
                {studio.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Onboard New Studio" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-medium text-slate-700">Studio Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Studio Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Studio Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select label="License Tier" options={licenseOptions} value={form.licenseTier} onChange={(e) => setForm({ ...form, licenseTier: e.target.value })} />
            <Input label="License Duration (days)" type="number" value={form.licenseDays} onChange={(e) => setForm({ ...form, licenseDays: e.target.value })} />
          </div>

          <h3 className="font-medium text-slate-700 pt-2">Admin Account</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Admin Name *" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />
            <Input label="Admin Email *" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
            <Input label="Admin Password *" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required />
          </div>

          <h3 className="font-medium text-slate-700 pt-2">Branding</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Primary Color</label>
              <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-10 w-full cursor-pointer rounded-lg" />
            </div>
            <div>
              <label className="label">Accent Color</label>
              <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="h-10 w-full cursor-pointer rounded-lg" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Studio</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
