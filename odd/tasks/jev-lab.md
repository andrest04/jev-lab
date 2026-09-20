# Jev Lab

## Objective
A local web app to learn and test TypeSafe's Jev model (System One): a free-form playground, interactive worked examples, and a short learning guide. Real calls when `TYPESAFE_API_KEY` is set; a clearly labeled demo engine otherwise.

## Why
The user wants to learn how Jev works, how it is used, and how it can be implemented, through interactive and interesting examples.

## Constraints and decisions
- Published Artifacts cannot reach `api.typesafe.ai` (CSP blocks fetch) and the API key must stay server-side, so this is a local Node app with a proxy. Decision date: 2026-09-20.
- Zero runtime dependencies. Node 24, ESM, JSDoc types. No build step.
- The browser never sees the API key. Only the server reads `TYPESAFE_API_KEY`.
- Demo engine is a keyword heuristic and is never presented as Jev output.
- Confidence is never recomputed for live results; it comes from the API.
- Artifacts (code, UI copy, comments) are in English.

## Sources (live docs, read 2026-09-20)
- POST https://api.typesafe.ai/v1/systemone, Bearer auth, body `{state, model, questions}`
- Question types: noul (0..1, no confidence), choice (<=255 options, probabilities + confidence), score (2-10 levels, fractional score + legend + probabilities + confidence)
- Models: `jev-latest`, `jev-1.13.0`. $42 / 1B input tokens, output free. 64k context. 1,200 req/min.
- Errors: 401, 422, 429, 529 (backoff on 429/529)
- Jev 1.13 jaggedness: literal reading, no arithmetic, dates as text, indirection, context bloat, adversarial state, contradictory criteria, poor text generation

## TDD
- Mode: enabled. Source: user global instructions ("Strict TDD Mode: enabled").
- Runner: `node --test`

## Delivery
- Strategy: ask-on-risk. Forecast: ~1,600 authored changed lines across several work units; no PR planned (no remote).

## Tasks
- [x] T1 Scaffold: git repo, feature branch, task doc, package.json, README skeleton
- [x] T2 Core lib with tests first: request validation/building, confidence routing, composite scoring, code generation (curl/JS/Python), cost estimate
- [ ] T3 Demo engine (keyword heuristic) with tests
- [ ] T4 Server: static files, `/api/status`, `/api/systemone` proxy, key never exposed, error mapping, with tests
- [ ] T5 UI shell: design tokens (light/dark), navigation, result visualizations for noul / choice / score
- [ ] T6 Playground: state editor, question builder, run, request/response/code tabs, usage and cost
- [ ] T7 Examples: support triage, spam composite scoring (weights without re-inference), smart-home function calling, semantic find, citation check, guardrails
- [ ] T8 Learn page: mental model, primitives cheat sheet, pitfalls, limits
- [ ] T9 End-to-end check: tests green, server boots, page renders in both themes and at phone width

## Progress
- Engram mirror: PENDING. `mem_save` fails with `ambiguous_project` (MCP server cwd is C:\Users\andres\code; available projects `aniversario`, `finance-app-landing` do not include this one). Resynchronize when a project can be resolved.
- `.env.example` write was denied by the user's permission settings; the variable is documented in README instead.

## Evidence
- T2: RED observed (4 test files failed, modules missing) -> GREEN: node --test, 38 pass / 0 fail (questions, routing, codegen, cost).

## Next step
T1.
