import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /hybrid-search-ts/
  base: "/hybrid-search-ts/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
});
