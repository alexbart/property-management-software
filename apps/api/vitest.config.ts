import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: {
      // Legacy API tests exercise the gated dev header bypass. Production
      // ignores the header regardless of this value.
      AUTH_DEV_BYPASS: "true",
    },
  },
});