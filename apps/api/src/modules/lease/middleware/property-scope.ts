import type { RequestHandler } from "express";
import { devBypass } from "../../../middleware/dev-bypass.js";
import { requireAuth } from "../../../middleware/require-auth.js";
import { requirePropertyScope } from "../../../middleware/require-property-scope.js";

/**
 * Session-authenticated, property-authorised scope.
 *
 * The propertyId comes from the session/membership. The x-property-id header
 * is only honoured by the gated dev bypass.
 */
export const propertyScope: RequestHandler[] = [
  devBypass,
  requireAuth,
  requirePropertyScope,
];