# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/).

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
