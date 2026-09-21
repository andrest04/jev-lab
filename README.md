# Jev Lab

A local web app to learn and test [TypeSafe](https://docs.typesafe.ai)'s Jev model (System One). You send **state** and typed **questions**; Jev returns typed answers (probabilities), not prose. Your code stays in control of the workflow.

This is a lab for your machine. It is not a static site: the API key never leaves the Node server.

## Quick path

1. Install [Node.js](https://nodejs.org/) 20 or newer. No `npm install`: there are no runtime dependencies.
2. Optional: get a key at https://console.typesafe.ai/keys and put it in a git-ignored `.env` next to `server.mjs`:

```bash
TYPESAFE_API_KEY=your-key-here
PORT=4173
```

3. Start the lab:

```bash
node server.mjs
```

4. Open http://localhost:4173

No key? The lab starts in **demo mode**: a keyword heuristic that mimics the response shape so you can click around. It is not Jev. Its answers are not evidence of how Jev behaves.

## What's in it

| Area | What you do |
|------|-------------|
| **Examples** | Six worked patterns. Each shows the questions, the answers as instruments, the decision your code makes, and logic you can copy. |
| **Playground** | Write state, build `noul` / `choice` / `score` questions, run, inspect usage, copy curl / JavaScript / Python. |
| **Learn** | Mental model, primitives cheat sheet, confidence explorer, pitfalls and limits. |

### Examples

| Example | Pattern |
|---------|---------|
| Ticket desk | Speculative fan-out |
| Phish check | Composite scoring |
| Smart home | Function calling |
| Semantic find | Semantic find |
| Citation check | Citation check |
| Guardrails | Guardrails |

## Answer modes

Every result is labeled. Confidence on **live** answers comes from the API and is never recomputed here.

| Mode | Source | Where |
|------|--------|--------|
| **live** | Real Jev, via this server | When `TYPESAFE_API_KEY` is set |
| **sample** | Hand-written illustrations for preset inputs | Examples |
| **demo** | Keyword heuristic, not Jev | Playground without a key |

## Languages

The UI is English and Spanish. The switcher is in the top bar; the choice is stored as `jev-lang` and follows the browser on first visit.

Technical terms stay English in both languages (`noul`, `choice`, `score`, `confidence`, Playground, pattern names, API/env names). Question instructions, criteria, preset state, and anything you type stay English: that is what Jev receives.

## Why a local server

The browser talks only to this process (`/api/status`, `/api/systemone`). The server holds `TYPESAFE_API_KEY` and, in live mode, forwards to `https://api.typesafe.ai/v1/systemone`.

That is why GitHub Pages cannot host it, and why a public deploy with your key would let anyone spend your quota. Bind is loopback on purpose.

## Test

```bash
node --test
```

## Stack

Node 20+, ESM, JSDoc, no build step, no runtime dependencies. Shared modules live in `lib/` and are also served to the browser under `/lib/`.
