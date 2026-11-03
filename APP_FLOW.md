# Application Flow Diagram

```mermaid
graph TD
    A[User loads page] --> B[index.ts initializes]
    B --> C[Read URL hash #/encoded]
    C --> D[AppState.state.setEncoded hash]
    D --> E[decodeState decompresses and validates]
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

## Data Flow

1. **State Management** (`src/state/appState.ts`): Singleton factory pattern with immutable updates. All state changes go through `setState()` which clones, normalizes, publishes events.
2. **URL Encoding** (`src/utils/urlState.ts`): Compact JSON (`{n:[{i,t,b}]}`) → UTF-8 → base64url. Decoded on load, encoded on changes.
3. **UI** (`src/index.ts`, `src/components/note.ts`): Event-driven, subscribes to pubsub events. Renders sticky notes, supports inline editing and search.
4. **Search** (`AppState.notes.search`): Uses Fuse.js for fuzzy search across title and body.
