"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage(""); setDevResetUrl("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Unable to process your request."); return; }
      setMessage(data.message);
      if (data.resetUrl) setDevResetUrl(data.resetUrl);
    } catch { setError("Something went wrong. Please try again."); } finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-2 text-brand"><Camera className="h-8 w-8" /><span className="text-2xl font-bold">PHStud</span></div>
      <h1 className="text-2xl font-bold text-slate-800">Forgot your password?</h1>
      <p className="mt-2 text-slate-500">Enter your WhatsApp number to receive a verification code.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input id="phone" label="WhatsApp number" type="tel" placeholder="+919876543210" value={phone} onChange={(event) => setPhone(event.target.value)} required />
        {error && <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {message && <div role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {devResetUrl && <a href={devResetUrl} className="block rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 underline">Enter the WhatsApp verification code</a>}
        <Button type="submit" loading={loading} className="w-full">Send WhatsApp code</Button>
      </form>
      <Link href="/login" className="mt-6 block text-center text-sm font-medium text-brand hover:underline">Back to sign in</Link>
    </div>
  </main>;
}
