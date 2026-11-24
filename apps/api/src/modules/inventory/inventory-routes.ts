import { Router } from "express";
import {
  getEffective,
  listAmenities,
  listPolicies,
} from "./inventory-controller.js";

// NOTE: authentication/authorization middleware is not wired yet (ADR-004).
// These endpoints are placeholders for the inventory read model and must be
// protected before production exposure.
export const inventoryRouter: Router = Router();

inventoryRouter.get("/amenities", listAmenities);
inventoryRouter.get("/policies", listPolicies);
inventoryRouter.get("/effective", getEffective);