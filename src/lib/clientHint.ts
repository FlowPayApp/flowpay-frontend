const nativeFetch = window.fetch.bind(window);

function brandHeader() {
  const nav = navigator as Navigator & {
    userAgentData?: { brands?: { brand: string; version: string }[] };
  };
  return (nav.userAgentData?.brands ?? [])
    .filter((item) => item.brand && item.version)
    .map((item) => `"${item.brand.replaceAll('"', "")}";v="${item.version.replaceAll('"', "")}"`)
    .join(", ");
}

function sameApp(input: RequestInfo | URL) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return url.startsWith("/") || url.startsWith(window.location.origin);
}

window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (!sameApp(input)) return nativeFetch(input, init);
  const headers = new Headers(init?.headers);
  const hint = brandHeader();
  if (hint && !headers.has("x-flowpay-client-brands")) headers.set("x-flowpay-client-brands", hint);
  return nativeFetch(input, { ...init, headers });
};
