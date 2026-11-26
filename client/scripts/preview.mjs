import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { connect as netConnect } from "node:net";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const dist = path.resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const apiTarget = { host: "localhost", port: 4000 };

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const compressible = new Set([".html", ".js", ".css", ".json", ".svg", ".xml", ".txt"]);

function proxy(req, res) {
  const upstream = httpRequest(
    {
      host: apiTarget.host,
      port: apiTarget.port,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: `${apiTarget.host}:${apiTarget.port}` },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", () => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end("API unavailable");
  });

  req.pipe(upstream);
}

function sendFile(req, res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const type = mime[extension] ?? "application/octet-stream";
  const stat = statSync(filePath);
  const accepts = req.headers["accept-encoding"] ?? "";
  const canCompress = compressible.has(extension) && stat.size > 1024;

  res.setHeader("content-type", type);
  res.setHeader("x-content-type-options", "nosniff");

  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
  } else if (extension === ".html") {
    res.setHeader("cache-control", "no-cache");
  } else {
    res.setHeader("cache-control", "public, max-age=3600");
  }

  if (canCompress && /\bbr\b/.test(accepts)) {
    const body = brotliCompressSync(readFileSync(filePath));
    res.setHeader("content-encoding", "br");
    res.setHeader("vary", "accept-encoding");
    res.setHeader("content-length", body.length);
    res.end(req.method === "HEAD" ? undefined : body);
    return;
  }

  if (canCompress && /\bgzip\b/.test(accepts)) {
    const body = gzipSync(readFileSync(filePath));
    res.setHeader("content-encoding", "gzip");
    res.setHeader("vary", "accept-encoding");
    res.setHeader("content-length", body.length);
    res.end(req.method === "HEAD" ? undefined : body);
    return;
  }

  res.setHeader("content-length", stat.size);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

function resolveStatic(pathname) {
  const decoded = decodeURIComponent(pathname.split("?")[0] ?? "/");
  const safe = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const direct = path.join(dist, safe);
  if (!direct.startsWith(dist)) return null;

  if (safe === "/" || safe === "") return path.join(dist, "index.html");
  if (existsSync(direct) && statSync(direct).isFile()) return direct;

  const nested = path.join(dist, safe, "index.html");
  if (existsSync(nested)) return nested;

  if (path.extname(safe)) return null;
  return path.join(dist, "index.html");
}

const server = createServer((req, res) => {
  const url = req.url ?? "/";

  if (url.startsWith("/api") || url.startsWith("/uploads") || url.startsWith("/socket.io")) {
    proxy(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD" });
    res.end();
    return;
  }

  const filePath = resolveStatic(url);
  if (!filePath) {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end("Not found");
    return;
  }

  sendFile(req, res, filePath);
});

server.on("upgrade", (req, socket, head) => {
  if (!req.url?.startsWith("/socket.io")) {
    socket.destroy();
    return;
  }

  const upstream = netConnect(apiTarget.port, apiTarget.host, () => {
    const headers = Object.entries(req.headers)
      .filter(([key]) => key.toLowerCase() !== "host")
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n");
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\nhost: ${apiTarget.host}:${apiTarget.port}\r\n${headers}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(port, () => {
  console.log(`Production preview (compressed) on http://localhost:${port}`);
});