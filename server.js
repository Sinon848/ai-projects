const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif"
};

http
  .createServer((req, res) => {
    const rawUrl = decodeURIComponent(req.url || "/");
    const cleanUrl = rawUrl.split("?")[0];
    const target = cleanUrl === "/" ? "/index.html" : cleanUrl;
    const filePath = path.join(root, target);

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
      });
      res.end(data);
    });
  })
  .listen(port, () => {
    console.log(`PicForge is running at http://127.0.0.1:${port}`);
  });
