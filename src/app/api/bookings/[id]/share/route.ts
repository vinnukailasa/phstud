import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { generateShareToken } from "@/lib/share";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const booking = await prisma.event.findFirst({
      where: { id: params.id, studioId: session.studioId!, parentId: null },
      include: { invoices: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let shareToken = booking.shareToken;
    if (!shareToken) {
      shareToken = generateShareToken();
      await prisma.event.update({ where: { id: booking.id }, data: { shareToken } });
    }

    const invoice = booking.invoices[0];
    let invoiceShareToken = invoice?.shareToken;
    if (invoice && !invoiceShareToken) {
      invoiceShareToken = generateShareToken();
      await prisma.invoice.update({ where: { id: invoice.id }, data: { shareToken: invoiceShareToken } });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      shareToken,
      shareUrl: `${baseUrl}/share/booking/${shareToken}`,
      invoiceShareUrl: invoiceShareToken ? `${baseUrl}/share/invoice/${invoiceShareToken}` : null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }
}
