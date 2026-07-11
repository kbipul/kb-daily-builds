import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /similar-or-not/
  base: "/similar-or-not/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
});
