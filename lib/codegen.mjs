// Turns a request into copy-paste code. Only the documented HTTP contract and the
// documented Python SDK constructors are used; nothing here is guessed.

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

/** @param {import("./questions.mjs").SystemOneRequest} request */
export function toCurl(request) {
  return [
    `curl -X POST ${ENDPOINT} \\`,
    `  -H "Authorization: Bearer $TYPESAFE_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d @- <<'EOF'`,
    JSON.stringify(request, null, 2),
    `EOF`,
  ].join("\n");
}

/** @param {import("./questions.mjs").SystemOneRequest} request */
export function toFetch(request) {
  const body = JSON.stringify(request, null, 2).replace(/\n/g, "\n  ");
  return [
    `// Run this on a server. Never ship the API key to a browser.`,
    `const response = await fetch("${ENDPOINT}", {`,
    `  method: "POST",`,
    `  headers: {`,
    `    Authorization: \`Bearer \${process.env.TYPESAFE_API_KEY}\`,`,
    `    "Content-Type": "application/json",`,
    `  },`,
    `  body: JSON.stringify(${body}),`,
    `});`,
    `if (!response.ok) throw new Error(\`TypeSafe request failed: \${response.status}\`);`,
    `const { answers, usage } = await response.json();`,
  ].join("\n");
}

/**
 * Render a JSON value as a Python literal.
 * @param {unknown} value
 * @returns {string}
 */
export function pyLiteral(value) {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLiteral).join(", ")}]`;
  const entries = Object.entries(/** @type {object} */ (value)).map(
    ([k, v]) => `${JSON.stringify(k)}: ${pyLiteral(v)}`,
  );
  return `{${entries.join(", ")}}`;
}

const PY_CLASS = { noul: "Noul", choice: "Choice", score: "Score" };
const PY_READ = { noul: "noul", choice: "choice", score: "score" };

/** @param {import("./questions.mjs").SystemOneRequest} request */
export function toPython(request) {
  const entries = Object.entries(request.questions);
  const classes = [...new Set(entries.map(([, q]) => PY_CLASS[q.type]))].sort();
  const imports = [...classes, "TypeSafeClient"].join(", ");

  const questions = entries.map(([id, q]) => {
    const args = [`instructions=${pyLiteral(q.instructions)}`];
    if (q.criteria !== undefined) args.push(`criteria=${pyLiteral(q.criteria)}`);
    return `        ${JSON.stringify(id)}: ${PY_CLASS[q.type]}(${args.join(", ")}),`;
  });

  const reads = entries.map(
    ([id, q]) => `print(response.answers[${JSON.stringify(id)}].${PY_READ[q.type]})`,
  );

  return [
    `from typesafe_sdk import ${imports}`,
    ``,
    `client = TypeSafeClient()  # reads TYPESAFE_API_KEY from the environment`,
    ``,
    `response = client.system_one(`,
    `    state=${pyLiteral(request.state)},`,
    `    model=${JSON.stringify(request.model)},`,
    `    questions={`,
    ...questions,
    `    },`,
    `)`,
    ``,
    ...reads,
  ].join("\n");
}
