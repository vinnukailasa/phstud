import { runSeed } from "../src/lib/seed";
import { prisma } from "../src/lib/prisma";

runSeed()
  .then((result) => {
    console.log(`Super Admin: ${result.superAdminEmail}`);
    console.log(`Demo Studio Admin: ${result.demoStudioAdmin} / Demo@123`);
    console.log("Seed completed!");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
