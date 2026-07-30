import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { buildUpiPayUrl } from "@/lib/share";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");
  const token = searchParams.get("token");
  const data = searchParams.get("data");

  try {
    let qrData = data;

    if (invoiceId || token) {
      const invoice = await prisma.invoice.findFirst({
        where: token ? { shareToken: token } : { id: invoiceId! },
        include: { studio: true, payments: { where: { status: "COMPLETED" } } },
      });
      if (!invoice?.studio.upiId) {
        return NextResponse.json({ error: "UPI ID not configured" }, { status: 400 });
      }
      const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
      const balance = invoice.total - paid;
      if (balance <= 0) {
        return NextResponse.json({ error: "No balance due" }, { status: 400 });
      }
      qrData = buildUpiPayUrl({
        upiId: invoice.studio.upiId,
        payeeName: invoice.studio.payeeName || invoice.studio.name,
        amount: balance,
        note: invoice.invoiceNumber,
      });
    }

    if (!qrData) {
      return NextResponse.json({ error: "Missing data or invoiceId" }, { status: 400 });
    }

    const png = await QRCode.toBuffer(qrData, { width: 280, margin: 2 });
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR" }, { status: 500 });
  }
}
