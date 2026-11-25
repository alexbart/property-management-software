import type { Request, Response } from "express";
import { ZodError } from "zod";
import { LoginDto, RegisterDto } from "@property-platform/contracts";
import { AuthError, AuthConflictError, login, register } from "../services/auth.service.js";

function handleError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", issues: error.issues },
    });
    return;
  }

  if (error instanceof AuthConflictError) {
    res.status(409).json({ error: { code: "CONFLICT", message: error.message } });
    return;
  }

  if (error instanceof AuthError) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: error.message } });
    return;
  }

  res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
}

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function resetLoginRateLimit(): void {
  loginAttempts.clear();
}

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record || now - record.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return true;
  }

  if (record.count >= LOGIN_MAX_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

/** POST /api/v1/auth/login */
export async function loginHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const ip = req.ip ?? "unknown";
    if (!checkRateLimit(ip)) {
      res.status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many login attempts" },
      });
      return;
    }

    const { email, password } = LoginDto.parse(req.body);
    const user = await login(email, password);

    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);
        res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
        return;
      }
      req.session.userId = user.id;
      res.status(200).json({
        data: { id: user.id, email: user.email, role: user.role },
      });
    });
  } catch (err: unknown) {
    handleError(res, err);
  }
}

/** POST /api/v1/auth/register */
export async function registerHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email, password, role } = RegisterDto.parse(req.body);

    if (process.env.NODE_ENV === "production" && role === "PLATFORM_ADMIN") {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Platform admin registration disabled in production",
        },
      });
      return;
    }

    const user = await register(email, password, role);
    res.status(201).json({
      data: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err: unknown) {
    handleError(res, err);
  }
}

/** POST /api/v1/auth/logout */
export async function logoutHandler(
  req: Request,
  res: Response,
): Promise<void> {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
      return;
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ data: { message: "Logged out" } });
  });
}

/** GET /api/v1/auth/me */
export async function meHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  const user = res.locals.user as { id: string; email: string; role: string } | undefined;

  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
    return;
  }

  res.status(200).json({ data: user });
}