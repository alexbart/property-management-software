import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { devBypass } from "../../middleware/dev-bypass.js";
import { propertyScope } from "../lease/middleware/property-scope.js";
import {
  getEffective,
  listAmenities,
  listPolicies,
} from "./inventory-controller.js";

export const inventoryRouter: Router = Router();

const authOnly = [devBypass, requireAuth];

inventoryRouter.get("/amenities", authOnly, listAmenities);
inventoryRouter.get("/policies", authOnly, listPolicies);
inventoryRouter.get("/effective", propertyScope, getEffective);