# Base64 Encoded State Test

[![Netlify Status](https://api.netlify.com/api/v1/badges/671744ae-7c50-4f77-8c10-224ffadd9a1a/deploy-status)](https://app.netlify.com/projects/vigorous-wilson-ce6cfa/deploys)

A vanilla TypeScript sticky note web app that persists all application state in the URL hash as base64url-encoded data. Share notes by simply sharing the URL.

## Features

- **Corkboard UI** - Notes displayed as colorful sticky cards on a corkboard background
- **Add Notes** - Click "Add Note" to create a new note and edit inline
- **Inline Editing** - Click edit on any note to modify title and body in place (one note at a time)
- **Pin to Top** - Pin notes to keep them prioritized at the top of the board
- **Note Colors** - Cycle a note through a small sticky-note color palette
- **Complete Notes** - Mark notes as completed with a checkbox; completed notes show a large red "X" overlay
- **Show/Hide Completed** - Toggle visibility of completed notes (hidden by default)
- **Clear Completed** - Remove all completed notes in one action
- **Copy Share Link** - Copy the current URL (with full note state) to the clipboard
- **Delete Notes** - Remove notes with the delete button
- **Search** - Fuzzy search across note titles and bodies using Fuse.js
- **URL State Persistence** - Entire app state is encoded in the URL hash for easy sharing and bookmarking
- **No Backend Required** - Fully client-side application

## Tech Stack

- **Language**: TypeScript 5.9
- **Build Tool**: Vite 6
- **Styling**: CSS3
- **Search**: Fuse.js
- **ID Generation**: nanoid
- **Testing**: Jest 30 with jsdom

## Getting Started

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

Application state (all notes) is serialized, compacted with short keys (`i` id, `t` title, `b` body, `c` completed, `p` pinned, `k` color), encoded as UTF-8, converted to base64url, and stored in the URL hash (`#/...`). On page load or hash change, the state is decoded and restored. Any state change automatically updates the URL.

See [APP_FLOW.md](./APP_FLOW.md) for a detailed flow diagram.

## Application Flow

```mermaid
graph TD
    A[User loads page] --> B[index.ts initializes]
    B --> C[Read URL hash #/encoded]
    C --> D[AppState.state.setEncoded hash]
    D --> E[decodeState parses compact JSON]
    E --> F[AppState updates internal state]
    F --> G[PubSub publishes appStateChanged]
    G --> H[Sync URL hash via syncStateToUrl]
    G --> I[renderAllNotes called]
    G --> M[Update notes count]
    I --> J[Get visible notes via search + completion filter + pin sort]
    J --> L[Render each note via NoteComponent]

    N[User clicks Add Note] --> O[Create new note with generateId]
    O --> P[AppState.notes.add]
    P --> F

    Q[User clicks Edit on note] --> R[startInlineEdit]
    R --> S[Replace title/body with inputs]
    S --> T[User saves]
    T --> U[AppState.notes.update]
    U --> F

    V[User toggles complete/pin on note] --> W[AppState.notes.update]
    W --> F

    X[User clicks Delete] --> Y[AppState.notes.remove]
    Y --> F

    Z[User types in search] --> I

    AB[User toggles Show completed] --> I

    AC[User navigates hash] --> AD[hashchange event]
    AD --> C
```
