"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PhotographerAvailability {
  id: string;
  name: string;
  specialty: string | null;
  available: boolean;
  bookings: { eventId: string; eventTitle: string }[];
}

interface PhotographerPickerProps {
  label?: string;
  date: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeBookingId?: string;
}

export function PhotographerPicker({
  label = "Photographers",
  date,
  selectedIds,
  onChange,
  excludeBookingId,
}: PhotographerPickerProps) {
  const [photographers, setPhotographers] = useState<PhotographerAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) {
      fetch("/api/photographers")
        .then((r) => r.json())
        .then((list) =>
          setPhotographers(
            list.map((p: { id: string; name: string; specialty: string | null }) => ({
              ...p,
              available: true,
              bookings: [],
            }))
          )
        );
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({ date });
    if (excludeBookingId) params.set("excludeBookingId", excludeBookingId);

    fetch(`/api/photographers/availability?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setPhotographers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date, excludeBookingId]);

  if (photographers.length === 0 && !loading) {
    return <p className="text-sm text-slate-400">No photographers added yet</p>;
  }

  return (
    <div>
      <label className="label">
        {label}
        {date && (
          <span className="ml-2 font-normal text-slate-400">
            {loading ? "Checking availability…" : "— green = available, amber = booked"}
          </span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        {photographers.map((p) => {
          const selected = selectedIds.includes(p.id);
          const busy = date && !p.available;

          return (
            <label
              key={p.id}
              title={
                busy
                  ? `Booked: ${p.bookings.map((b) => b.eventTitle).join(", ")}`
                  : "Available"
              }
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                selected
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                  : busy
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selected}
                onChange={() => {
                  onChange(
                    selected ? selectedIds.filter((id) => id !== p.id) : [...selectedIds, p.id]
                  );
                }}
              />
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  busy ? "bg-amber-500" : "bg-emerald-500"
                )}
              />
              {p.name}
              {busy && <span className="text-xs opacity-70">(busy)</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
