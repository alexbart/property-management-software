import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import {
  createAmenityHandler,
  createPolicyHandler,
  deactivateAmenityHandler,
  deactivatePolicyHandler,
  getEffective,
  listAmenities,
  listPolicies,
  updateAmenityHandler,
  updatePolicyHandler,
} from "./inventory-controller.js";

// Reads are open; catalogue mutations are restricted to platform admins.
export const inventoryRouter: Router = Router();

const adminOnly = requireRole(["PLATFORM_ADMIN"]);

inventoryRouter.get("/amenities", listAmenities);
inventoryRouter.get("/policies", listPolicies);
inventoryRouter.get("/effective", getEffective);

inventoryRouter.post("/amenities", requireAuth, adminOnly, createAmenityHandler);
inventoryRouter.patch(
  "/amenities/:id",
  requireAuth,
  adminOnly,
  updateAmenityHandler,
);
inventoryRouter.delete(
  "/amenities/:id",
  requireAuth,
  adminOnly,
  deactivateAmenityHandler,
);

inventoryRouter.post("/policies", requireAuth, adminOnly, createPolicyHandler);
inventoryRouter.patch(
  "/policies/:id",
  requireAuth,
  adminOnly,
  updatePolicyHandler,
);
inventoryRouter.delete(
  "/policies/:id",
  requireAuth,
  adminOnly,
  deactivatePolicyHandler,
);