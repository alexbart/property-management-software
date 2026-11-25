import { Router } from "express";
import { requireRole } from "../../middleware/require-role.js";
import {
  activateLeaseHandler,
  createLeaseHandler,
  terminateLeaseHandler,
} from "./controllers/lease.controller.js";
import { propertyScope } from "./middleware/property-scope.js";

export const leaseRouter: Router = Router();

// Every lease operation is scoped to the caller's property.
leaseRouter.use(propertyScope);

const managerOnly = requireRole(["LANDLORD", "MANAGER"]);

leaseRouter.post("/", managerOnly, createLeaseHandler);
leaseRouter.post("/:id/activate", managerOnly, activateLeaseHandler);
leaseRouter.post("/:id/terminate", managerOnly, terminateLeaseHandler);