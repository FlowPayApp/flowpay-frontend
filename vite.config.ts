import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Clientes viven en flowpay-sso (misma DB); el resto de /api sigue en flowpay-backend.
      "/api/clients": {
        target: "http://127.0.0.1:9090",
        changeOrigin: true,
      },
      "/api": "http://127.0.0.1:8080",
      "/health": "http://127.0.0.1:8080",
      "/auth": {
        target: "http://127.0.0.1:9090",
        changeOrigin: true,
      },
    },
  },
});
