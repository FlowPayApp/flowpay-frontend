import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

function withClientIP(target: string, edgeSecret: string, extra?: ProxyOptions["configure"]): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    configure: (proxy, options) => {
      proxy.on("proxyReq", (proxyReq, req) => {
        proxyReq.removeHeader("x-flowpay-client-ip");
        proxyReq.removeHeader("x-flowpay-edge");
        const remote = req.socket?.remoteAddress?.replace(/^::ffff:/, "");
        if (remote) proxyReq.setHeader("x-flowpay-client-ip", remote);
        if (edgeSecret) proxyReq.setHeader("x-flowpay-edge", edgeSecret);
      });
      extra?.(proxy, options);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendURL = env.FLOWPAY_DEV_BACKEND_URL || "http://127.0.0.1:8080";
  const paymentsURL = env.FLOWPAY_DEV_PAYMENTS_URL || "http://127.0.0.1:8081";
  const ssoURL = env.FLOWPAY_DEV_SSO_URL || "http://127.0.0.1:9090";
  const edgeSecret = (env.FLOWPAY_EDGE_SECRET || "").trim();

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api/public/pay": withClientIP(paymentsURL, edgeSecret),
        "/api/public/webpay": withClientIP(paymentsURL, edgeSecret),
        "/api/public/khipu": withClientIP(paymentsURL, edgeSecret),
        "/api/public/fintoc": withClientIP(paymentsURL, edgeSecret),
        "/api/payment-tokens": withClientIP(paymentsURL, edgeSecret),
        "/api/payments": withClientIP(paymentsURL, edgeSecret),
        "/api/auth": withClientIP(ssoURL, edgeSecret, (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.headers.host) {
              proxyReq.setHeader("x-forwarded-host", req.headers.host);
              proxyReq.setHeader("x-flowpay-public-host", req.headers.host);
            }
            const proto = req.headers["x-forwarded-proto"];
            const publicProto = Array.isArray(proto) ? proto[0] : proto || "http";
            proxyReq.setHeader("x-forwarded-proto", publicProto);
            proxyReq.setHeader("x-flowpay-public-proto", publicProto);
          });
        }),
        "/api/clients": withClientIP(ssoURL, edgeSecret),
        "/api": withClientIP(backendURL, edgeSecret),
        "/health": withClientIP(backendURL, edgeSecret),
        "/auth": withClientIP(ssoURL, edgeSecret),
      },
    },
  };
});
