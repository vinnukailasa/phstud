"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Studio {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  upiId: string | null;
  payeeName: string | null;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontStyle: "normal" | "italic";
  logoPosition: "left" | "center" | "right";
  socialLinks: Record<string, string> | null;
  preEventReminderDays: number;
  postEventReminderDays: number;
  paymentReminderDays: number;
}

export default function SettingsContent() {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.studioId) {
          fetch(`/api/studios/${d.user.studioId}`)
            .then((r) => r.json())
            .then(setStudio);
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio) return;
    setLoading(true);
    setSaved(false);

    const res = await fetch(`/api/studios/${studio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: studio.name,
        phone: studio.phone,
        address: studio.address,
        upiId: studio.upiId,
        payeeName: studio.payeeName,
        primaryColor: studio.primaryColor,
        accentColor: studio.accentColor,
        fontFamily: studio.fontFamily,
        fontStyle: studio.fontStyle,
        logoPosition: studio.logoPosition,
        socialLinks: studio.socialLinks,
        preEventReminderDays: studio.preEventReminderDays,
        postEventReminderDays: studio.postEventReminderDays,
        paymentReminderDays: studio.paymentReminderDays,
      }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setLoading(false);
  };

  if (!studio) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500">Customize your studio profile and preferences</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <Card title="Studio Profile">
          <div className="space-y-4">
            <Input label="Studio Name" value={studio.name} onChange={(e) => setStudio({ ...studio, name: e.target.value })} />
            <Input label="Phone" value={studio.phone || ""} onChange={(e) => setStudio({ ...studio, phone: e.target.value })} />
            <Input label="Address" value={studio.address || ""} onChange={(e) => setStudio({ ...studio, address: e.target.value })} />
          </div>
        </Card>

        <Card title="Brand Colors">
          <p className="mb-4 text-sm text-slate-500">Customize your studio&apos;s color palette. Changes apply instantly.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={studio.primaryColor} onChange={(e) => setStudio({ ...studio, primaryColor: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200" />
                <Input value={studio.primaryColor} onChange={(e) => setStudio({ ...studio, primaryColor: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Accent Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={studio.accentColor} onChange={(e) => setStudio({ ...studio, accentColor: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200" />
                <Input value={studio.accentColor} onChange={(e) => setStudio({ ...studio, accentColor: e.target.value })} />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Invoice Branding">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Font Family" value={studio.fontFamily} onChange={(e) => setStudio({ ...studio, fontFamily: e.target.value })} />
            <label className="label">Font Style
              <select className="input" value={studio.fontStyle} onChange={(e) => setStudio({ ...studio, fontStyle: e.target.value as "normal" | "italic" })}>
                <option value="normal">Normal</option><option value="italic">Italic</option>
              </select>
            </label>
            <label className="label">Logo Position
              <select className="input" value={studio.logoPosition} onChange={(e) => setStudio({ ...studio, logoPosition: e.target.value as "left" | "center" | "right" })}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[["instagram", "Instagram URL"], ["youtube", "YouTube URL"], ["website", "Website URL"]].map(([key, label]) => (
              <Input key={key} label={label} type="url" value={studio.socialLinks?.[key] || ""} onChange={(e) => setStudio({ ...studio, socialLinks: { ...(studio.socialLinks || {}), [key]: e.target.value } })} />
            ))}
          </div>
        </Card>

        <Card title="Payment & UPI QR">
          <p className="mb-4 text-sm text-slate-500">
            Configure your UPI ID to show a scannable payment QR code on invoices. Clients can scan to pay the balance due.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="UPI ID (e.g. studio@paytm)"
              placeholder="yourstudio@upi"
              value={studio.upiId || ""}
              onChange={(e) => setStudio({ ...studio, upiId: e.target.value })}
            />
            <Input
              label="Payee Name (shown in UPI apps)"
              placeholder={studio.name}
              value={studio.payeeName || ""}
              onChange={(e) => setStudio({ ...studio, payeeName: e.target.value })}
            />
          </div>
        </Card>

        <Card title="Reminder Settings">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Pre-Event Reminder (days before)"
              type="number"
              min={1}
              max={90}
              value={studio.preEventReminderDays}
              onChange={(e) => setStudio({ ...studio, preEventReminderDays: parseInt(e.target.value) })}
            />
            <Input
              label="Post-Event Reminder (days after)"
              type="number"
              min={1}
              max={30}
              value={studio.postEventReminderDays}
              onChange={(e) => setStudio({ ...studio, postEventReminderDays: parseInt(e.target.value) })}
            />
            <Input
              label="Payment Reminder (days before due)"
              type="number"
              min={1}
              max={30}
              value={studio.paymentReminderDays}
              onChange={(e) => setStudio({ ...studio, paymentReminderDays: parseInt(e.target.value) })}
            />
          </div>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" loading={loading}>Save Settings</Button>
          {saved && <span className="text-sm text-emerald-600">Settings saved successfully!</span>}
        </div>
      </form>
    </div>
  );
}
