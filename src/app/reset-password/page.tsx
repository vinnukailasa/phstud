"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(token ? "" : "This reset link is missing its token.");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Unable to reset your password."); return; }
      setSuccess(true);
    } catch { setError("Something went wrong. Please try again."); } finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-2 text-brand"><Camera className="h-8 w-8" /><span className="text-2xl font-bold">PHStud</span></div>
      {success ? <><h1 className="text-2xl font-bold text-slate-800">Password updated</h1><p className="mt-2 text-slate-500">Your password has been reset successfully.</p><Link href="/login" className="mt-6 block text-center font-medium text-brand hover:underline">Continue to sign in</Link></> : <><h1 className="text-2xl font-bold text-slate-800">Create a new password</h1><p className="mt-2 text-slate-500">Use at least 8 characters and include a number.</p><form onSubmit={handleSubmit} className="mt-8 space-y-5"><Input id="password" label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /><Input id="confirmation" label="Confirm password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} />{error && <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}<Button type="submit" loading={loading} disabled={!token} className="w-full">Reset password</Button></form></>}
    </div>
  </main>;
}
