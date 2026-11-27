import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy the API through the dev server so the browser talks to a single
    // origin. This keeps the session cookie first-party (avoids cross-origin
    // cookie/SameSite issues between :5173 and :4000).
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});