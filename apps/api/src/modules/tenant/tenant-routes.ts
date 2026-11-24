import { Router } from "express";
import { propertyScope } from "../lease/middleware/property-scope.js";
import {
  evaluateRiskHandler,
  getRiskProfileHandler,
} from "./controllers/tenant.controller.js";

export const tenantRouter: Router = Router();

tenantRouter.post(
  "/:id/evaluate-risk",
  propertyScope,
  evaluateRiskHandler,
);
tenantRouter.get("/:id/risk-profile", propertyScope, getRiskProfileHandler);