import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { updateInvoiceStatus } from "@/lib/reminders";

const paymentSchema = z.object({
  amount: z.number().min(1),
  paymentType: z.enum(["ADVANCE", "PARTIAL", "FULL", "EMI"]),
  paymentDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  emiNumber: z.number().optional(),
  totalEmis: z.number().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, studioId: session.studioId! },
      include: {
        client: true,
        studio: true,
        event: {
          include: {
            subEvents: { where: { status: { not: "CANCELLED" } }, orderBy: { eventDate: "asc" } },
          },
        },
        lineItems: true,
        payments: { orderBy: { paymentDate: "desc" } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const paid = invoice.payments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({ ...invoice, paidAmount: paid, balance: invoice.total - paid });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const body = await request.json();
    const data = paymentSchema.parse(body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, studioId: session.studioId! },
      include: { payments: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const paid = invoice.payments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);

    if (paid + data.amount > invoice.total) {
      return NextResponse.json(
        { error: `Payment exceeds balance. Remaining: ${invoice.total - paid}` },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        amount: data.amount,
        paymentType: data.paymentType,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        reference: data.reference,
        notes: data.notes,
        emiNumber: data.emiNumber,
        totalEmis: data.totalEmis,
        invoiceId: params.id,
      },
    });

    await updateInvoiceStatus(params.id);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
