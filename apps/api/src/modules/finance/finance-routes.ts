import { Router } from "express";
import { requireRole } from "../../middleware/require-role.js";
import { propertyScope } from "../lease/middleware/property-scope.js";
import { getArrearsHandler } from "./controllers/arrears.controller.js";
import {
  createManualPaymentHandler,
  getBalanceHandler,
  mpesaWebhookHandler,
} from "./controllers/finance.controller.js";
import { getReconciliationHandler } from "./controllers/reconciliation.controller.js";

export const financeRouter: Router = Router();

// Public: Safaricom cannot send the property-scope header.
financeRouter.post("/webhooks/mpesa", mpesaWebhookHandler);

// Scoped routes apply the property scope individually so unrelated /api/v1
// routes (e.g. health) are not affected.
financeRouter.post(
  "/finance/payments",
  propertyScope,
  requireRole(["LANDLORD", "MANAGER"]),
  createManualPaymentHandler,
);
financeRouter.get(
  "/finance/leases/:leaseId/balance",
  propertyScope,
  getBalanceHandler,
);
financeRouter.get(
  "/finance/leases/:leaseId/arrears",
  propertyScope,
  getArrearsHandler,
);
financeRouter.get(
  "/finance/properties/:propertyId/reconciliation",
  propertyScope,
  getReconciliationHandler,
);