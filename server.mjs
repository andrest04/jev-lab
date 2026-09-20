import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseEnv } from "./lib/env.mjs";
import { createApp } from "./lib/app.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

let fileEnv = {};
try {
  fileEnv = parseEnv(await readFile(path.join(root, ".env"), "utf8"));
} catch {
  // No .env file: fall back to the process environment.
}

const apiKey = (process.env.TYPESAFE_API_KEY || fileEnv.TYPESAFE_API_KEY || "").trim() || undefined;
const port = Number(process.env.PORT || fileEnv.PORT || 4173);

const server = http.createServer(createApp({ apiKey, publicDir: path.join(root, "public") }));

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Set PORT to another value and retry.`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

// Bind to loopback only: this server holds an API key.
server.listen(port, "127.0.0.1", () => {
  console.log(`Jev Lab running at http://localhost:${port}`);
  console.log(
    apiKey
      ? "Mode: live (calls go to api.typesafe.ai through this server)"
      : "Mode: demo (no TYPESAFE_API_KEY found; answers come from a keyword heuristic, not Jev)",
  );
});
