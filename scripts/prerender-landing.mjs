import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = `${root}dist/`;
const ssr = `${root}dist-ssr/`;

const { render, SEO_TITLE, SEO_DESCRIPTION, SITE_URL, structuredData } = await import(
  pathToFileURL(`${ssr}entry-landing.js`).href
);

const esc = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const url = `${SITE_URL}/`;
const image = `${SITE_URL}/og.jpg`;

const head = [
  `<title>${esc(SEO_TITLE)}</title>`,
  `<meta name="description" content="${esc(SEO_DESCRIPTION)}" />`,
  `<link rel="canonical" href="${url}" />`,
  `<meta property="og:type" content="website" />`,
  `<meta property="og:site_name" content="GeldFlus" />`,
  `<meta property="og:locale" content="es_CL" />`,
  `<meta property="og:url" content="${url}" />`,
  `<meta property="og:title" content="${esc(SEO_TITLE)}" />`,
  `<meta property="og:description" content="${esc(SEO_DESCRIPTION)}" />`,
  `<meta property="og:image" content="${image}" />`,
  `<meta property="og:image:width" content="1200" />`,
  `<meta property="og:image:height" content="630" />`,
  `<meta name="twitter:card" content="summary_large_image" />`,
  `<meta name="twitter:title" content="${esc(SEO_TITLE)}" />`,
  `<meta name="twitter:description" content="${esc(SEO_DESCRIPTION)}" />`,
  `<meta name="twitter:image" content="${image}" />`,
  ...structuredData().map(
    (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`,
  ),
].join("\n    ");

const shell = await readFile(`${dist}index.html`, "utf8");
const titleTag = /<title>[\s\S]*?<\/title>/;
const rootTag = '<div id="root"></div>';
if (!titleTag.test(shell) || !shell.includes(rootTag)) {
  throw new Error("dist/index.html no tiene el <title> o el <div id=\"root\"> esperados");
}

// Quien ya inició sesión ve su panel en "/", así que se descarta el HTML de la landing antes de pintarlo.
const dropForSession =
  '<script>try{if(localStorage.getItem("flowpay_token"))document.getElementById("root").innerHTML=""}catch(e){}</script>';

const landing = shell
  .replace(titleTag, head)
  .replace(rootTag, `<div id="root">${render()}</div>\n    ${dropForSession}`);

const app = shell.replace(titleTag, (tag) => `${tag}\n    <meta name="robots" content="noindex" />`);

await writeFile(`${dist}landing.html`, landing);
await writeFile(`${dist}index.html`, app);
await rm(ssr, { recursive: true, force: true });

console.log("dist/landing.html generado");
