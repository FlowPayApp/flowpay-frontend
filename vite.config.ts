import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendURL = env.FLOWPAY_DEV_BACKEND_URL || "http://127.0.0.1:8080";
  const paymentsURL = env.FLOWPAY_DEV_PAYMENTS_URL || "http://127.0.0.1:8081";
  const ssoURL = env.FLOWPAY_DEV_SSO_URL || "http://127.0.0.1:9090";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api/public/pay": {
          target: paymentsURL,
          changeOrigin: true,
        },
        "/api/public/webpay": {
          target: paymentsURL,
          changeOrigin: true,
        },
        "/api/payment-tokens": {
          target: paymentsURL,
          changeOrigin: true,
        },
        "/api/payments": {
          target: paymentsURL,
          changeOrigin: true,
        },
        "/api/auth": {
          target: ssoURL,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              if (req.headers.host) proxyReq.setHeader("x-forwarded-host", req.headers.host);
              const proto = req.headers["x-forwarded-proto"];
              proxyReq.setHeader("x-forwarded-proto", Array.isArray(proto) ? proto[0] : proto || "http");
            });
          },
        },
        "/api/clients": {
          target: ssoURL,
          changeOrigin: true,
        },
        "/api": backendURL,
        "/health": backendURL,
        "/auth": {
          target: ssoURL,
          changeOrigin: true,
        },
      },
    },
  };
});
