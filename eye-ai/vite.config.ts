import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// PORT / BASE_PATH are only relevant for local dev preview — default them so
// the same config works locally, on Vercel, and anywhere else with zero setup.
const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
});
