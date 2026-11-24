import { Router } from "express";
import {
  activateLeaseHandler,
  createLeaseHandler,
  terminateLeaseHandler,
} from "./controllers/lease.controller.js";
import { propertyScope } from "./middleware/property-scope.js";

export const leaseRouter: Router = Router();

// Every lease operation is scoped to the caller's property (placeholder
// header-based scope until ADR-004 authentication is implemented).
leaseRouter.use(propertyScope);

leaseRouter.post("/", createLeaseHandler);
leaseRouter.post("/:id/activate", activateLeaseHandler);
leaseRouter.post("/:id/terminate", terminateLeaseHandler);