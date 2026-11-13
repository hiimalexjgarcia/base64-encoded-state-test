# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/).

## [Unreleased]

### Changed

- Split `src/index.ts` into focused modules: `main.ts` (entry), `app/`
  (composition and services), `notes/` (model, store, selectors),
  `persistence/` (URL codec), `ui/` (DOM factories), and `styles/` (CSS).
- `bootstrap(store = noteStore)` now returns an `AppController` with
  `destroy()`, and the store exposes a flattened API with typed
  `MutationResult`/`LoadResult` values.
- Unit tests are colocated with their modules; whole-app tests moved to
  `tests/` and share a harness that boots against the real `index.html` body.
- Simplified `README.md` and `APP_FLOW.md`; the flow diagram now lives only in
  `APP_FLOW.md`.

### Removed

- Backwards compatibility for versionless URL payloads and non-canonical
  `#state` hashes. Links must use schema `v: 1` and the canonical `#/...` form.
- Support for padded or non-base64url encoded input.
- The duplicate `decodeState` wrapper; callers use `decodeStateDetailed`.

## [0.1.1] - 2026-11-12

### Added

- A total-state byte budget (`MAX_STATE_BYTES`, 75,000 UTF-8 bytes) that is
  checked before state changes commit, so every generated link fits within the
  100,000-character decode limit.
- `decodeStateDetailed` with explicit failure reasons (`too-long`,
  `invalid-encoding`, `invalid-json`, `invalid-shape`, `unsupported-version`).
- A recovery banner for unreadable links that keeps the original hash, explains
  why it could not be opened, and offers an explicit "Start empty" action.
- An unsaved-draft guard that triggers the browser's `beforeunload`
  confirmation when an inline edit differs from the saved note.

### Changed

- Copy link now rebuilds the canonical URL from current state instead of
  reading `window.location.href`, so it remains correct when `replaceState`
  failed and the address bar is stale.
- Adding or saving a note that would exceed the URL budget keeps the editor or
  board unchanged and shows a visible size warning.
- URL sync and copy-link share one canonical URL builder that preserves the
  current pathname and query string.

### Fixed

- Oversized boards can no longer produce links that the decoder rejects.
- Invalid, truncated, oversized, and unknown-version hashes are no longer
  silently rewritten to an empty board.

## [0.1.0] - 2026-11-10

### Added

- Inline note editing with draft preservation across re-renders.
- Fuzzy search, completion filtering, pin-to-top, note colors, and undo for
  deletions and clear-completed.
- Versioned URL state (`v: 1`) with duplicate-id rejection and a length guard.
- Accessibility improvements: list semantics, dynamic completion labels,
  visible/total result announcements, and `Esc` from editor buttons.
- Unit, integration, and real-`index.html` smoke tests with coverage gates.
- CI on Node 22.12 and 24, production dependency audit, and a Node matrix.
- `SECURITY.md`, `CHANGELOG.md`, social preview image, and deployment docs.
- Netlify hardening: HSTS, strict CSP without inline styles, revalidated
  `index.html`, and immutable asset caching.

### Changed

- Copy link now commits the active draft first and aborts on invalid drafts.
- Add Note clears an active search so the new note is always visible.
- `hashchange` drops the previous board's undo history.
- Save, cancel, and Escape restore focus to the note's Edit button.
- URL sync preserves query parameters.
- The Fuse index is cached per AppState revision.
- Switched to the Fuse.js basic build and removed extended-search operators.
- Validation bounds note ids and normalizes missing bodies.
- Removed unused TypeScript/Jest path aliases and `vite-tsconfig-paths`.

### Fixed

- Undo can no longer restore notes from a different shared board.
- Copy link no longer shares a stale title/body while an editor is open.
- Production builds no longer publish source maps.
