/**
 * Seed script.
 *
 * Applies the MongoDB indexes that back the schema's unique constraints, then
 * creates an administrator with a realistic starting configuration.
 * Safe to re-run.
 */
import { prisma } from "@/lib/prisma";
import { ensureIndexes } from "@/features/setup/indexes";
import { seedWorkspace } from "@/features/setup/seed";

async function main(): Promise<void> {
  const indexes = await ensureIndexes();
  console.log(`Indexes: ${indexes.created} created, ${indexes.alreadyPresent} already present.`);

  const result = await seedWorkspace({
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
    name: process.env.SEED_ADMIN_NAME ?? "Admin",
  });

  console.log(
    `Seeded ${result.email} (${result.role}) with ${result.searchProfiles} search profiles and ${result.portfolioProjects} portfolio projects.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
