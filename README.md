# Base64 Encoded State Test

[![Netlify Status](https://api.netlify.com/api/v1/badges/671744ae-7c50-4f77-8c10-224ffadd9a1a/deploy-status)](https://app.netlify.com/projects/vigorous-wilson-ce6cfa/deploys)

A vanilla TypeScript sticky note web app that persists all application state in the URL hash as compressed, base64url-encoded data. Share notes by simply sharing the URL.

## Features

- **Sticky Note UI** - Notes displayed as colorful sticky cards in a grid layout
- **Add Notes** - Click "Add Note" to create a new note and edit inline
- **Inline Editing** - Click edit on any note to modify title and body in place (one note at a time)
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

Application state (all notes) is serialized, compacted with short keys, encoded as UTF-8, converted to base64url, and stored in the URL hash (`#/...`). On page load or hash change, the state is decoded and restored. Any state change automatically updates the URL.

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
    I --> J[Get all notes from AppState.notes.getAll]
    J --> K[Render each note via NoteComponent]
    K --> L[Update notes count via notesStateChanged]
    
    M[User clicks Add Note] --> N[Create new note with generateId]
    N --> O[AppState.notes.add]
    O --> F
    
    P[User clicks Edit on note] --> Q[startInlineEdit]
    Q --> R[Replace title/body with inputs]
    R --> S[User saves]
    S --> T[AppState.notes.update]
    T --> F
    
    U[User clicks Delete] --> V[AppState.notes.remove]
    V --> F
    
    W[User types in search] --> X[AppState.notes.search with Fuse.js]
    X --> Y[Render filtered results]
    
    Z[User navigates hash] --> AA[hashchange event]
    AA --> C
```
