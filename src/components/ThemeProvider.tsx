"use client";

import { useEffect } from "react";

interface ThemeProviderProps {
  primaryColor?: string;
  accentColor?: string;
  surfaceColor?: string;
  children: React.ReactNode;
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function ThemeProvider({
  primaryColor = "#6366f1",
  accentColor = "#f59e0b",
  surfaceColor = "#ffffff",
  children,
}: ThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", primaryColor);
    root.style.setProperty("--color-primary-light", adjustColor(primaryColor, 30));
    root.style.setProperty("--color-primary-dark", adjustColor(primaryColor, -30));
    root.style.setProperty("--color-accent", accentColor);
    root.style.setProperty("--color-accent-light", adjustColor(accentColor, 30));
    root.style.setProperty("--color-surface", surfaceColor);
    root.style.setProperty("--color-surface-elevated", adjustColor(surfaceColor, -5));
  }, [primaryColor, accentColor, surfaceColor]);

  return <>{children}</>;
}
