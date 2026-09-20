import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp } from "../lib/app.mjs";

const SECRET = "sk-secret-123";
const validBody = {
  state: "I was charged twice, please refund",
  model: "jev-latest",
  questions: { refund: { type: "noul", instructions: "Is a refund requested?" } },
};

let publicDir;
let libDir;
before(async () => {
  publicDir = await mkdtemp(path.join(tmpdir(), "jev-lab-"));
  libDir = path.join(publicDir, "..", `${path.basename(publicDir)}-lib`);
  await mkdir(libDir);
  await writeFile(path.join(publicDir, "index.html"), "<title>lab</title>");
  await writeFile(path.join(publicDir, "app.css"), "body{}");
  await writeFile(path.join(libDir, "shared.mjs"), "export const shared = 1;");
  await writeFile(path.join(libDir, "secret.txt"), "not a module");
});
// A failing assertion skips the explicit close() call, so every server is also tracked
// here and force-closed in after(). Otherwise a red test leaves the runner hanging.
const openServers = new Set();

after(async () => {
  for (const server of openServers) {
    server.closeAllConnections();
    server.close();
  }
  await rm(publicDir, { recursive: true, force: true });
  await rm(libDir, { recursive: true, force: true });
});

async function start(options = {}) {
  const app = createApp({ publicDir, libDir, ...options });
  const server = http.createServer(app);
  openServers.add(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    port,
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        openServers.delete(server);
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}

const post = (base, route, body, headers = {}) =>
  fetch(`${base}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

function rawRequest(port, { method = "GET", route = "/", headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: route, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, text: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

test("GET /api/status reports demo mode without a key", async () => {
  const s = await start();
  const res = await fetch(`${s.url}/api/status`);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.mode, "demo");
  assert.ok(json.models.includes("jev-latest"));
  await s.close();
});

test("GET /api/status reports live mode and never leaks the key", async () => {
  const s = await start({ apiKey: SECRET });
  const res = await fetch(`${s.url}/api/status`);
  const text = await res.text();
  assert.equal(JSON.parse(text).mode, "live");
  assert.ok(!text.includes(SECRET));
  await s.close();
});

test("POST /api/systemone answers with the demo engine when there is no key", async () => {
  const s = await start();
  const res = await post(s.url, "/api/systemone", validBody);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.mode, "demo");
  assert.equal(json.response.model, "demo-heuristic");
  assert.equal(typeof json.latencyMs, "number");
  await s.close();
});

test("POST /api/systemone rejects an invalid request with 422 and field errors", async () => {
  const s = await start();
  const res = await post(s.url, "/api/systemone", { state: "", model: "jev-latest", questions: {} });
  const json = await res.json();
  assert.equal(res.status, 422);
  assert.equal(json.error, "validation");
  assert.ok(json.errors.some((e) => e.path === "state"));
  await s.close();
});

test("POST /api/systemone rejects malformed JSON with 400", async () => {
  const s = await start();
  const res = await post(s.url, "/api/systemone", "{not json");
  assert.equal(res.status, 400);
  await s.close();
});

test("POST /api/systemone rejects oversized bodies with 413", async () => {
  const s = await start({ maxBodyBytes: 200 });
  const res = await post(s.url, "/api/systemone", { ...validBody, state: "x".repeat(500) });
  assert.equal(res.status, 413);
  await s.close();
});

test("live mode forwards the request upstream with the bearer key and returns the answers", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({ model: "jev-1.13.0", answers: { refund: { type: "noul", noul: 0.97 } }, usage: { input_tokens: 40, output_tokens: 3 } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const s = await start({ apiKey: SECRET, fetchImpl });
  const res = await post(s.url, "/api/systemone", validBody);
  const text = await res.text();
  const json = JSON.parse(text);
  assert.equal(json.mode, "live");
  assert.equal(json.response.answers.refund.noul, 0.97);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.typesafe.ai/v1/systemone");
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${SECRET}`);
  assert.deepEqual(JSON.parse(calls[0].init.body), validBody);
  assert.ok(!text.includes(SECRET));
  await s.close();
});

