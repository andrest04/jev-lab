// Client for this lab's own server. The browser never sees the TypeSafe API key.

export class ApiError extends Error {
  /** @param {string} message @param {{ status?: number, errors?: {path: string, message: string}[] }} [details] */
  constructor(message, details = {}) {
    super(message);
    this.status = details.status;
    this.errors = details.errors ?? [];
  }
}

export async function getStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return { mode: "demo", models: ["jev-latest"], limits: {}, offline: true };
  }
}

/**
 * @param {object} request
 * @param {{ demo?: boolean }} [options]
 * @returns {Promise<{ mode: "live" | "demo", response: any, latencyMs: number }>}
 */
export async function runRequest(request, { demo = false } = {}) {
  let res;
  try {
    res = await fetch(`/api/systemone${demo ? "?demo=1" : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ApiError("Could not reach the lab server. Is `node server.mjs` still running?");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const fallback = json?.error === "validation" ? "The request is invalid." : `Request failed (${res.status}).`;
    throw new ApiError(json?.message ?? fallback, { status: res.status, errors: json?.errors });
  }
  return json;
}
