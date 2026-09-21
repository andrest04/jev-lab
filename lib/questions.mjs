// Question factories and request validation for POST /v1/systemone.
// Contract source: https://docs.typesafe.ai/api.md

/** @typedef {"noul" | "choice" | "score"} QuestionType */
/**
 * @typedef {object} Question
 * @property {QuestionType} type
 * @property {string | object | unknown[]} instructions
 * @property {Record<string, string | null> | string[]} [criteria]
 */
/**
 * @typedef {object} SystemOneRequest
 * @property {string | object | unknown[]} state
 * @property {string} model
 * @property {Record<string, Question>} questions
 */
/** @typedef {{ path: string, message: string, code?: string }} ValidationError */

export const DEFAULT_MODEL = "jev-latest";
export const MODELS = ["jev-latest", "jev-1.13.0"];

export const LIMITS = Object.freeze({
  minChoiceOptions: 2,
  maxChoiceOptions: 255,
  minScoreLevels: 2,
  maxScoreLevels: 10,
});

const QUESTION_TYPES = ["noul", "choice", "score"];

/**
 * A yes/no judgment. Returns a probability of "yes" between 0 and 1.
 * @param {Question["instructions"]} instructions
 * @param {{ true?: string, false?: string }} [criteria]
 * @returns {Question}
 */
export function noul(instructions, criteria) {
  return criteria === undefined
    ? { type: "noul", instructions }
    : { type: "noul", instructions, criteria };
}

/**
 * Pick one option from a defined set. Options may have a null description.
 * @param {Question["instructions"]} instructions
 * @param {Record<string, string | null>} criteria
 * @returns {Question}
 */
export function choice(instructions, criteria) {
  return { type: "choice", instructions, criteria };
}

/**
 * A position along ordered levels. Levels describe concrete situations.
 * @param {Question["instructions"]} instructions
 * @param {string[]} criteria
 * @returns {Question}
 */
export function score(instructions, criteria) {
  return { type: "score", instructions, criteria };
}

/**
 * @param {{ state: SystemOneRequest["state"], model?: string, questions: Record<string, Question> }} input
 * @returns {SystemOneRequest}
 */
export function buildRequest({ state, model = DEFAULT_MODEL, questions }) {
  return { state, model, questions };
}

const isBlankString = (value) => typeof value === "string" && value.trim() === "";
const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isEmptyInput(value) {
  if (value === undefined || value === null) return true;
  if (isBlankString(value)) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

/**
 * @param {unknown} request
 * @returns {{ ok: boolean, errors: ValidationError[] }}
 */
export function validateRequest(request) {
  /** @type {ValidationError[]} */
  const errors = [];
  const fail = (path, message, code) => errors.push({ path, message, code });

  if (!isPlainObject(request)) {
    fail("", "The request must be a JSON object.", "not_object");
    return { ok: false, errors };
  }

  if (isEmptyInput(request.state)) {
    fail("state", "State is required. Give the model the text or JSON it should judge.", "state_required");
  }
  if (typeof request.model !== "string" || request.model.trim() === "") {
    fail("model", "Model is required, for example jev-latest.", "model_required");
  }

  const questions = request.questions;
  if (!isPlainObject(questions) || Object.keys(questions).length === 0) {
    fail("questions", "Add at least one question.", "questions_empty");
    return { ok: errors.length === 0, errors };
  }

  for (const [id, q] of Object.entries(questions)) {
    const at = (field) => `questions.${id}.${field}`;
    if (!isPlainObject(q)) {
      fail(`questions.${id}`, "A question must be an object.", "question_not_object");
      continue;
    }
    if (!QUESTION_TYPES.includes(q.type)) {
      fail(at("type"), `Type must be one of ${QUESTION_TYPES.join(", ")}.`, "type_invalid");
      continue;
    }
    if (isEmptyInput(q.instructions)) {
      fail(at("instructions"), "Instructions are required. State the exact condition to judge.", "instructions_required");
    }
    if (q.type === "choice") validateChoice(q, at, fail);
    if (q.type === "score") validateScore(q, at, fail);
    if (q.type === "noul" && q.criteria !== undefined && !isPlainObject(q.criteria)) {
      fail(at("criteria"), 'Noul criteria must be an object with "true" and "false" keys.', "noul_criteria");
    }
  }

  return { ok: errors.length === 0, errors };
}

function validateChoice(q, at, fail) {
  if (!isPlainObject(q.criteria)) {
    fail(at("criteria"), "A choice needs criteria: an object of option names.", "choice_criteria");
    return;
  }
  const count = Object.keys(q.criteria).length;
  if (count < LIMITS.minChoiceOptions) {
    fail(at("criteria"), `A choice needs at least ${LIMITS.minChoiceOptions} options.`, "choice_too_few");
  }
  if (count > LIMITS.maxChoiceOptions) {
    fail(at("criteria"), `A choice allows at most ${LIMITS.maxChoiceOptions} options.`, "choice_too_many");
  }
}

function validateScore(q, at, fail) {
  if (!Array.isArray(q.criteria)) {
    fail(at("criteria"), "A score needs criteria: an ordered list of level descriptions.", "score_criteria");
    return;
  }
  const count = q.criteria.length;
  if (count < LIMITS.minScoreLevels || count > LIMITS.maxScoreLevels) {
    fail(
      at("criteria"),
      `A score needs ${LIMITS.minScoreLevels} to ${LIMITS.maxScoreLevels} levels.`,
      "score_levels",
    );
  }
}
