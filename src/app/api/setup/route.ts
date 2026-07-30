import { execSync } from "child_process";
import { NextResponse } from "next/server";
import { runSeed } from "@/lib/seed";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json(
      { error: "SETUP_SECRET is not configured in environment variables." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== setupSecret) {
    return NextResponse.json({ error: "Invalid or missing secret." }, { status: 401 });
  }

  const steps: string[] = [];

  try {
    try {
      execSync("npx prisma db push --skip-generate", {
        env: process.env,
        stdio: "pipe",
        encoding: "utf-8",
      });
      steps.push("Database tables created/updated (prisma db push)");
    } catch {
      steps.push("prisma db push skipped (tables may already exist from build step)");
    }

    const { superAdminEmail, demoStudioAdmin } = await runSeed();
    steps.push("Initial data seeded (super admin + demo studio)");

    return NextResponse.json({
      success: true,
      message:
        "Setup complete! Log in at your app URL, then remove SETUP_SECRET from Vercel and redeploy.",
      steps,
      credentials: {
        superAdmin: {
          email: superAdminEmail,
          password: "Use your SUPER_ADMIN_PASSWORD env value",
        },
        demoStudio: {
          email: demoStudioAdmin,
          password: "Demo@123",
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup failed";
    return NextResponse.json({ error: message, steps }, { status: 500 });
  }
}
