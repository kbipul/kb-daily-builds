import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /handoff-inspector/
  base: "/handoff-inspector/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
