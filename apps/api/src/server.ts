import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";

const server = app.listen(env.API_PORT, () => {
  console.log(`API running on http://localhost:${env.API_PORT}`);
});

// Gracefully release resources when the process stops.
async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  // Avoid hanging indefinitely during shutdown.
  setTimeout(() => {
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
