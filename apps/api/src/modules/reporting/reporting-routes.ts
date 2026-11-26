import { Router } from "express";
import { propertyScope } from "../lease/middleware/property-scope.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";
import {
  maintenanceHandler,
  receiptHandler,
  rentRollHandler,
} from "./controllers/reporting.controller.js";

export const reportingRouter: Router = Router();

// Exports are CPU-intensive; cap each user to 10 requests per minute.
const exportRateLimiter = createRateLimiter({ max: 10, windowMs: 60_000 });

// All reporting endpoints require auth, property scope, and rate limiting.
reportingRouter.use(requireAuth);
reportingRouter.use(propertyScope);
reportingRouter.use(exportRateLimiter);

reportingRouter.get(
  "/properties/:propertyId/rent-roll.csv",
  rentRollHandler,
);
reportingRouter.get("/payments/:paymentId/receipt.pdf", receiptHandler);
reportingRouter.get(
  "/properties/:propertyId/maintenance.csv",
  maintenanceHandler,
);