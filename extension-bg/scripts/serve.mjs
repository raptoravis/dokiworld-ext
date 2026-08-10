import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { createServer } from "node:http";

const root = resolve(import.meta.dirname, "..", "dist");
const port = Number(process.env.EXTENSION_BG_PORT || process.argv[2] || 4173);
const mime = {
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", `http://${request.headers.host}`).pathname);
  const relative = pathname === "/" ? "manifest.json" : pathname.replace(/^\/+/, "");
  const file = resolve(root, relative);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Content-Length": info.size,
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Access-Control-Allow-Origin": "*" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Background Extension: http://localhost:${port}/manifest.json`);
});
