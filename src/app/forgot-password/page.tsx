"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage(""); setDevResetUrl("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Unable to process your request."); return; }
      setMessage(data.message);
      if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
    } catch { setError("Something went wrong. Please try again."); } finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-2 text-brand"><Camera className="h-8 w-8" /><span className="text-2xl font-bold">PHStud</span></div>
      <h1 className="text-2xl font-bold text-slate-800">Forgot your password?</h1>
      <p className="mt-2 text-slate-500">Enter your account email and we&apos;ll generate a temporary reset link.</p>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Email delivery is not configured yet. Use the temporary link below for testing only; connect an email provider before production use.
      </div>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input id="email" label="Email" type="email" placeholder="you@studio.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
        {error && <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {message && <div role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {devResetUrl && <a href={devResetUrl} className="block break-all rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 underline">Open temporary password reset link</a>}
        <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
      </form>
      <Link href="/login" className="mt-6 block text-center text-sm font-medium text-brand hover:underline">Back to sign in</Link>
    </div>
  </main>;
}
