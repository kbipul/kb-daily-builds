import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for GitHub Pages: site serves from /bhasha-detect/
  base: "/bhasha-detect/",
  plugins: [react()],
});
