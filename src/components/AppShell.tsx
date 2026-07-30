"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Package,
  Camera,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "./ThemeProvider";
import { PwaInstallPrompt } from "./PwaInstallPrompt";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  studio?: {
    name: string;
    primaryColor: string;
    accentColor: string;
    surfaceColor: string;
  };
}

const studioNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/invoice-tracker", label: "Invoice Tracker", icon: Receipt },
  { href: "/packages", label: "Packages", icon: Package },
  { href: "/photographers", label: "Photographers", icon: Camera },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNav = [{ href: "/admin", label: "Studios", icon: Building2 }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const nav = user?.role === "SUPER_ADMIN" ? adminNav : studioNav;

  return (
    <ThemeProvider
      primaryColor={user?.studio?.primaryColor}
      accentColor={user?.studio?.accentColor}
      surfaceColor={user?.studio?.surfaceColor}
    >
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
            <div>
              <h1 className="text-lg font-bold text-brand">PHStud</h1>
              {user?.studio && (
                <p className="text-xs text-slate-500 truncate max-w-[180px]">{user.studio.name}</p>
              )}
            </div>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand/10 text-brand"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="mb-3 px-3">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6 lg:hidden">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-slate-600" />
            </button>
            <h1 className="text-lg font-bold text-brand">PHStud</h1>
          </header>

          <main className="flex-1 p-6 page-enter">{children}</main>
          <PwaInstallPrompt />
        </div>
      </div>
    </ThemeProvider>
  );
}
