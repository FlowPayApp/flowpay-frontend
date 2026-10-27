import { next, rewrite } from "@vercel/functions/middleware";
import { responseHeaders } from "./securityHeaders.js";

declare const process: { env: Record<string, string | undefined> };

function origin(name: string): string {
  let value = (process.env[name] ?? "").trim().replace(/\/$/, "");
  if (value && !/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  return value;
}

function upstream(pathname: string): { base: string; name: string } | null {
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    return { base: origin("FLOWPAY_SSO_URL"), name: "FLOWPAY_SSO_URL" };
  }
  if (pathname === "/auth" || pathname.startsWith("/auth/")) {
    return { base: origin("FLOWPAY_SSO_URL"), name: "FLOWPAY_SSO_URL" };
  }
  if (pathname === "/api/clients" || pathname.startsWith("/api/clients/")) {
    return { base: origin("FLOWPAY_SSO_URL"), name: "FLOWPAY_SSO_URL" };
  }
  if (
    pathname.startsWith("/api/public/pay") ||
    pathname.startsWith("/api/public/webpay") ||
    pathname.startsWith("/api/public/khipu") ||
    pathname.startsWith("/api/public/fintoc") ||
    pathname === "/api/payment-tokens" ||
    pathname.startsWith("/api/payment-tokens/") ||
    pathname === "/api/payments" ||
    pathname.startsWith("/api/payments/")
  ) {
    return { base: origin("FLOWPAY_PAYMENTS_URL"), name: "FLOWPAY_PAYMENTS_URL" };
  }
  if (pathname === "/health" || pathname === "/api" || pathname.startsWith("/api/")) {
    return { base: origin("FLOWPAY_BACKEND_URL"), name: "FLOWPAY_BACKEND_URL" };
  }
  return null;
}

export const config = {
  matcher: ["/((?!assets/|brand/|favicon\\.png).*)"],
};

function secure(response: Response, request: Request, proxied: boolean): Response {
  responseHeaders(request, proxied).forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export default function middleware(request: Request) {
  const incoming = new URL(request.url);
  const target = upstream(incoming.pathname);
  if (!target) {
    if (incoming.pathname === "/landing" || incoming.pathname === "/landing/") {
      const response = Response.redirect(new URL("/" + incoming.search, request.url), 308);
      return secure(response, request, false);
    }
    if (incoming.pathname.includes(".")) {
      return secure(next(), request, false);
    }
    return secure(rewrite(new URL("/index.html", request.url)), request, false);
  }
  if (!target.base) {
    const headers = responseHeaders(request, true);
    headers.set("content-type", "application/json; charset=utf-8");
    return new Response(JSON.stringify({ error: `Falta ${target.name} en las variables de Vercel` }), {
      status: 503,
      headers,
    });
  }
  const dest = new URL(incoming.pathname + incoming.search, target.base);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const publicHost = incoming.host;
  const publicProto = incoming.protocol.replace(":", "");
  headers.set("x-forwarded-host", publicHost);
  headers.set("x-forwarded-proto", publicProto);
  headers.set("x-flowpay-public-host", publicHost);
  headers.set("x-flowpay-public-proto", publicProto);
  return secure(rewrite(dest, { request: { headers } }), request, true);
}
