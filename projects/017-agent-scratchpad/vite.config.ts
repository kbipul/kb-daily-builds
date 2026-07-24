import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /agent-scratchpad/
  base: "/agent-scratchpad/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
