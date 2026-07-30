import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";

const packageSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  items: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireSession(["STUDIO_ADMIN", "STUDIO_STAFF"]);
    const packages = await prisma.package.findMany({
      where: { studioId: session.studioId! },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(packages);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(["STUDIO_ADMIN"]);
    const body = await request.json();
    const data = packageSchema.parse(body);

    const pkg = await prisma.package.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        items: data.items ? JSON.stringify(data.items) : null,
        studioId: session.studioId!,
      },
    });

    return NextResponse.json(pkg, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}
