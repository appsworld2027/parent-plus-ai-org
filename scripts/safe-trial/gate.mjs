// Forwards only the model calls to the engine, so the agent cannot reach the engine's settings pages.
import http from "node:http";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function allowed(method, url) {
  const path = String(url).split("?")[0];
  return (method === "GET" && path === "/v1/models") || (method === "POST" && (path === "/v1/messages" || path === "/v1/messages/count_tokens"));
}
export function gate(target) {
  return http.createServer((req, res) => {
    if (!allowed(req.method, req.url)) { res.writeHead(403); return res.end("blocked by trial gate"); }
    const up = http.request({ ...target, method: req.method, path: req.url, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(up);
  });
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) gate({ host: "127.0.0.1", port: 8082 }).listen(8790, "127.0.0.1");
