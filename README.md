# Jev 3000

A small demo of [TypeSafe's](https://typesafe.ai) Jev decision model and its three primitives: Noul, Choice, and Score.

Each primitive gets its own panel with a tree-based "branch composer" for building up questions and state, plus a JSON editor for editing the same request by hand. A readout renders the model's answers, including probabilities drawn as bars. A separate warm-connection demo shows the latency difference between a cold TypeSafe connection and one that has already been warmed up.

## Requirements

- Node 24
- [Vite+](https://viteplus.dev) (`vp`)
- The [`op` 1Password CLI](https://developer.1password.com/docs/cli/) with desktop-app integration enabled

## Setup

Install dependencies:

```sh
vp install
```

The TypeSafe API key is never stored in this repo. It's read from 1Password through [Varlock](https://varlock.dev), using the reference in [`.env.schema`](./.env.schema). To use your own key, sign in to the 1Password desktop app, enable its CLI integration, then edit the `op://` reference in `.env.schema` to point at your own vault and item.

Start the dev server:

```sh
vp dev
```

## Commands

- `vp check` — format, lint, and type check
- `vp test` — run the test suite
- `vp run build` — type check and build for production

## How the key stays server-side

The browser never sees `TYPESAFE_API_KEY`. It's read only inside the `/api/jev` middleware in [`server/jev-api.ts`](./server/jev-api.ts), which the dev and preview servers register as a Vite+ plugin. The UI talks to `/api/jev` and `/api/jev/warm` over HTTP; TypeSafe is only ever called from the server.

## Built with Claude Code

This project was built with [Claude Code](https://claude.com/claude-code).
