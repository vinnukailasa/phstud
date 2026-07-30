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
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, studioId: session.studioId! },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const shareToken = invoice.shareToken || generateShareToken();
    if (!invoice.shareToken) {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { shareToken } });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      shareToken,
      shareUrl: `${baseUrl}/share/invoice/${shareToken}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }
}
