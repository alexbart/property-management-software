import "dotenv/config";
import { prisma } from "../src/database/prisma.js";
import { hashPassword } from "../src/modules/auth/services/auth.service.js";

async function main() {
  const email = (process.argv[2] ?? "alexbart695@gmail.com").trim().toLowerCase();
  const password = process.argv[3] ?? "Kamurens@695";

  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters");
  }

  const { passwordHash, passwordSalt } = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, passwordSalt, role: "PLATFORM_ADMIN", active: true },
    create: { email, passwordHash, passwordSalt, role: "PLATFORM_ADMIN" },
    select: { id: true, email: true, role: true, active: true },
  });

  console.log("Seeded admin:", user);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});