import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Leading dot allows any subdomain, so changing ngrok URLs don't get blocked.
  server: {
    allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.app", ".ngrok.io"],
  },
  preview: {
    allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.app", ".ngrok.io"],
  },
  build: {
    outDir: "dist",
    sourcemap: false, // don't ship source code to browsers
    rollupOptions: {
      output: {
        // Long-cached vendor chunks that rarely change.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/recharts|d3-|victory/.test(id)) return "charts";
          if (/react-dom|react-router|scheduler|\/react\//.test(id)) return "react";
          if (/framer-motion|motion-dom|motion-utils/.test(id)) return "motion";
          if (/socket\.io|engine\.io/.test(id)) return "realtime";
        },
      },
    },
  },
});
