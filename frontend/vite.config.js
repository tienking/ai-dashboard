import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/projects/ai-dashboard/",
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8002",
    },
  },
});
