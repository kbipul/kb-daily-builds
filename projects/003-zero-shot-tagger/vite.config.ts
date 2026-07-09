import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /zero-shot-tagger/
  base: "/zero-shot-tagger/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
});
