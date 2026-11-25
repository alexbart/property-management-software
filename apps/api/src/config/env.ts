import "dotenv/config";
import { z } from "zod";

// Validate application configuration before the server starts.
// Missing required configuration should stop startup immediately.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  MPESA_CONSUMER_KEY: z.string().min(1),
  MPESA_CONSUMER_SECRET: z.string().min(1),
  MPESA_SHORTCODE: z.string().min(1),
  MPESA_PASSKEY: z.string().min(1),
  MPESA_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  MPESA_CALLBACK_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid application configuration:", parsed.error.flatten());
  throw new Error("Application configuration validation failed.");
}

export const env = parsed.data;
