"use client";

import { useEffect, useState } from "react";
import { Bell, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";

interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string | null;
  scheduledFor: string;
  event: { title: string; client: { name: string; phone: string } } | null;
  invoice: { invoiceNumber: string; client: { name: string; phone: string } } | null;
}

const typeLabels: Record<string, string> = {
  PRE_EVENT_CLIENT: "Pre-Event (Client)",
  PRE_EVENT_STUDIO: "Pre-Event (Studio)",
  POST_EVENT_CLIENT: "Post-Event (Client)",
  PAYMENT_DUE: "Payment Due",
};

export default function RemindersContent() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReminders = () => {
    fetch("/api/reminders").then((r) => r.json()).then(setReminders);
  };

  useEffect(() => { fetchReminders(); }, []);

  const markSent = async (id: string) => {
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchReminders();
  };

  const rescheduleAll = async () => {
    setLoading(true);
    await fetch("/api/reminders", { method: "PUT" });
    fetchReminders();
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reminders</h1>
          <p className="text-slate-500">Pending notifications for clients and studio</p>
        </div>
        <Button variant="secondary" onClick={rescheduleAll} loading={loading}>
          <RefreshCw className="h-4 w-4" /> Reschedule All
        </Button>
      </div>

      {reminders.length === 0 ? (
        <Card className="text-center py-16">
          <Bell className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">No pending reminders</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => (
            <Card key={r.id} className="!p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="badge-warning">{typeLabels[r.type] || r.type}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(r.scheduledFor)}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-800">{r.title}</h3>
                  {r.message && <p className="mt-1 text-sm text-slate-500">{r.message}</p>}
                  {r.event && (
                    <p className="mt-2 text-xs text-slate-400">
                      Event: {r.event.title} · Client: {r.event.client.name} ({r.event.client.phone})
                    </p>
                  )}
                  {r.invoice && (
                    <p className="mt-2 text-xs text-slate-400">
                      Invoice: {r.invoice.invoiceNumber} · Client: {r.invoice.client.name} ({r.invoice.client.phone})
                    </p>
                  )}
                </div>
                <Button variant="secondary" className="shrink-0" onClick={() => markSent(r.id)}>
                  <Check className="h-4 w-4" /> Mark Sent
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8" title="How Reminders Work">
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• <strong>Pre-Event (Client):</strong> Sent to client X days before the event (configurable in Settings)</li>
          <li>• <strong>Pre-Event (Studio):</strong> Internal reminder for your team</li>
          <li>• <strong>Post-Event (Client):</strong> Thank-you message sent after the event</li>
          <li>• Mark reminders as &quot;Sent&quot; after you&apos;ve contacted the client via WhatsApp/SMS/Email</li>
          <li>• <strong>Payment Due:</strong> Scheduled from Invoice Tracker for outstanding balances</li>
        </ul>
      </Card>
    </div>
  );
}
