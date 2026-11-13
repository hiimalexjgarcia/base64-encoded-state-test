# Linkboard

[![Netlify Status](https://api.netlify.com/api/v1/badges/671744ae-7c50-4f77-8c10-224ffadd9a1a/deploy-status)](https://app.netlify.com/projects/vigorous-wilson-ce6cfa/deploys)

A vanilla TypeScript sticky-note board that keeps all state in the URL hash, so sharing the link shares the board.

![Linkboard corkboard with colorful sticky notes](./docs/screenshot.png)

## Features

- **No backend** — notes, colors, pins, and completion state live in the URL.
- **Inline editing** — one note at a time, with draft preservation, `Esc` cancel, and `Ctrl/Cmd+Enter` save.
- **Organize** — fuzzy search, hide completed (default), pin-to-top, and a small color palette.
- **Undo** — restore a deleted note or a clear-completed action from a dismissible toast.
- **Safe links** — versioned schema, write budget, canonical copy link, and a recovery banner for unreadable links.
- **Accessible** — list semantics, labelled controls, live result counts, and shortcuts (`N`, `/`, `Esc`, `Ctrl/Cmd+Enter`).

## Tech Stack

TypeScript 5.9 · Vite 7 · Fuse.js (basic build) · nanoid · Jest 30 + jsdom

## Getting Started

Requires Node.js 22.12 or newer. CI and Netlify use Node 24 via `.nvmrc`.

```bash
npm install
npm run dev       # development server
npm run build     # production build
npm run preview   # preview the build
npm test          # run tests
npm run lint      # lint
```

## How It Works

Notes are compacted to short keys, UTF-8 encoded, and stored as base64url in the URL hash (`#/...`). Links require schema version 1 and the canonical `#/` hash form. State changes rewrite the hash, and the board restores from it on load or `hashchange`. Links are capped at 75,000 UTF-8 bytes so a generated link can always be decoded. If the URL gets too long or the browser refuses the update, a visible warning explains; unreadable links are preserved with a reason and a "Start empty" option. Copy link rebuilds the canonical URL from current state.

See [APP_FLOW.md](./APP_FLOW.md) for the flow diagram and module layout.

## Privacy

The URL state is **encoded, not encrypted**. Anyone with the link can read every note, and URLs may be retained in history, chat apps, and server logs. Don't put secrets in a note. See [SECURITY.md](./SECURITY.md) for reporting and dependency details.

## Deployment

The build is static, so any static host works. For Netlify, connect the repository; `netlify.toml` sets the build command, publish directory, Node version, CSP, and cache headers. For other hosts, run `npm run build` and upload `dist/`. No rewrite rules are needed because routes live in the URL hash.

## Release notes

See [CHANGELOG.md](./CHANGELOG.md). The current release is `v0.3.0`.

## License

ISC — see [LICENSE](./LICENSE).