test("?demo=1 skips the upstream call even when a key is configured", async () => {
  let called = false;
  const s = await start({ apiKey: SECRET, fetchImpl: async () => ((called = true), new Response("{}")) });
  const res = await post(s.url, "/api/systemone?demo=1", validBody);
  const json = await res.json();
  assert.equal(json.mode, "demo");
  assert.equal(called, false);
  await s.close();
});

test("upstream errors keep their status and never echo the key", async () => {
  for (const status of [401, 422, 429, 529]) {
    const fetchImpl = async () => new Response(JSON.stringify({ detail: `bad ${SECRET}` }), { status });
    const s = await start({ apiKey: SECRET, fetchImpl });
    const res = await post(s.url, "/api/systemone", validBody);
    const text = await res.text();
    assert.equal(res.status, status);
    assert.equal(JSON.parse(text).error, "upstream");
    assert.ok(!text.includes(SECRET), `status ${status} leaked the key`);
    await s.close();
  }
});

test("a network failure upstream becomes a 502", async () => {
  const fetchImpl = async () => {
    throw new TypeError("fetch failed");
  };
  const s = await start({ apiKey: SECRET, fetchImpl });
  const res = await post(s.url, "/api/systemone", validBody);
  assert.equal(res.status, 502);
  await s.close();
});

test("POST from a foreign origin is refused", async () => {
  const s = await start();
  const res = await post(s.url, "/api/systemone", validBody, { Origin: "https://evil.example" });
  assert.equal(res.status, 403);
  await s.close();
});

test("a same-origin POST is allowed", async () => {
  const s = await start();
  const res = await post(s.url, "/api/systemone", validBody, { Origin: s.url });
  assert.equal(res.status, 200);
  await s.close();
});

test("requests with an unexpected Host header are refused (DNS rebinding guard)", async () => {
  const s = await start();
  const res = await rawRequest(s.port, { route: "/api/status", headers: { Host: "evil.example" } });
  assert.equal(res.status, 403);
  await s.close();
});

test("serves index.html at / and static files by path", async () => {
  const s = await start();
  const index = await fetch(`${s.url}/`);
  assert.equal(index.status, 200);
  assert.match(index.headers.get("content-type"), /text\/html/);
  assert.match(await index.text(), /<title>lab<\/title>/);
  const css = await fetch(`${s.url}/app.css`);
  assert.match(css.headers.get("content-type"), /text\/css/);
  await s.close();
});

test("static serving cannot escape the public directory", async () => {
  const s = await start();
  for (const route of ["/..%2fpackage.json", "/%2e%2e/package.json", "/../package.json"]) {
    const res = await rawRequest(s.port, { route });
    assert.ok(res.status === 403 || res.status === 404, `${route} returned ${res.status}`);
    assert.ok(!res.text.includes("jev-lab"), `${route} leaked a file`);
  }
  await s.close();
});

test("mounts the shared lib directory under /lib/ for the browser", async () => {
  const s = await start();
  const res = await fetch(`${s.url}/lib/shared.mjs`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/javascript/);
  assert.match(await res.text(), /shared = 1/);
  await s.close();
});

test("/lib/ only serves .mjs modules and cannot escape its directory", async () => {
  const s = await start();
  const notModule = await fetch(`${s.url}/lib/secret.txt`);
  assert.equal(notModule.status, 404);
  for (const route of ["/lib/..%2findex.html", "/lib/..%2f..%2fpackage.json"]) {
    const res = await rawRequest(s.port, { route });
    assert.ok(res.status === 403 || res.status === 404, `${route} returned ${res.status}`);
    assert.ok(!res.text.includes("<title>lab</title>"), `${route} escaped the lib mount`);
  }
  await s.close();
});

test("without a libDir, /lib/ is not served", async () => {
  const s = await start({ libDir: undefined });
  const res = await fetch(`${s.url}/lib/shared.mjs`);
  assert.equal(res.status, 404);
  await s.close();
});

test("unknown paths return 404", async () => {
  const s = await start();
  const res = await fetch(`${s.url}/nope.js`);
  assert.equal(res.status, 404);
  await s.close();
});
