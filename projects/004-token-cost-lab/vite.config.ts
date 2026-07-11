import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /token-cost-lab/
  base: "/token-cost-lab/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
});
