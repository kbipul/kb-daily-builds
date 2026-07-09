import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /mood-of-the-room/
  base: "/mood-of-the-room/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
});
