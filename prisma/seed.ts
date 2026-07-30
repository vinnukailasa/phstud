import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@phstud.local";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "Admin@123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        name: "Super Admin",
        role: "SUPER_ADMIN",
      },
    });
    console.log(`Super Admin created: ${adminEmail}`);
  }

  // Demo studio for testing
  const demoStudio = await prisma.studio.upsert({
    where: { slug: "demo-studio" },
    update: {},
    create: {
      name: "Demo Photo Studio",
      slug: "demo-studio",
      email: "demo@photostudio.com",
      phone: "+91 98765 43210",
      address: "123 Studio Lane, Mumbai",
      licenseTier: "PROFESSIONAL",
      licenseExpires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      primaryColor: "#7c3aed",
      accentColor: "#f59e0b",
    },
  });

  const demoAdminEmail = "admin@demo-studio.com";
  const existingDemoAdmin = await prisma.user.findUnique({
    where: { email: demoAdminEmail },
  });

  if (!existingDemoAdmin) {
    const hashed = await bcrypt.hash("Demo@123", 12);
    await prisma.user.create({
      data: {
        email: demoAdminEmail,
        password: hashed,
        name: "Demo Studio Admin",
        role: "STUDIO_ADMIN",
        studioId: demoStudio.id,
      },
    });
    console.log(`Demo Studio Admin created: ${demoAdminEmail} / Demo@123`);
  }

  // Default packages
  const packageCount = await prisma.package.count({
    where: { studioId: demoStudio.id },
  });

  if (packageCount === 0) {
    await prisma.package.createMany({
      data: [
        {
          name: "Pre-Wedding Classic",
          description: "4-hour shoot, 50 edited photos, 1 location",
          price: 25000,
          items: JSON.stringify(["4 hours coverage", "50 edited photos", "1 location", "Online gallery"]),
          studioId: demoStudio.id,
        },
        {
          name: "Wedding Premium",
          description: "Full day coverage, 500+ photos, album included",
          price: 150000,
          items: JSON.stringify(["Full day coverage", "2 photographers", "500+ edited photos", "Premium album", "Highlight video"]),
          studioId: demoStudio.id,
        },
        {
          name: "Birthday Basic",
          description: "2-hour party coverage, 30 edited photos",
          price: 8000,
          items: JSON.stringify(["2 hours coverage", "30 edited photos", "Online gallery"]),
          studioId: demoStudio.id,
        },
      ],
    });
    console.log("Demo packages created");
  }

  // Demo photographer
  const photographerCount = await prisma.photographer.count({
    where: { studioId: demoStudio.id },
  });

  if (photographerCount === 0) {
    await prisma.photographer.createMany({
      data: [
        { name: "Rahul Sharma", phone: "+91 98765 11111", specialty: "Weddings", studioId: demoStudio.id },
        { name: "Priya Patel", phone: "+91 98765 22222", specialty: "Pre-Wedding", studioId: demoStudio.id },
      ],
    });
    console.log("Demo photographers created");
  }

  console.log("Seed completed!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
