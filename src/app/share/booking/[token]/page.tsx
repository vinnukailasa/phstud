"use client";

import { PrintableBooking } from "@/components/print/PrintableBooking";
import { Printer } from "lucide-react";

export default function ShareBookingPage({ params }: { params: { token: string } }) {
  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="no-print mx-auto mb-4 flex max-w-2xl justify-end gap-2 px-4">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm text-white"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>
      <PrintableBooking token={params.token} />
    </div>
  );
}
