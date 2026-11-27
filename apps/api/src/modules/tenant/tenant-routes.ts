import { Router } from "express";
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

tenantRouter.get("/", propertyScope, listTenantsHandler);
tenantRouter.post("/notices", propertyScope, createNoticeHandler);
tenantRouter.patch(
  "/notices/:id/status",
  propertyScope,
  updateNoticeStatusHandler,
);
tenantRouter.post(
  "/:id/evaluate-risk",
  propertyScope,
  evaluateRiskHandler,
);
tenantRouter.get("/:id/risk-profile", propertyScope, getRiskProfileHandler);