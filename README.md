# Sticky Notes Corkboard

[![Netlify Status](https://api.netlify.com/api/v1/badges/671744ae-7c50-4f77-8c10-224ffadd9a1a/deploy-status)](https://app.netlify.com/projects/vigorous-wilson-ce6cfa/deploys)

A vanilla TypeScript sticky-note corkboard that persists all application state in the URL hash as base64url-encoded data. Share notes by simply sharing the URL.

![Sticky Notes corkboard](./docs/screenshot.png)

## Features

- **Corkboard UI** - Notes displayed as colorful sticky cards on a corkboard background
- **Add Notes** - Click "Add Note" to create a new note and edit inline
- **Inline Editing** - Click edit on any note to modify title and body in place (one note at a time); searching, filtering, or changing another note saves the draft first instead of discarding it, and the browser warns before leaving with an unsaved edit
- **Keyboard Shortcuts** - `N` new note, `/` focus search, `Esc` cancel edit, `Ctrl/Cmd+Enter` save edit
- **Pin to Top** - Pin notes to keep them prioritized at the top of the board
- **Note Colors** - Cycle a note through a small sticky-note color palette
- **Complete Notes** - Mark notes as completed with a checkbox; completed notes show a large red "X" overlay
- **Show/Hide Completed** - Toggle visibility of completed notes (hidden by default)
- **Clear Completed** - Remove all completed notes in one action
- **Undo** - Deleted a note by accident? An undo toast appears after deletions and clear-completed. Its 6-second countdown pauses while the toast is focused or hovered, and it can be dismissed with the × button or `Esc`
- **Empty States** - Context-aware guidance when there are no notes, no search matches, or all notes are completed
- **Copy Share Link** - Save any open edit, then copy a canonical link rebuilt from the current note state, even if the address bar could not be updated
- **Delete Notes** - Remove notes with the delete button
- **Search** - Debounced fuzzy search across note titles and bodies using the basic Fuse.js build; the search index is cached per state revision
- **URL State Persistence** - Entire app state is encoded in the URL hash for easy sharing and bookmarking, with a versioned schema and a write budget that matches the decoder
- **Safe Recovery** - Unreadable, truncated, oversized, or newer-version links are preserved with an explanation and an explicit "Start empty" action instead of being overwritten
- **No Backend Required** - Fully client-side application

## Tech Stack

- **Language**: TypeScript 5.9
- **Build Tool**: Vite 7
- **Styling**: CSS3
- **Search**: Fuse.js (basic build)
- **ID Generation**: nanoid
- **Testing**: Jest 30 with jsdom

## Getting Started

Requires Node.js 22.12 or newer. CI and Netlify use the Node 24 LTS release pinned in `.nvmrc` (`lts/krypton`).

### Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

### Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

## How It Works

Application state (all notes) is serialized, compacted with short keys (`v` schema version, `n` notes; each note uses `i` id, `t` title, `b` body, `c` completed, `p` pinned, `k` color), encoded as UTF-8, converted to base64url, and stored in the URL hash (`#/...`; the parser also accepts `#...`). Links without a `v` field are treated as version 1, and duplicate note ids in a shared link are dropped. On page load or hash change, the state is decoded and restored. Any state change automatically updates the URL while preserving the query string; if the link grows past 16k characters (or the browser refuses the history update), a visible warning banner explains that the link may not be shareable. The compact JSON payload is capped at 75,000 UTF-8 bytes (which base64url-encodes to at most 100,000 characters, matching the decoder), so a board that cannot produce a reopenable link is rejected before it replaces the current state. The Copy link button rebuilds the canonical URL from the current state rather than reading a possibly stale address bar. Unreadable, truncated, oversized, or unknown-version hashes are left untouched; the board starts empty, the reason is shown, and only the explicit "Start empty" button clears the hash. Leaving the page with a dirty inline edit triggers the browser's unsaved-changes confirmation.

See [APP_FLOW.md](./APP_FLOW.md) for a detailed flow diagram.

## Privacy

The URL state is **encoded, not encrypted**. Anyone who has a shared link can read every note in it, and URLs may be retained in browser history, chat apps, email clients, and server access logs. Don't put secrets in a note. See [SECURITY.md](./SECURITY.md) for reporting and dependency-override details.

## Deployment

The build is fully static, so any static host works.

### Netlify

The repository includes `netlify.toml` with the build command (`npm run build`), publish directory (`dist`), Node 24 (`NODE_VERSION`), HSTS, a strict CSP with no inline styles, and cache headers (immutable assets, revalidated `index.html`). Production source maps are disabled. Connect the repository in Netlify and deploy; no environment variables are required. Keep the Netlify UI Node version unset so it doesn't override `netlify.toml`.

### Other static hosts

Run `npm run build` and upload the contents of `dist/`. Because every route lives in the URL hash, no server rewrite rules are needed.

## Application Flow

```mermaid
graph TD
    A[User loads page] --> B[index.ts initializes]
    B --> C[Read URL hash - accepts #/encoded or #encoded]
    C -->|invalid, oversized, or unknown version| CR[Keep original hash; show reason and Start empty action]
    CR --> CS[Render empty board without rewriting the hash]
    C -->|valid| D[AppState.state.setEncoded hash]
    D --> E[decodeStateDetailed parses compact JSON]
    E --> F[AppState updates internal state]
    F --> G[PubSub publishes appStateChanged]
    G --> H[Sync canonical URL via syncStateToUrl + warning guard]
    G --> I[renderAllNotes called - active draft restored]
    I --> M[Update notes count]
    I --> J[Get visible notes via search + completion filter + pin sort]
    J --> L[Render each note via NoteComponent]

    N[User clicks Add Note or presses N] --> N1[Commit active draft; clear search]
    N1 --> N2{Within URL byte budget?}
    N2 -->|no| N3[Keep board unchanged; show size warning]
    N2 -->|yes| O[Create new note with generateId]
    O --> P[AppState.notes.add]
    P --> F

    Q[User clicks Edit on note] --> R[startInlineEdit]
    R --> S[Replace title/body with inputs, tracked as a draft]
    S --> T[User saves - button or Ctrl/Cmd+Enter]
    T --> T1{Within URL byte budget?}
    T1 -->|no| T2[Keep editor open with size error]
    T1 -->|yes| U[AppState.notes.update]
    U --> F
    S --> V[User cancels - button or Esc]
    V --> I
    S --> V2[Dirty draft present on reload/tab close]
    V2 --> V3[beforeunload asks the browser to confirm]

    W[User toggles complete/pin/color on note] --> X[AppState.notes.update]
    X --> F

    Y[User clicks Delete] --> Z[capture undo entry]
    Z --> AA[AppState.notes.remove]
    AA --> AB[Show undo toast; countdown paused while focused or hovered]
    AB --> AC[User clicks Undo]
    AC --> AD[AppState.notes.setAll restores original order]
    AD --> F
    AB --> AB1[Dismiss with button or Esc]

    AE[User clicks Clear completed] --> AF[capture undo entries]
    AF --> AG[AppState.notes.clearCompleted]
    AG --> AB

    AH[User types in search] --> AH1[Commit active draft, then debounce 100 ms]
    AH1 --> I

    AI[User toggles Show completed] --> AI1[Commit active draft; revert toggle if invalid]
    AI1 --> I

    AJ[User clicks Copy link] --> AJ1[Commit active draft; abort if invalid]
    AJ1 --> AJ2[Rebuild canonical URL from current state and copy it]

    AK[User navigates hash] --> AL[hashchange event - end active edit, drop undo history]
    AL --> C
    AM[Hash becomes empty] --> AN[Reset to empty board]
```

## Release notes

See [CHANGELOG.md](./CHANGELOG.md). The current release is `v0.1.1`.

## License

ISC — see [LICENSE](./LICENSE).
