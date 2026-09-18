import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Keep generated asset URLs valid under a GitHub Pages repository subpath.
  base: "./",
  plugins: [react()],
});
