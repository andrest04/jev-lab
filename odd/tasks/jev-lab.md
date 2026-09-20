# Jev Lab

## Objective
A local web app to learn and test TypeSafe's Jev model (System One): a free-form playground, interactive worked examples, and a short learning guide. Real calls when `TYPESAFE_API_KEY` is set; a clearly labeled demo engine otherwise.

## Why
The user wants to learn how Jev works, how it is used, and how it can be implemented, through interactive and interesting examples.

## Constraints and decisions
- Three response modes: live (real Jev), sample (hand-written illustrative answers for preset inputs, labeled), demo (keyword heuristic, Playground only, labeled).
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
- Outcome (2026-09-20): work was done on branch `feat/jev-lab` in 8 work-unit commits. `main` had no commits (the feature branch was created before the first commit), so there was nothing to merge into. On user request the feature branch was renamed to `main` (equivalent to a fast-forward merge plus deleting the branch). `main` is at `fdef0b2`; `feat/jev-lab` no longer exists; the working tree was clean. No remote, nothing pushed.

## Tasks
- [x] T1 Scaffold: git repo, feature branch (later renamed to `main`, see Delivery), task doc, package.json, README skeleton
- [x] T2 Core lib with tests first: request validation/building, confidence routing, composite scoring, code generation (curl/JS/Python), cost estimate
- [x] T3 Demo engine (keyword heuristic) with tests
- [x] T4 Server: static files, `/api/status`, `/api/systemone` proxy, key never exposed, error mapping, with tests
- [x] T5 UI shell: design tokens (light/dark), navigation, result visualizations for noul / choice / score
- [x] T6 Playground: state editor, question builder, run, request/response/code tabs, usage and cost
- [x] T7 Examples: support triage, spam composite scoring (weights without re-inference), smart-home function calling, semantic find, citation check, guardrails
- [x] T8 Learn page: mental model, primitives cheat sheet, pitfalls, limits
- [x] T9 End-to-end check: tests green, server boots, page renders in both themes and at phone width

## Progress
- Engram mirror: PENDING. `mem_save` fails with `ambiguous_project` (MCP server cwd is C:\Users\andres\code; available projects `aniversario`, `finance-app-landing` do not include this one). Resynchronize when a project can be resolved.
- `.env.example` write was denied by the user's permission settings; the variable is documented in README instead.

## Evidence
- T2: RED observed (4 test files failed, modules missing) -> GREEN: node --test, 38 pass / 0 fail (questions, routing, codegen, cost).
- T3: RED observed (demo.test.mjs failed, module missing) -> GREEN: node --test, 45 pass / 0 fail.
- T4: RED observed (app + env tests failed, modules missing) -> GREEN: node --test, 65 pass / 0 fail. Covers key never leaked (status, success, upstream errors), Host/Origin guards, 400/413/422/502 mapping, static path traversal.
- T4b: added /lib/ mount for browser (RED: 2 fail; hang found because failed asserts skipped close(), fixed with tracked servers + after hook) -> GREEN: 68 pass / 0 fail.
- T3b/T7a: sample-answer expansion (lib/fixtures.mjs) and six examples with pure decision logic (lib/examples.mjs). RED: 1 module missing -> GREEN: 110 pass / 0 fail (one test expectation corrected: composite 0.35 is in the suspicious band by design).
- T5-T8: UI built (dom/viz/results/extras/example-view/playground/learn/home/main + styles). DOM code has no unit tests; verified in Chrome instead.
- T9: 111 pass / 0 fail. Browser: all 9 routes render with 0 app JS errors (only a Chrome PDF extension logged errors). Interaction checks: phish sliders flipped verdict likely-phishing -> suspicious with counter "Model calls: 1, policy changes: 2"; playground demo run, Python snippet, validation blocks Run. Bugs found and fixed: invisible Copy button in light theme; horizontal overflow at 396px (grid min-width:auto) fixed, then 9/9 routes fit; score marker label overlap. NOT verified: live calls to api.typesafe.ai (no key); only unit-tested with a fake fetch.

## Next step
Feature is complete and on `main`. Open items:
- Live-mode run with a real `TYPESAFE_API_KEY` (unverified: no key was available; the upstream forwarding is only unit-tested with a fake fetch).
- Engram mirror (`ambiguous_project`, see Progress).
- This document was edited after `fdef0b2` and is not yet committed.
