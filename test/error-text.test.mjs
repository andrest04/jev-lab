import { test } from "node:test";
import assert from "node:assert/strict";
import { createT } from "../lib/i18n.mjs";
import { errorText } from "../lib/error-text.mjs";

test("errorText translates a known code with createT('es')", () => {
  const t = createT("es");
  assert.equal(
    errorText(
      {
        code: "state_required",
        message: "State is required. Give the model the text or JSON it should judge.",
      },
      t,
    ),
    "El state es obligatorio. Indica al modelo el texto o JSON que debe juzgar.",
  );
});

test("errorText returns the original message for an unknown code", () => {
  const t = createT("es");
  assert.equal(
    errorText({ code: "not_a_real_error_code", message: "Keep this English." }, t),
    "Keep this English.",
  );
});

test("errorText falls back to English when the key is missing in the requested language", () => {
  const t = createT("es", {
    en: { "errors.only_en": "English only copy" },
    es: {},
  });
  assert.equal(errorText({ code: "only_en", message: "Original server text" }, t), "English only copy");
});

test("errorText falls back to the original message when the key is missing in every language", () => {
  const t = createT("es");
  assert.equal(
    errorText({ code: "definitely_missing_xyz", message: "Original server text" }, t),
    "Original server text",
  );
});

test("errorText interpolates {status} for request_failed", () => {
  const t = createT("en");
  assert.equal(
    errorText({ code: "request_failed", message: "Request failed (503).", status: 503 }, t),
    "Request failed (503).",
  );
});
