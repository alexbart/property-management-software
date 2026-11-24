import { Router } from "express";
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

maintenanceRouter.post("/tickets", createTicketHandler);
maintenanceRouter.get("/tickets", listTicketsHandler);
maintenanceRouter.get("/tickets/:id", getTicketHandler);
maintenanceRouter.patch("/tickets/:id/status", updateStatusHandler);
maintenanceRouter.patch("/tickets/:id/cost", updateCostHandler);