/**
 * build-single.mjs – builds ONE self-contained, offline file: dist/surfletics.html
 *
 * Usage:  npm install   (once, installs esbuild)   then   node tools/build-single.mjs
 *
 * - bundles src/js/app.js (incl. dynamic qrcode import) into a minified classic IIFE
 * - inlines CSS (fonts.css + src/css/*.css, same order as index.html); fonts -> data: URIs
 * - inlines assets/img/* (<img>, JS string literals, favicons) as data: URIs
 * - drops manifest / preload / modulepreload links and og-image (works on file://)
 * Does not modify index.html, src/ or assets/.
 */
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => readFile(path.join(root, p));
const MIME = { ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const dataUri = async (p) => `data:${MIME[path.extname(p)]};base64,${(await rd(p)).toString("base64")}`;

// 1. JS
const out = await build({
  entryPoints: [path.join(root, "src/js/app.js")],
  bundle: true, minify: true, format: "iife", target: "es2020", write: false,
  legalComments: "none",
});
let js = out.outputFiles[0].text;
const imgRe = /assets\/img\/[\w.-]+\.(?:png|svg)/g;
for (const p of new Set(js.match(imgRe) || [])) js = js.split(p).join(await dataUri(p));
js = js.replace(/<\/script/gi, "<\\/script");

// 2. CSS
let css = "";
for (const f of ["assets/fonts/fonts.css", "src/css/base.css", "src/css/components.css", "src/css/screens.css"]) {
  let c = (await rd(f)).toString();
  const dir = path.posix.dirname(f);
  const matches = [...c.matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g)];
  for (const m of matches) {
    if (m[2].startsWith("data:")) continue;
    c = c.split(m[0]).join(`url(${await dataUri(path.posix.normalize(path.posix.join(dir, m[2])))})`);
  }
  css += c + "\n";
}
css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n+/g, "\n");

// 3. HTML
let html = (await rd("index.html")).toString();
html = html.replace(/<link rel="(?:manifest|preload|modulepreload)"[^>]*>\s*/g, "");
html = html.replace(/<meta property="og:image"[^>]*>\s*/g, "");
html = html.replace(/<link rel="stylesheet"[^>]*>\s*/g, () => ""); // re-added below
for (const m of [...html.matchAll(/(<link rel="(?:icon|apple-touch-icon)" href=")(assets\/img\/[^"]+)(")/g)])
  html = html.replace(m[0], m[1] + (await dataUri(m[2])) + m[3]);
for (const m of [...html.matchAll(/(<img [^>]*src=")(assets\/img\/[^"]+)(")/g)])
  html = html.replace(m[0], m[1] + (await dataUri(m[2])) + m[3]);
html = html.replace("</head>", () => `<style>${css}</style>\n</head>`);
html = html.replace(/<script type="module" src="src\/js\/app\.js"><\/script>/, () => `<script>${js}</script>`);

const left = html.match(/(?:src|href)="(?!data:|https?:|#)[^"]*"/g);
await mkdir(path.join(root, "dist"), { recursive: true });
await writeFile(path.join(root, "dist/surfletics.html"), html);
console.log(`dist/surfletics.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
if (left) console.log("remaining relative refs:", left);
if (/assets\//.test(html)) console.log("WARNING: 'assets/' still referenced");
