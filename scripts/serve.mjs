// scripts/serve.mjs
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { basename, dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const port = Number(process.env.PORT ?? process.argv[2] ?? 3200);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

if (!existsSync(root)) {
  console.error("Folder out/ belum ada. Jalankan BUILD.bat dulu.");
  process.exit(1);
}

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
  let file = normalize(join(root, url));
  if (!file.startsWith(root + sep) && file !== root) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(`${file}.html`) && (!existsSync(file) || statSync(file).isDirectory())) file = `${file}.html`;
  else if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  const seg = basename(file).match(/^(__next\.[^.]+)\.(.+)\.txt$/);
  if (!existsSync(file) && seg) {
    const alt = join(dirname(file), seg[1], `${seg[2].split(".").join(sep)}.txt`);
    if (existsSync(alt)) file = alt;
  }
  if (!existsSync(file)) {
    console.warn(`404 ${url}`);
    res.writeHead(404, { "Content-Type": types[".html"] });
    createReadStream(join(root, "404.html")).pipe(res);
    return;
  }
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Freezyle Traiding: http://localhost:${port}`);
});
