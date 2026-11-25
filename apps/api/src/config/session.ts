import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { RequestHandler } from "express";
import { Pool } from "pg";
import { env } from "./env.js";

const PgSession = connectPgSimple(session);

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const sessionMiddleware: RequestHandler = session({
  store: new PgSession({
    pool,
    // The sessions table is created by migration 011_auth_authz.
    createTableIfMissing: false,
  }),
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