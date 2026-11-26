import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import {
  getPreferencesHandler,
  listNotificationsHandler,
  markAllReadHandler,
  markReadHandler,
  unreadCountHandler,
  updatePreferenceHandler,
} from "./controllers/notification.controller.js";

export const notificationRouter: Router = Router();

// All notification routes are scoped to the authenticated user.
notificationRouter.use(requireAuth);

notificationRouter.get("/", listNotificationsHandler);
notificationRouter.get("/unread-count", unreadCountHandler);
notificationRouter.patch("/:id/read", markReadHandler);
notificationRouter.post("/mark-all-read", markAllReadHandler);
notificationRouter.get("/preferences", getPreferencesHandler);
notificationRouter.put("/preferences", updatePreferenceHandler);