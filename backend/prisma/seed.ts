/**
 * Prisma seed script — run with: npm run db:seed
 *
 * Creates a sample user and public circle for local development.
 */
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Sample dev user
  const user = await prisma.user.upsert({
    where: { wallet_address: "0x0000000000000000000000000000000000000001" },
    update: {},
    create: {
      id: uuidv4(),
      wallet_address: "0x0000000000000000000000000000000000000001",
      name: "Dev User",
      username: "devuser",
      avatar_emoji: "🎯",
      avatar_color: "#3a86ff",
    },
  });

  console.log("Created user:", user.id);

  // Sample public circle
  const circle = await prisma.circle.upsert({
    where: { invite_code: undefined },
    update: {},
    create: {
      id: uuidv4(),
      owner_id: user.id,
      name: "Dev Circle",
      description: "A sample circle for local development",
      category: "general",
      privacy: "public",
      avatar_emoji: "🔮",
      avatar_color: "#8338ec",
    },
  });

  console.log("Created circle:", circle.id);

  // Add owner as member
  await prisma.circleMember.upsert({
    where: {
      circle_id_user_id: { circle_id: circle.id, user_id: user.id },
    },
    update: {},
    create: {
      circle_id: circle.id,
      user_id: user.id,
      role: "owner",
    },
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
