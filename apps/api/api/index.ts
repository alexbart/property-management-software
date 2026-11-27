import { app } from "../src/app.js";

// Vercel serverless entry for the Express API service.
// The SPA (web) reaches this via the /api/* rewrite on the same domain.
export default app;