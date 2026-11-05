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
    I --> J[Get notes from AppState.notes.getAll]
    J --> K[Filter out completed unless Show completed checked]
    K --> L[Render each note via NoteComponent]
    L --> M[Update notes count via notesStateChanged]

    N[User clicks Add Note] --> O[Create new note with generateId]
    O --> P[AppState.notes.add]
    P --> F

    Q[User clicks Edit on note] --> R[startInlineEdit]
    R --> S[Replace title/body with inputs]
    S --> T[User saves]
    T --> U[AppState.notes.update]
    U --> F

    V[User toggles checkbox on note] --> W[AppState.notes.update completed]
    W --> F

    X[User clicks Delete] --> Y[AppState.notes.remove]
    Y --> F

    Z[User types in search] --> AA[AppState.notes.search with Fuse.js]
    AA --> K

    AB[User toggles Show completed] --> I

    AC[User navigates hash] --> AD[hashchange event]
    AD --> C
```

## Data Flow

1. **State Management** (`src/state/appState.ts`): Singleton factory pattern with immutable updates. All state changes go through `setState()` which clones, normalizes, and publishes events.
2. **URL Encoding** (`src/utils/urlState.ts`): Compact JSON (`{n:[{i,t,b,c}]}`) → UTF-8 → base64url. Decoded on load, encoded on changes. `c` marks completed notes.
3. **UI** (`src/index.ts`, `src/components/note.ts`): Event-driven, subscribes to pubsub events. Renders sticky notes on a corkboard, supports inline editing, completion toggles, search, and filtering.
4. **Search** (`AppState.notes.search`): Uses Fuse.js for fuzzy search across title and body. Results are filtered to hide completed notes unless "Show completed" is checked.
5. **Completion**: Each note can be marked completed via checkbox. Completed notes show a large red "X" overlay and are hidden by default.
