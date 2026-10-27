import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import middleware from "./middleware.ts";
import {
  BRIDGE_SUBMIT_SCRIPT,
  THEME_BOOT_SCRIPT,
  contentSecurityPolicy,
  requestIsHttps,
  surfaceForPath,
} from "./securityHeaders.ts";

function sha256(value: string): string {
  return "sha256-" + createHash("sha256").update(value).digest("base64");
}

function csp(response: Response): string {
  return response.headers.get("content-security-policy") ?? "";
}

test("el script de tema de index.html coincide con el hash de la política", () => {
  const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, "index.html debe conservar el script de tema");
  const script = match[1].replace(/\r\n/g, "\n");
  assert.equal(script, THEME_BOOT_SCRIPT);
  assert.match(contentSecurityPolicy("app"), new RegExp(sha256(script).replace(/[+/]/g, "\\$&")));
});

test("el puente de Webpay usa el script que firma payments, si el repo está al lado", () => {
  const source = new URL("../flowpay-payments/internal/controller/webpay_controller.go", import.meta.url);
  if (!existsSync(source)) return;
  const go = readFileSync(source, "utf8");
  assert.match(go, new RegExp("<script>" + BRIDGE_SUBMIT_SCRIPT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</script>"));
  assert.match(contentSecurityPolicy("bridge"), new RegExp(sha256(BRIDGE_SUBMIT_SCRIPT).replace(/[+/]/g, "\\$&")));
});

test("el HTML del panel lleva las cuatro cabeceras y HSTS solo en https", () => {
  const https = middleware(new Request("https://geldflus.com/cobros"));
  assert.equal(https.status, 200);
  assert.match(https.headers.get("x-middleware-rewrite") ?? "", /\/index\.html$/);
  assert.match(csp(https), /frame-ancestors 'none'/);
  assert.match(csp(https), /fonts\.googleapis\.com/);
  assert.match(csp(https), /form-action 'self'/);
  assert.equal(https.headers.get("x-frame-options"), "DENY");
  assert.equal(https.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(https.headers.get("x-content-type-options"), "nosniff");
  assert.match(https.headers.get("strict-transport-security") ?? "", /max-age=31536000/);
  assert.match(https.headers.get("strict-transport-security") ?? "", /includeSubDomains/);

  const http = middleware(new Request("http://127.0.0.1:5173/login"));
  assert.equal(http.headers.get("strict-transport-security"), null);
  assert.match(csp(http), /script-src /);
  assert.equal(http.headers.get("x-frame-options"), "DENY");
  assert.equal(http.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
});

test("el puente permite el envío a Transbank y no hereda la política del panel", () => {
  process.env.FLOWPAY_PAYMENTS_URL = "https://pay.internal";
  const response = middleware(new Request("https://geldflus.com/api/public/webpay/bridge/12"));
  assert.match(response.headers.get("x-middleware-rewrite") ?? "", /^https:\/\/pay\.internal\/api\/public\/webpay\/bridge\/12$/);
  assert.match(response.headers.get("x-middleware-override-headers") ?? "", /x-forwarded-host/);
  const policy = csp(response);
  assert.match(policy, /form-action https:\/\/webpay3g\.transbank\.cl https:\/\/webpay3gint\.transbank\.cl/);
  assert.match(policy, new RegExp(sha256(BRIDGE_SUBMIT_SCRIPT).replace(/[+/]/g, "\\$&")));
  assert.doesNotMatch(policy, /unsafe-inline/);
  assert.doesNotMatch(policy, /fonts\.googleapis/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
});

test("la vuelta de Fintoc y Khipu llega al servicio de pagos", () => {
  process.env.FLOWPAY_PAYMENTS_URL = "https://pay.internal";
  for (const path of [
    "/api/public/fintoc/return/token?orden=1",
    "/api/public/khipu/return/token?orden=1",
    "/api/public/fintoc/notify",
    "/api/public/khipu/notify",
  ]) {
    const response = middleware(new Request("https://app.geldflus.com" + path));
    assert.match(response.headers.get("x-middleware-rewrite") ?? "", new RegExp("^https://pay\\.internal" + path.replace(/[?]/g, "\\?") + "$"));
    assert.match(csp(response), /default-src 'none'/);
  }
});

test("una API no recibe la política del HTML", () => {
  process.env.FLOWPAY_BACKEND_URL = "https://api.internal";
  const response = middleware(new Request("https://geldflus.com/api/charges"));
  assert.match(response.headers.get("x-middleware-rewrite") ?? "", /^https:\/\/api\.internal\/api\/charges$/);
  assert.match(csp(response), /default-src 'none'/);
  assert.doesNotMatch(csp(response), /fonts\.googleapis/);
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
});

test("sin destino configurado la respuesta de error también va protegida", () => {
  delete process.env.FLOWPAY_SSO_URL;
  const response = middleware(new Request("https://geldflus.com/auth/login"));
  assert.equal(response.status, 503);
  assert.match(csp(response), /default-src 'none'/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
});

test("https detrás del proxy cuenta como https", () => {
  const request = new Request("http://geldflus.com/login", {
    headers: { "x-forwarded-proto": "https" },
  });
  assert.equal(requestIsHttps(request), true);
  assert.equal(surfaceForPath("/api/public/webpay/bridge/3", true), "bridge");
  assert.equal(surfaceForPath("/api/charges", true), "api");
  assert.equal(surfaceForPath("/cobros", false), "app");
});
