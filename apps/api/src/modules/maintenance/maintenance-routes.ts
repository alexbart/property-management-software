import { Router } from "express";
import { requireRole } from "../../middleware/require-role.js";
import { propertyScope } from "../lease/middleware/property-scope.js";
import {
  createTicketHandler,
  getTicketHandler,
  listTicketsHandler,
  updateCostHandler,
  updateStatusHandler,
} from "./controllers/maintenance.controller.js";

export const maintenanceRouter: Router = Router();

// All maintenance routes are property-scoped.
maintenanceRouter.use(propertyScope);

const managerOnly = requireRole(["LANDLORD", "MANAGER"]);

maintenanceRouter.post("/tickets", managerOnly, createTicketHandler);
maintenanceRouter.get("/tickets", listTicketsHandler);
maintenanceRouter.get("/tickets/:id", getTicketHandler);
maintenanceRouter.patch("/tickets/:id/status", managerOnly, updateStatusHandler);
maintenanceRouter.patch("/tickets/:id/cost", managerOnly, updateCostHandler);