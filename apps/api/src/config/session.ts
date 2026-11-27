import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { RequestHandler } from "express";
import { Pool } from "pg";
import { env } from "./env.js";

const PgSession = connectPgSimple(session);

const pool = new Pool({ connectionString: env.DATABASE_URL });

const sessionStore = new PgSession({
  pool,
  tableName: "sessions",
  createTableIfMissing: false,
});

sessionStore.on("error", (err) => {
  console.error("Session store error:", err);
});

export const sessionMiddleware: RequestHandler = session({
  store: sessionStore,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8,
  },
});