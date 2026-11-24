import { Router } from "express";
import { propertyScope } from "../lease/middleware/property-scope.js";
import { getArrearsHandler } from "./controllers/arrears.controller.js";
import {
  createManualPaymentHandler,
  getBalanceHandler,
  mpesaWebhookHandler,
} from "./controllers/finance.controller.js";

export const financeRouter: Router = Router();

// Public: Safaricom cannot send the property-scope header.
financeRouter.post("/webhooks/mpesa", mpesaWebhookHandler);

// Scoped routes apply the property scope individually so unrelated /api/v1
// routes (e.g. health) are not affected.
financeRouter.post("/finance/payments", propertyScope, createManualPaymentHandler);
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