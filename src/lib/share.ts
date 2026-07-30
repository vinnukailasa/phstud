import { randomBytes } from "crypto";

export function generateShareToken() {
  return randomBytes(12).toString("base64url");
}

export function buildUpiPayUrl(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}) {
  const q = new URLSearchParams({
    pa: params.upiId,
    pn: params.payeeName.slice(0, 50),
    am: params.amount.toFixed(2),
    cu: "INR",
    tn: params.note.slice(0, 100),
  });
  return `upi://pay?${q.toString()}`;
}

export function formatPhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91")) return digits;
  return digits;
}

export function whatsAppUrl(phone: string | null, message: string) {
  const text = encodeURIComponent(message);
  if (phone) {
    return `https://wa.me/${formatPhoneForWhatsApp(phone)}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

export function formatCurrencyPlain(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
