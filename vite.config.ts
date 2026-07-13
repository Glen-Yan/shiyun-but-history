import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: {
    port: 5200,
    strictPort: true,
  },
  build: {
    target: "ES2022",
    chunkSizeWarningLimit: 700,
  },
});
