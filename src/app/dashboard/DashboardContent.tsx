"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Calendar, FileText, IndianRupee, Bell } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { formatDate, formatDateTime, EVENT_TYPE_LABELS } from "@/lib/utils";

interface DashboardData {
  clientCount: number;
  eventCount: number;
  pendingInvoices: number;
  revenue: number;
  pendingReminders: number;
  upcomingEvents: {
    id: string;
    title: string;
    eventType: string;
    eventDate: string;
    location: string | null;
    client: { name: string };
  }[];
}

export default function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Overview of your studio activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Clients" value={data.clientCount} icon={<Users className="h-6 w-6" />} />
        <StatCard title="Total Events" value={data.eventCount} icon={<Calendar className="h-6 w-6" />} />
        <StatCard title="Revenue" value={data.revenue} format="currency" icon={<IndianRupee className="h-6 w-6" />} />
        <StatCard
          title="Pending Invoices"
          value={data.pendingInvoices}
          icon={<FileText className="h-6 w-6" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card
          title="Upcoming Events (7 days)"
          action={
              <Link href="/bookings" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          }
        >
          {data.upcomingEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming events this week</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/bookings`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-800">{event.title}</p>
                    <p className="text-xs text-slate-500">
                      {event.client.name} · {EVENT_TYPE_LABELS[event.eventType]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-brand">{formatDate(event.eventDate)}</p>
                    {event.location && (
                      <p className="text-xs text-slate-400 truncate max-w-[120px]">{event.location}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Pending Reminders"
          action={
            data.pendingReminders > 0 ? (
              <Link href="/reminders" className="badge-warning">
                {data.pendingReminders} pending
              </Link>
            ) : null
          }
        >
          {data.pendingReminders === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-400">
              <Bell className="h-10 w-10 mb-2" />
              <p className="text-sm">All reminders are up to date</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-3xl font-bold text-amber-600">{data.pendingReminders}</p>
              <p className="mt-1 text-sm text-slate-500">reminders need attention</p>
              <Link href="/reminders" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
                View reminders →
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
