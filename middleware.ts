import { next, rewrite } from "@vercel/functions";

declare const process: { env: Record<string, string | undefined> };

function origin(name: string): string {
  let value = (process.env[name] ?? "").trim().replace(/\/$/, "");
  if (value && !/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  return value;
}

function upstream(pathname: string): { base: string; name: string } | null {
  if (pathname === "/auth" || pathname.startsWith("/auth/")) {
    return { base: origin("FLOWPAY_SSO_URL"), name: "FLOWPAY_SSO_URL" };
  }
  if (pathname === "/api/clients" || pathname.startsWith("/api/clients/")) {
    return { base: origin("FLOWPAY_SSO_URL"), name: "FLOWPAY_SSO_URL" };
  }
  if (
    pathname.startsWith("/api/public/pay") ||
    pathname.startsWith("/api/public/webpay") ||
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
  matcher: ["/auth/:path*", "/api/:path*", "/health"],
};

export default function middleware(request: Request) {
  const incoming = new URL(request.url);
  const target = upstream(incoming.pathname);
  if (!target) {
    return next();
  }
  if (!target.base) {
    return new Response(JSON.stringify({ error: `Falta ${target.name} en las variables de Vercel` }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const dest = new URL(incoming.pathname + incoming.search, target.base);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));
  return rewrite(dest, { request: { headers } });
}
