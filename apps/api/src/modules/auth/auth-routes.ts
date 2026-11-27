import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
} from "./controllers/auth.controller.js";

export const authRouter: Router = Router();

authRouter.post("/login", loginHandler);
authRouter.post("/register", registerHandler);
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", requireAuth, meHandler);