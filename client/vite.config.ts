import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@tabellone/shared": path.resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    host: true, // espone su tutte le interfacce (0.0.0.0) per LAN
    port: 5173,
    strictPort: true,
  },
});
