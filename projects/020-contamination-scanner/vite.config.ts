import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /contamination-scanner/
  base: "/contamination-scanner/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
