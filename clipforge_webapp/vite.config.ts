import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: ["4b52-86-132-97-150.ngrok-free.app"],
  },
});
