import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { sessionMiddleware } from "./config/session.js";
import { prisma } from "./database/prisma.js";
import { inventoryRouter } from "./modules/inventory/inventory-routes.js";
import { leaseRouter } from "./modules/lease/lease-routes.js";
import { financeRouter } from "./modules/finance/finance-routes.js";
import { maintenanceRouter } from "./modules/maintenance/maintenance-routes.js";
import { tenantRouter } from "./modules/tenant/tenant-routes.js";

export const app: ReturnType<typeof express> = express();

// Apply baseline HTTP security headers.
app.use(helmet());

// Restrict browser access to the configured frontend.
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

// Cookie session (Postgres store). Must run before any route.
app.use(sessionMiddleware);

// Inventory read model (catalogue + effective configuration).
app.use("/api/v1/inventory", inventoryRouter);

// Lease lifecycle.
app.use("/api/v1/leases", leaseRouter);

// Finance: M-Pesa webhook (public) + scoped payment/balance routes.
app.use("/api/v1", financeRouter);

// Tenant risk evaluation and profile.
app.use("/api/v1/tenants", tenantRouter);

// Maintenance work orders.
app.use("/api/v1/maintenance", maintenanceRouter);

// Basic service health check.
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "property-management-api",
  });
});

// Database readiness check.
app.get("/api/v1/health/database", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "error",
      database: "unavailable",
    });
  }
});
