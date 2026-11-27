import type { Request, Response } from "express";
import { searchQuerySchema } from "@property-platform/contracts";
import type { SessionUser } from "../auth/services/auth.service.js";
import { search } from "./search-service.js";

/** GET /api/v1/search?q=... */
export async function searchHandler(req: Request, res: Response): Promise<void> {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", issues: parsed.error.issues },
    });
    return;
  }

  const user = res.locals.user as SessionUser | undefined;
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED" } });
    return;
  }

  try {
    const results = await search(parsed.data.q, user);
    res.status(200).json({ data: results });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
}