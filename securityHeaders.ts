/** Cabeceras de la respuesta que ve el navegador. El middleware de Vercel las adjunta al documento. */

export type SecuritySurface = "app" | "bridge" | "api";

/**
 * Script de tema en index.html. El hash es el de este texto con saltos LF,
 * que es el que queda en git y en el build de Vercel.
 */
export const THEME_BOOT_SCRIPT =
  '\n      (function () {\n        try {\n          if (localStorage.getItem("flowpay-theme") === "dark") {\n            document.documentElement.classList.add("dark");\n          }\n        } catch (e) {}\n      })();\n    ';

/** Mismo texto que el <script> del puente en flowpay-payments/internal/controller/webpay_controller.go. */
export const BRIDGE_SUBMIT_SCRIPT = "document.getElementById('f').submit();";

const THEME_BOOT_HASH = "sha256-CoHYKH5hvsB+/0/d/YNwiOsV62FTRus6mc+LJqNoRyc=";
const BRIDGE_SUBMIT_HASH = "sha256-CNpGs301fn1abxhLSmcOuQ1govWG+iiQizQpEPLwBd4=";

const TRANSBANK_ORIGINS = "https://webpay3g.transbank.cl https://webpay3gint.transbank.cl";

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

export function contentSecurityPolicy(surface: SecuritySurface): string {
  if (surface === "api") {
    return "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  }
  if (surface === "bridge") {
    return [
      "default-src 'none'",
      `script-src '${BRIDGE_SUBMIT_HASH}'`,
      "style-src 'none'",
      "img-src 'none'",
      "font-src 'none'",
      "connect-src 'none'",
      `form-action ${TRANSBANK_ORIGINS}`,
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; ");
  }
  return [
    "default-src 'self'",
    `script-src 'self' '${THEME_BOOT_HASH}'`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://s3.amazonaws.com https://assets.fintoc.com",
    "media-src 'self' blob:",
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(https: boolean, surface: SecuritySurface): Record<string, string> {
  const policy = contentSecurityPolicy(surface) + (https ? "; upgrade-insecure-requests" : "");
  const headers: Record<string, string> = {
    "Content-Security-Policy": policy,
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": PERMISSIONS_POLICY,
  };
  if (https) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }
  return headers;
}

export function surfaceForPath(pathname: string, proxied: boolean): SecuritySurface {
  if (pathname === "/api/public/webpay/bridge" || pathname.startsWith("/api/public/webpay/bridge/")) {
    return "bridge";
  }
  if (proxied) return "api";
  return "app";
}

export function requestIsHttps(request: Request): boolean {
  const url = new URL(request.url);
  if (url.protocol === "https:") return true;
  const forwarded = request.headers.get("x-forwarded-proto") ?? "";
  return forwarded.split(",")[0]?.trim().toLowerCase() === "https";
}

export function responseHeaders(request: Request, proxied: boolean): Headers {
  const url = new URL(request.url);
  const values = securityHeaders(requestIsHttps(request), surfaceForPath(url.pathname, proxied));
  const headers = new Headers();
  for (const [name, value] of Object.entries(values)) {
    headers.set(name, value);
  }
  return headers;
}
