import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: the site serves from /kb-agent-framework/
  base: "/kb-agent-framework/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
