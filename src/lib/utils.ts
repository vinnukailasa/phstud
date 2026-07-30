import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateInvoiceNumber(studioSlug: string, count: number) {
  const year = new Date().getFullYear();
  const padded = String(count + 1).padStart(4, "0");
  return `${studioSlug.toUpperCase().slice(0, 3)}-${year}-${padded}`;
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  PRE_WEDDING: "Pre-Wedding Shoot",
  BEFORE_WEDDING: "Before Wedding Events",
  WEDDING: "Wedding",
  BIRTHDAY: "Birthday",
  CUSTOM: "Custom Event",
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ADVANCE: "Advance",
  PARTIAL: "Part Payment",
  FULL: "Full Payment",
  EMI: "EMI Installment",
};

export const LICENSE_TIER_LABELS: Record<string, string> = {
  TRIAL: "Trial (30 days)",
  BASIC: "Basic",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

export const LICENSE_LIMITS: Record<string, { maxClients: number; maxEvents: number; maxStaff: number }> = {
  TRIAL: { maxClients: 10, maxEvents: 5, maxStaff: 2 },
  BASIC: { maxClients: 50, maxEvents: 30, maxStaff: 3 },
  PROFESSIONAL: { maxClients: 200, maxEvents: 100, maxStaff: 10 },
  ENTERPRISE: { maxClients: 9999, maxEvents: 9999, maxStaff: 50 },
};
