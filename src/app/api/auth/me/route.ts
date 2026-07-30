import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studioId: true,
      studio: {
        select: {
          id: true,
          name: true,
          slug: true,
          primaryColor: true,
          accentColor: true,
          surfaceColor: true,
          logoUrl: true,
          licenseTier: true,
        },
      },
    },
  });

  return NextResponse.json({ user });
}
