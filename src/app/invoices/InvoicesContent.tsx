"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate, PAYMENT_TYPE_LABELS } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  dueDate: string | null;
  client: { name: string };
  event: { title: string } | null;
  payments: { amount: number; status: string }[];
}

interface Client { id: string; name: string }
interface Package { id: string; name: string; price: number }
interface EventOption { id: string; title: string; parentId: string | null }

export default function InvoicesContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [payModal, setPayModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "",
    description: "",
    amount: "",
    dueDate: "",
    eventId: "",
    showSubEvents: false,
  });

  const [payForm, setPayForm] = useState({
    amount: "",
    paymentType: "ADVANCE",
    reference: "",
    emiNumber: "",
    totalEmis: "",
  });

  const fetchData = () => {
    Promise.all([
      fetch("/api/invoices").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/packages").then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
    ]).then(([inv, cl, pk, ev]) => {
      setInvoices(inv);
      setClients(cl);
      setPackages(pk);
      setEvents(ev);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: "badge-neutral",
      SENT: "badge-info",
      PARTIALLY_PAID: "badge-warning",
      PAID: "badge-success",
      OVERDUE: "badge-danger",
      CANCELLED: "badge-neutral",
    };
    return <span className={map[status] || "badge-neutral"}>{status.replace("_", " ")}</span>;
  };

  const getPaid = (inv: Invoice) =>
    inv.payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: invoiceForm.clientId,
        dueDate: invoiceForm.dueDate || undefined,
        eventId: invoiceForm.eventId || undefined,
        showSubEvents: invoiceForm.showSubEvents,
        lineItems: [{
          description: invoiceForm.description,
          quantity: 1,
          unitPrice: parseFloat(invoiceForm.amount),
        }],
      }),
    });
    if (res.ok) {
      setCreateModal(false);
      setInvoiceForm({ clientId: "", description: "", amount: "", dueDate: "", eventId: "", showSubEvents: false });
      fetchData();
    }
    setLoading(false);
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
        reference: payForm.reference || undefined,
        emiNumber: payForm.emiNumber ? parseInt(payForm.emiNumber) : undefined,
        totalEmis: payForm.totalEmis ? parseInt(payForm.totalEmis) : undefined,
      }),
    });
    if (res.ok) {
      setPayModal(null);
      setPayForm({ amount: "", paymentType: "ADVANCE", reference: "", emiNumber: "", totalEmis: "" });
      fetchData();
    }
    setLoading(false);
  };

  const paymentTypes = Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
          <p className="text-slate-500">Manage billing and payments</p>
        </div>
        <Button onClick={() => setCreateModal(true)}>
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>

      <div className="space-y-3">
        {invoices.map((inv) => {
          const paid = getPaid(inv);
          const balance = inv.total - paid;
          return (
            <Card key={inv.id} className="!p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{inv.invoiceNumber}</h3>
                    {statusBadge(inv.status)}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{inv.client.name}</p>
                  {inv.event && <p className="text-xs text-slate-400">{inv.event.title}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">{formatCurrency(inv.total)}</p>
                  {paid > 0 && (
                    <p className="text-xs text-emerald-600">Paid: {formatCurrency(paid)}</p>
                  )}
                  {balance > 0 && (
                    <p className="text-xs text-amber-600">Balance: {formatCurrency(balance)}</p>
                  )}
                  {balance > 0 && (
                    <Button
                      variant="secondary"
                      className="mt-2 !py-1.5 !px-3 !text-xs"
                      onClick={() => {
                        setPayModal(inv.id);
                        setPayForm({ ...payForm, amount: String(balance) });
                      }}
                    >
                      Record Payment
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Invoice">
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <Select
            label="Client *"
            options={[{ value: "", label: "Select..." }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
            value={invoiceForm.clientId}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })}
            required
          />
          <Select label="Main Event" options={[{ value: "", label: "No event" }, ...events.filter((event) => !event.parentId).map((event) => ({ value: event.id, label: event.title }))]} value={invoiceForm.eventId} onChange={(e) => setInvoiceForm({ ...invoiceForm, eventId: e.target.value })} />
          {invoiceForm.eventId && <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={invoiceForm.showSubEvents} onChange={(e) => setInvoiceForm({ ...invoiceForm, showSubEvents: e.target.checked })} /> Show sub-event titles on invoice</label>}
          <Input label="Description *" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} required />
          <Input label="Amount (₹) *" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} required />
          <Input label="Due Date" type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Invoice</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Record Payment">
        <form onSubmit={handlePayment} className="space-y-4">
          <Select
            label="Payment Type"
            options={paymentTypes}
            value={payForm.paymentType}
            onChange={(e) => setPayForm({ ...payForm, paymentType: e.target.value })}
          />
          <Input label="Amount (₹) *" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required />
          <Input label="Reference / Transaction ID" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
          {payForm.paymentType === "EMI" && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="EMI Number" type="number" value={payForm.emiNumber} onChange={(e) => setPayForm({ ...payForm, emiNumber: e.target.value })} />
              <Input label="Total EMIs" type="number" value={payForm.totalEmis} onChange={(e) => setPayForm({ ...payForm, totalEmis: e.target.value })} />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPayModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
