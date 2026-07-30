"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  IndianRupee,
  Bell,
  Plus,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  PAYMENT_TYPE_LABELS,
} from "@/lib/utils";
import { SharePrintActions } from "@/components/SharePrintActions";
import { formatInvoiceWhatsAppMessage } from "@/lib/share-messages";

interface Payment {
  id: string;
  amount: number;
  paymentType: string;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
}

interface Reminder {
  id: string;
  title: string;
  message: string | null;
  scheduledFor: string;
  isSent: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  dueDate: string | null;
  paidAmount: number;
  balance: number;
  client: { name: string; phone: string; email: string | null };
  event: { title: string; subEvents: { title: string; eventDate: string }[] } | null;
  payments: Payment[];
  reminders: Reminder[];
  lineItems: { description: string; total: number }[];
}

const paymentTypes = Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

function InvoiceTrackerInner() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("invoice");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(highlightId);
  const [payModal, setPayModal] = useState<string | null>(null);
  const [reminderModal, setReminderModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [studioName, setStudioName] = useState("Photo Studio");

  const [payForm, setPayForm] = useState({
    amount: "",
    paymentType: "ADVANCE",
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: "",
    notes: "",
  });

  const [reminderForm, setReminderForm] = useState({
    scheduledFor: "",
    message: "",
  });

  const fetchInvoices = () => {
    fetch("/api/invoice-tracker")
      .then((r) => r.json())
      .then((data) => {
        setInvoices(data);
        if (highlightId && !expandedId) setExpandedId(highlightId);
      });
  };

  useEffect(() => {
    fetchInvoices();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.studio?.name) setStudioName(d.user.studio.name);
      });
  }, []);

  useEffect(() => {
    if (highlightId) setExpandedId(highlightId);
  }, [highlightId]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      SENT: "badge-info",
      PARTIALLY_PAID: "badge-warning",
      PAID: "badge-success",
      OVERDUE: "badge-danger",
    };
    return <span className={map[status] || "badge-neutral"}>{status.replace("_", " ")}</span>;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setLoading(true);

    const res = await fetch(`/api/invoices/${payModal}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(payForm.amount),
        paymentType: payForm.paymentType,
        paymentDate: payForm.paymentDate,
        reference: payForm.reference || undefined,
        notes: payForm.notes || undefined,
      }),
    });

    if (res.ok) {
      setPayModal(null);
      setPayForm({
        amount: "",
        paymentType: "ADVANCE",
        paymentDate: new Date().toISOString().slice(0, 10),
        reference: "",
        notes: "",
      });
      fetchInvoices();
    }
    setLoading(false);
  };

  const handleScheduleReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderModal) return;
    setLoading(true);

    const res = await fetch("/api/invoice-tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId: reminderModal,
        scheduledFor: reminderForm.scheduledFor,
        message: reminderForm.message || undefined,
      }),
    });

    if (res.ok) {
      setReminderModal(null);
      setReminderForm({ scheduledFor: "", message: "" });
      fetchInvoices();
    }
    setLoading(false);
  };

  const openPayModal = (inv: Invoice) => {
    setPayModal(inv.id);
    setPayForm({
      ...payForm,
      amount: String(inv.balance),
    });
  };

  const pendingTotal = invoices.reduce((s, i) => s + i.balance, 0);
  const collectedTotal = invoices.reduce((s, i) => s + i.paidAmount, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Invoice Tracker</h1>
        <p className="text-slate-500">Record payments, track balances & schedule reminders</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Total Invoiced</p>
          <p className="text-xl font-bold text-slate-800">
            {formatCurrency(invoices.reduce((s, i) => s + i.total, 0))}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Collected</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(collectedTotal)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Outstanding</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(pendingTotal)}</p>
        </Card>
      </div>

      <div className="space-y-3">
        {invoices.map((inv) => (
          <Card
            key={inv.id}
            className={`!p-0 overflow-hidden ${highlightId === inv.id ? "ring-2 ring-brand" : ""}`}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
              onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{inv.invoiceNumber}</h3>
                  {statusBadge(inv.status)}
                </div>
                <p className="text-sm text-slate-500">
                  {inv.client.name} · {inv.event?.title || "—"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(inv.total)}</p>
                  {inv.balance > 0 ? (
                    <p className="text-xs text-amber-600">Balance: {formatCurrency(inv.balance)}</p>
                  ) : (
                    <p className="text-xs text-emerald-600">Fully Paid</p>
                  )}
                </div>
                {expandedId === inv.id ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </button>

            {expandedId === inv.id && (
              <div className="border-t border-slate-100 p-4 space-y-4">
                <SharePrintActions
                  clientPhone={inv.client.phone}
                  printUrl={`/print/invoice/${inv.id}`}
                  message={formatInvoiceWhatsAppMessage({
                    studioName,
                    invoiceNumber: inv.invoiceNumber,
                    clientName: inv.client.name,
                    eventTitle: inv.event?.title,
                    lineItems: inv.lineItems,
                    total: inv.total,
                    paid: inv.paidAmount,
                    balance: inv.balance,
                    dueDate: inv.dueDate,
                    payments: inv.payments.map((p) => ({
                      paymentType: p.paymentType,
                      amount: p.amount,
                      paymentDate: p.paymentDate,
                    })),
                  })}
                  onShareLink={async () => {
                    const res = await fetch(`/api/invoices/${inv.id}/share`, { method: "POST" });
                    const data = await res.json();
                    return data.shareUrl || null;
                  }}
                  label="Invoice"
                />

                {/* Line items */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-700">Invoice Breakdown</h4>
                  <div className="space-y-1">
                    {inv.lineItems.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm text-slate-600">
                        <span>{item.description}</span>
                        <span>{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                  {inv.dueDate && (
                    <p className="mt-2 text-xs text-slate-400">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      Due: {formatDate(inv.dueDate)}
                    </p>
                  )}
                </div>

                {/* Payment history */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-700">Payment History</h4>
                    {inv.balance > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="!py-1.5 !px-3 !text-xs"
                          onClick={() => openPayModal(inv)}
                        >
                          <Plus className="h-3 w-3" /> Record Payment
                        </Button>
                        <Button
                          variant="ghost"
                          className="!py-1.5 !px-3 !text-xs"
                          onClick={() => setReminderModal(inv.id)}
                        >
                          <Bell className="h-3 w-3" /> Schedule Reminder
                        </Button>
                      </div>
                    )}
                  </div>

                  {inv.payments.length === 0 ? (
                    <p className="text-sm text-slate-400">No payments recorded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {inv.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                        >
                          <div>
                            <span className="font-medium text-slate-700">
                              {PAYMENT_TYPE_LABELS[p.paymentType] || p.paymentType}
                            </span>
                            <span className="ml-2 text-slate-400">{formatDate(p.paymentDate)}</span>
                            {p.reference && (
                              <span className="ml-2 text-xs text-slate-400">Ref: {p.reference}</span>
                            )}
                          </div>
                          <span className="font-semibold text-emerald-600">
                            +{formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scheduled reminders */}
                {inv.reminders.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-700">Payment Reminders</h4>
                    <div className="space-y-2">
                      {inv.reminders.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm"
                        >
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-slate-700">{r.title}</p>
                            <p className="text-xs text-slate-500">{formatDateTime(r.scheduledFor)}</p>
                          </div>
                          {r.isSent && <span className="ml-auto badge-success">Sent</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Paid: {formatCurrency(inv.paidAmount)}</span>
                    <span>{Math.round((inv.paidAmount / inv.total) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (inv.paidAmount / inv.total) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}

        {invoices.length === 0 && (
          <Card className="py-16 text-center">
            <IndianRupee className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">No invoices yet. Create a booking to generate one.</p>
          </Card>
        )}
      </div>

      {/* Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Record Payment">
        <form onSubmit={handlePayment} className="space-y-4">
          <Select
            label="Payment Type"
            options={paymentTypes}
            value={payForm.paymentType}
            onChange={(e) => setPayForm({ ...payForm, paymentType: e.target.value })}
          />
          <Input
            label="Amount (₹) *"
            type="number"
            value={payForm.amount}
            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            required
          />
          <Input
            label="Payment Date *"
            type="date"
            value={payForm.paymentDate}
            onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
            required
          />
          <Input
            label="Reference / Transaction ID"
            value={payForm.reference}
            onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
          />
          <Input
            label="Notes"
            value={payForm.notes}
            onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPayModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* Reminder Modal */}
      <Modal open={!!reminderModal} onClose={() => setReminderModal(null)} title="Schedule Payment Reminder">
        <form onSubmit={handleScheduleReminder} className="space-y-4">
          <Input
            label="Send Reminder On *"
            type="datetime-local"
            value={reminderForm.scheduledFor}
            onChange={(e) => setReminderForm({ ...reminderForm, scheduledFor: e.target.value })}
            required
          />
          <div>
            <label className="label">Custom Message (optional)</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Leave blank for default payment reminder message"
              value={reminderForm.message}
              onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })}
            />
          </div>
          <p className="text-xs text-slate-500">
            Reminder will appear in the Reminders page. Mark as sent after contacting the client via WhatsApp/SMS.
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setReminderModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>
              <Bell className="h-4 w-4" /> Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function InvoiceTrackerContent() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>}>
      <InvoiceTrackerInner />
    </Suspense>
  );
}
