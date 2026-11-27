import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    testTimeout: 15000,
    env: {
      // The test suite authenticates via the x-user-id dev bypass (ADR-004 is
      // still pending). Enable it here so CI, which does not load apps/api/.env,
      // matches local development. requireAuth still rejects requests with no
      // x-user-id, so unauthenticated cases remain covered.
      AUTH_DEV_BYPASS: "true",
    },
  },
});