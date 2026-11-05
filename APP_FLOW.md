# Application Flow Diagram

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
    I --> J[Get visible notes: search + completion filter + pin sort]
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

## Data Flow

1. **State Management** (`src/state/appState.ts`): Singleton factory pattern with immutable updates. All state changes go through `setState()` which clones, normalizes, and publishes `appStateChanged`.
2. **URL Encoding** (`src/utils/urlState.ts`): Compact JSON (`{n:[{i,t,b,c,p}]}`) → UTF-8 → base64url. Decoded on load, encoded on changes. `c` marks completed notes, `p` marks pinned notes.
3. **UI** (`src/index.ts`, `src/components/note.ts`): Event-driven, subscribes to `appStateChanged`. Renders sticky notes on a corkboard with a unified view pipeline (search, completion filter, pinned-first sort), supports inline editing, completion/pin toggles, search, and filtering.
4. **Search** (`AppState.notes.search`): Uses Fuse.js for fuzzy search across title and body. Visible results respect the active search query, completion filter, and pin priority.
5. **Pin priority**: Notes can be pinned to stay at the top of the displayed list (pinned notes sort first; relative order preserved within groups). Pin state is stored in the URL.
