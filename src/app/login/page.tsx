"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push(data.user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="flex items-center gap-3 text-white">
          <Camera className="h-10 w-10" />
          <span className="text-3xl font-bold">PHStud</span>
        </div>
        <h2 className="mt-8 text-4xl font-bold leading-tight text-white">
          Manage your photo studio with ease
        </h2>
        <p className="mt-4 text-lg text-indigo-100">
          Clients, events, packages, invoicing, and reminders — all in one place.
        </p>
        <ul className="mt-8 space-y-3 text-indigo-100">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Schedule weddings, pre-weddings, birthdays & more
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Custom packages & flexible EMI payments
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Automated client reminders
          </li>
        </ul>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2 text-brand">
              <Camera className="h-8 w-8" />
              <span className="text-2xl font-bold">PHStud</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
          <p className="mt-2 text-slate-500">Sign in to your studio account</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>
            <div className="text-right">
              <a href="/forgot-password" className="text-sm font-medium text-brand hover:underline">
                Forgot password?
              </a>
            </div>
          </form>

          <div className="mt-8 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Demo credentials:</p>
            <p className="mt-1">Super Admin: admin@phstud.local / Admin@123</p>
            <p>Studio Admin: admin@demo-studio.com / Demo@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
