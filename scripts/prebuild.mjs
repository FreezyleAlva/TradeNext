// scripts/prebuild.mjs
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMarketData } from "./market-data.mjs";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = web;
const srcIcons = join(root, "assets", "icons");
const outIcons = join(web, "public", "icons");

rmSync(outIcons, { recursive: true, force: true });
mkdirSync(outIcons, { recursive: true });
const pngs = readdirSync(srcIcons).filter((f) => f.endsWith(".png"));
for (const f of pngs) copyFileSync(join(srcIcons, f), join(outIcons, f));
copyFileSync(join(web, "brand", "alvastudio-512.png"), join(web, "src", "app", "icon.png"));
copyFileSync(join(web, "brand", "alvastudio-180.png"), join(web, "src", "app", "apple-icon.png"));
copyFileSync(join(web, "brand", "favicon.ico"), join(web, "public", "favicon.ico"));

const tokens = JSON.parse(readFileSync(join(root, "design", "tokens.json"), "utf8"));
const lines = [];
const add = (name, value) => lines.push(`  --${name}: ${value};`);
for (const [k, v] of Object.entries(tokens.surface)) add(`color-surface-${k}`, v);
for (const [k, v] of Object.entries(tokens.ink)) add(`color-ink-${k}`, v);
for (const [k, v] of Object.entries(tokens.blue)) add(`color-blue-${k}`, v);
for (const [k, v] of Object.entries(tokens.cyan)) add(`color-cyan-${k}`, v);
for (const [k, v] of Object.entries(tokens.state)) add(`color-${k}`, v);
for (const [k, v] of Object.entries(tokens.chart)) add(`color-chart-${k.replace(/_/g, "-")}`, v);
for (const [k, v] of Object.entries(tokens.radius)) add(`radius-${k}`, `${v}px`);
add("spacing-0", "0px");
tokens.space.forEach((v, i) => add(`spacing-s${i + 1}`, `${v}px`));
const typeNames = ["xs", "sm", "base", "lg", "xl", "2xl"];
tokens.type.scale.forEach((v, i) => add(`text-${typeNames[i]}`, `${v}px`));
add("font-sans", tokens.type.family_ui);
add("font-mono", tokens.type.family_mono);

const resets = ["color", "text", "radius", "font", "shadow", "inset-shadow", "drop-shadow", "text-shadow", "blur", "animate", "ease", "spacing", "perspective", "aspect"]
  .map((n) => `  --${n}-*: initial;`)
  .join("\n");
const css = `/* dibuat otomatis oleh scripts/prebuild.mjs dari design/tokens.json */\n@theme {\n${resets}\n  --spacing: initial;\n${lines.join("\n")}\n}\n`;
writeFileSync(join(web, "src", "app", "tokens.css"), css);

const results = JSON.parse(readFileSync(join(root, "data", "results.json"), "utf8"));
const md = buildMarketData(root, join(web, "public", "data"), results.meta.universe, results.meta.benchmarks);

console.log(`prebuild: ${pngs.length} ikon disalin, ${lines.length} token ditulis, data pasar ${md.tickers} ticker x ${md.n} hari`);
