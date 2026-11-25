import { Router } from "express";
import { devBypass } from "../../middleware/dev-bypass.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { requireTenantScope } from "../../middleware/require-tenant-scope.js";
import { propertyScope } from "../lease/middleware/property-scope.js";
import {
  createNoticeHandler,
  updateNoticeStatusHandler,
} from "./controllers/notice.controller.js";
import {
  evaluateRiskHandler,
  getRiskProfileHandler,
  listTenantsHandler,
} from "./controllers/tenant.controller.js";

export const tenantRouter: Router = Router();

const managerOnly = requireRole(["LANDLORD", "MANAGER"]);

tenantRouter.get("/", propertyScope, managerOnly, listTenantsHandler);

// Tenants submit their own notices; the acting tenant is derived from
// TenantLink and the property must match one of their leases.
tenantRouter.post(
  "/notices",
  devBypass,
  requireAuth,
  requireTenantScope,
  createNoticeHandler,
);

tenantRouter.patch(
  "/notices/:id/status",
  propertyScope,
  managerOnly,
  updateNoticeStatusHandler,
);
tenantRouter.post(
  "/:id/evaluate-risk",
  propertyScope,
  managerOnly,
  evaluateRiskHandler,
);
tenantRouter.get(
  "/:id/risk-profile",
  propertyScope,
  managerOnly,
  getRiskProfileHandler,
);