# Jev Lab

A local lab for learning and testing [TypeSafe](https://docs.typesafe.ai)'s Jev model.

Jev is a System One model: you send state and typed questions, and it returns typed
answers (probabilities), not prose. Your code stays in control of the workflow.

## Run

Get a key at https://console.typesafe.ai/keys, then either export it or put it in a
git-ignored `.env` file next to `server.mjs`:

```bash
# .env
TYPESAFE_API_KEY=your-key-here
PORT=4173                 # optional
```

```bash
node server.mjs           # http://localhost:4173
```

No key? The lab starts in **demo mode**: a keyword heuristic that mimics the response
shape so you can explore the interface. It is not Jev and its answers are not evidence
of how Jev behaves.

## Test

```bash
node --test
```

## Why a local server

The API key must stay server-side. The browser talks to `/api/systemone` on this
server, which forwards to `https://api.typesafe.ai/v1/systemone`.
