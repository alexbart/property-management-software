import { PrismaClient } from "@prisma/client";

// A shared Prisma client prevents unnecessary database
// connections during development hot reloads.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
