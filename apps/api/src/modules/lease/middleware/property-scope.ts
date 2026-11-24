import type { NextFunction, Request, Response } from "express";

/**
 * Placeholder property scope.
 *
 * Real authentication/authorization is deferred to ADR-004. Until then the
 * caller's property scope is supplied via the `x-property-id` header so the
 * isolation checks can be exercised and tested. This MUST be replaced by
 * proper auth middleware before production exposure.
 */
export function propertyScope(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const propertyId = req.header("x-property-id");

  if (!propertyId) {
    res.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Missing property scope" },
    });
    return;
  }

  res.locals.propertyId = propertyId;
  next();
}