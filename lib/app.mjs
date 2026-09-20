// HTTP handler: static files, /api/status and the /api/systemone proxy.
// The API key lives only here. It is never sent to the browser, logged, or echoed
// back in an error message.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { validateRequest, MODELS } from "./questions.mjs";
import { runDemo } from "./demo.mjs";
import { CONTEXT_TOKENS, PRICING, RATE_LIMITS } from "./cost.mjs";

const UPSTREAM_URL = "https://api.typesafe.ai/v1/systemone";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const UPSTREAM_MESSAGES = {
  401: "The API key was rejected. Check TYPESAFE_API_KEY.",
  422: "TypeSafe rejected the request as malformed.",
  429: "Rate limited. Wait a moment and retry.",
  529: "The service is overloaded. Retry with backoff.",
};

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * @param {object} options
 * @param {string} [options.apiKey] Enables live mode when set.
 * @param {string} options.publicDir Directory served as static files.
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.maxBodyBytes]
 */
export function createApp({ apiKey, publicDir, fetchImpl = fetch, maxBodyBytes = 1_000_000 }) {
  const root = path.resolve(publicDir);

  return async function handler(req, res) {
    try {
      guardHost(req);
      const url = new URL(req.url ?? "/", "http://localhost");

      if (url.pathname === "/api/status" && req.method === "GET") {
        return sendJson(res, 200, {
          mode: apiKey ? "live" : "demo",
          models: MODELS,
          limits: {
            contextTokens: CONTEXT_TOKENS,
            usdPerBillionInputTokens: PRICING.usdPerBillionInputTokens,
            ...RATE_LIMITS,
          },
        });
      }
      if (url.pathname === "/api/systemone") {
        if (req.method !== "POST") throw new HttpError(405, "method", "Use POST.");
        guardOrigin(req);
        return await handleSystemOne(req, res, url);
      }
      if (url.pathname.startsWith("/api/")) throw new HttpError(404, "not_found", "Unknown API route.");
      if (req.method !== "GET") throw new HttpError(405, "method", "Use GET.");
      return await serveStatic(res, url.pathname);
    } catch (err) {
      if (err instanceof HttpError) {
        return sendJson(res, err.status, { error: err.code, message: err.message });
      }
      return sendJson(res, 500, { error: "internal", message: "Unexpected server error." });
    }
  };

  function guardHost(req) {
    const host = String(req.headers.host ?? "").replace(/:\d+$/, "");
    if (!LOCAL_HOSTS.has(host)) throw new HttpError(403, "forbidden_host", "Unexpected Host header.");
  }

  function guardOrigin(req) {
    const origin = req.headers.origin;
    if (origin === undefined) return;
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new HttpError(403, "forbidden_origin", "Unexpected Origin.");
    }
    if (originHost !== req.headers.host) {
      throw new HttpError(403, "forbidden_origin", "Cross-origin requests are not allowed.");
    }
  }

  async function handleSystemOne(req, res, url) {
    const raw = await readBody(req, maxBodyBytes);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "bad_json", "The request body is not valid JSON.");
    }

    const check = validateRequest(body);
    if (!check.ok) {
      return sendJson(res, 422, { error: "validation", errors: check.errors });
    }

    const request = { state: body.state, model: body.model, questions: body.questions };
    const started = performance.now();
    const elapsed = () => Math.round(performance.now() - started);

    if (!apiKey || url.searchParams.get("demo") === "1") {
      return sendJson(res, 200, { mode: "demo", response: runDemo(request), latencyMs: elapsed() });
    }

    let upstream;
    try {
      upstream = await fetchImpl(UPSTREAM_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
    } catch {
      throw new HttpError(502, "network", "Could not reach api.typesafe.ai.");
    }

    if (!upstream.ok) {
      const status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502;
      // The upstream body is deliberately not forwarded: it could echo credentials.
      return sendJson(res, status, {
        error: "upstream",
        status,
        message: UPSTREAM_MESSAGES[status] ?? "The TypeSafe API returned an error.",
      });
    }

    let response;
    try {
      response = await upstream.json();
    } catch {
      throw new HttpError(502, "bad_upstream", "The TypeSafe API returned an unreadable response.");
    }
    return sendJson(res, 200, { mode: "live", response, latencyMs: elapsed() });
  }

  async function serveStatic(res, pathname) {
    let rel;
    try {
      rel = decodeURIComponent(pathname);
    } catch {
      throw new HttpError(400, "bad_path", "Malformed path.");
    }
    if (rel.includes("\0")) throw new HttpError(404, "not_found", "Not found.");
    if (rel === "/") rel = "/index.html";

    const resolved = path.resolve(root, `.${rel}`);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new HttpError(403, "forbidden", "Forbidden.");
    }

    let data;
    try {
      data = await readFile(resolved);
    } catch {
      throw new HttpError(404, "not_found", "Not found.");
    }

    const type = CONTENT_TYPES[path.extname(resolved).toLowerCase()] ?? "application/octet-stream";
    const headers = { "Content-Type": type, "X-Content-Type-Options": "nosniff" };
    if (type.startsWith("text/html")) headers["Content-Security-Policy"] = CSP;
    res.writeHead(200, headers);
    res.end(data);
  }
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let over = false;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) over = true;
      else chunks.push(chunk);
    });
    req.on("end", () => {
      if (over) reject(new HttpError(413, "too_large", `Body exceeds ${limit} bytes.`));
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}
