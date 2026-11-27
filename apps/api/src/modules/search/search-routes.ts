import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { searchHandler } from "./search-controller.js";

export const searchRouter: Router = Router();

searchRouter.get("/", requireAuth, searchHandler);