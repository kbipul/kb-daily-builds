import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /agent-memory-inspector/
  base: "/agent-memory-inspector/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
