# UX overflow hardening

## Objective
Keep chrome, instruments and copy from overflowing or clipping at phone width, in Spanish, and with long ids.

## Why
Audit of 2026-09-20: `.panel-h` does not wrap, score badges hang past 16px padding, copy overlay is sized for English, display titles at `line-height: 0.95` clip accents.

## Scope
CSS in `public/styles.css` only. Do not restyle tokens or change copy.

## Constraints
- Zero runtime dependencies, no build step.
- Artifacts in English. No new i18n keys.
- Do not touch unrelated dirty files (`README.md`, `.atl/`, `package-lock.json`).

## TDD
- Mode: enabled for JS. This unit is layout CSS: no RED/GREEN unit test. Runner still `node --test` for the existing suite.
- Source: project convention (DOM files have no unit tests).
- Runtime harness: N/A (no browser test runner). Visual check is the user's Chrome.

## Delivery
- Route: direct inline (one CSS file). Trigger evidence: no 4-file map, no second non-trivial implementation file.
- Strategy: ask-on-risk. Forecast: ~80 authored lines. Under 400.

## Tasks
- [x] T1 Stop overflow: wrap `.panel-h`, inset score labels, size copy overlay for Spanish, raise display line-height, wrap long ids, stack policy/level rows on small screens, respect safe-area, keep iOS inputs at 16px.

## Acceptance
- At ~360px, panel headers wrap instead of stretching the page.
- Score marker labels at 0 and max stay inside the instrument.
- "Error al copiar" does not cover the code.
- Uppercase display titles do not clip accents (`Ó` in LÓGICA).

## Progress
- Engram mirror: pending (session bind failed this turn).

## Evidence
- T1: commit `074734c`. `public/styles.css`. `node --test` 160 pass / 0 fail. Runtime harness: N/A (no browser test runner; layout is CSS). Rollback boundary: `public/styles.css` and this file.

## Next step
User reviews in Chrome at ~360px, ES, both themes. Push/PR remain a user decision.
