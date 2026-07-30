"use client";

import { Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { whatsAppUrl } from "@/lib/share";

interface SharePrintActionsProps {
  clientPhone: string;
  message: string;
  printUrl?: string;
  printLabel?: string;
  onBookingPrintLink?: () => Promise<string | null>;
  onShareLink?: () => Promise<string | null>;
  label?: string;
}

export function SharePrintActions({
  clientPhone,
  message,
  printUrl,
  printLabel = "Invoice",
  onBookingPrintLink,
  onShareLink,
  label = "Share",
}: SharePrintActionsProps) {
  const handleWhatsApp = async () => {
    let msg = message;
    if (onShareLink) {
      const url = await onShareLink();
      if (url) msg = `${message}\n\nView & print: ${url}`;
    }
    window.open(whatsAppUrl(clientPhone, msg), "_blank");
  };

  const openUrl = (url: string) => window.open(url, "_blank");

  const handlePrintBooking = async () => {
    if (onBookingPrintLink) {
      const url = await onBookingPrintLink();
      if (url) openUrl(url);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {onBookingPrintLink && (
        <Button type="button" variant="secondary" className="!py-1.5 !px-3 !text-xs" onClick={handlePrintBooking}>
          <Printer className="h-3.5 w-3.5" /> Print Booking
        </Button>
      )}
      {printUrl && (
        <Button type="button" variant="secondary" className="!py-1.5 !px-3 !text-xs" onClick={() => openUrl(printUrl)}>
          <Printer className="h-3.5 w-3.5" /> Print {printLabel}
        </Button>
      )}
      <Button type="button" className="!py-1.5 !px-3 !text-xs !bg-[#25D366] hover:!bg-[#20bd5a]" onClick={handleWhatsApp}>
        <Share2 className="h-3.5 w-3.5" /> WhatsApp {label}
      </Button>
    </div>
  );
}
