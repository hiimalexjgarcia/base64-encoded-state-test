# Application Flow Diagram

```mermaid
graph TD
    A[User loads page] --> B[index.ts initializes]
    B --> C[Read URL hash - accepts #/encoded or #encoded]
    C -->|hash empty| D[Keep empty board]
    C -->|hash present| E[AppState.state.setEncoded hash]
    E --> F[decodeState: size cap, base64url, compact JSON]
    F --> G[Validate each note]
    G --> H[AppState updates internal state]
    D --> I[renderAllNotes - active draft restored]
    H --> J[PubSub publishes appStateChanged]
    J --> K[syncStateToUrl + replaceState]
    K --> L{URL too long or replaceState failed?}
    L -->|yes| M[Show visible URL warning banner]
    L -->|no| N[Clear warning if present]
    J --> I
    I --> O[getVisibleNotes: search + completion filter + pin sort]
    O --> P[Render each note via NoteComponent]
    I --> Q[Update notes count]

    R[User clicks Add Note or presses N] --> R1[Commit active draft; clear search]
    R1 --> S[Create note with generateId + random color]
    S --> T[AppState.notes.add]
    T --> J
    T --> U[startInlineEdit]

    V[User clicks Edit] --> U
    U --> W[Replace title/body with capped inputs; track a draft]
    W --> X[User saves: button or Ctrl/Cmd+Enter]
    X --> Y{validateNote passes?}
    Y -->|no| Z[Keep editor open + show inline alert]
    Y -->|yes| AA[AppState.notes.update]
    AA --> J
    W --> AB[User cancels: button or Esc]
    AB --> I

    AC[User toggles complete / pin / color] --> AD[AppState.notes.update]
    AD --> J

    AE[User clicks Delete] --> AF[captureUndo]
    AF --> AG[AppState.notes.remove]
    AG --> J
    AG --> AH[Show undo toast; countdown paused while focused or hovered]
    AH --> AI[User clicks Undo]
    AI --> AJ[AppState.notes.setAll restores original order]
    AJ --> J
    AH --> AH1[Dismiss with button or Esc]

    AK[User clicks Clear completed] --> AL[captureUndo]
    AL --> AM[AppState.notes.clearCompleted]
    AM --> J
    AM --> AH

    AN[User types in search or presses /] --> AN1[Commit active draft, then debounce 100 ms]
    AN1 --> I
    AO[User toggles Show completed] --> AO1[Commit active draft; revert toggle if invalid]
    AO1 --> I
    AP[User clicks Copy link] --> AP1[Commit active draft; abort if invalid]
    AP1 --> AQ[Copy current URL to clipboard]
    AR[User navigates hash / back / forward] --> AS[hashchange: end edit, drop undo history]
    AS -->|hash empty| AT[Reset state to empty board]
    AS -->|hash present| E
    AT --> J
```

## Data Flow

1. **State Management** (`src/state/appState.ts`): Singleton factory pattern with immutable updates. All state changes go through `setState()` which clones, normalizes, validates notes, and publishes `appStateChanged`. Invalid adds/updates are rejected; the UI validates before calling them so users see an inline error instead of a silent no-op.
2. **URL Encoding** (`src/utils/urlState.ts`): Compact JSON (`{v,n:[{i,t,b,c,p,k}]}`) → UTF-8 → base64url. `v` is the schema version (currently 1; links without it are treated as v1, unknown versions are rejected). Decoded on load and on `hashchange`; encoded whenever state changes. The hash reader accepts both `#/<state>` and `#<state>`. `c` marks completed notes, `p` marks pinned notes, `k` stores an optional note color. Encoded input longer than `MAX_ENCODED_LENGTH` is discarded before decoding, and duplicate note ids are dropped so update/remove still target a single note.
3. **URL Sync & Guardrails** (`src/index.ts`): `syncStateToUrl` writes `pathname + search + #/state` with `history.replaceState`, preserving query parameters. If the URL exceeds 16k characters, or the browser rejects the update, a visible `#urlWarning` banner explains that the link may be truncated or stale. The banner clears automatically when the URL becomes short enough again.
4. **UI** (`src/index.ts`, `src/components/note.ts`, `src/utils/view.ts`): Event-driven, subscribes to `appStateChanged`. Renders sticky notes on a corkboard with a pure view pipeline (`getVisibleNotes`: search, completion filter, pinned-first sort), supports inline editing with `Esc`/`Ctrl+Enter` shortcuts (Escape works from the Save/Cancel buttons too), completion/pin/color toggles, search, filtering, copy-link, clear-completed, and an undo toast for deletions and clear-completed. The active editor is an `EditDraft` (id, title, body, focused field, caret position): state-change re-renders rebuild the board and re-mount that editor with the draft intact, while search, show-completed, add-note, clear-completed, and copy-link first commit the draft so an external action cannot silently discard typed text. An invalid draft aborts the external action (the show-completed checkbox reverts) and keeps the editor and its error visible. Saving or cancelling returns focus to the note's Edit button. The undo toast pauses while focused or hovered, dismisses with its × button or `Esc`, and resumes with the remaining time; a `hashchange` ends any active edit and drops the undo history because the incoming URL replaces the board.
5. **Search** (`src/utils/view.ts`): The single search implementation uses the Fuse.js basic build (no extended-search operators) across title and body. The search input commits any active edit, then is debounced by 100 ms before the board re-renders. The Fuse index is cached by the AppState revision counter, since `notes.getAll()` returns a clone. Visible results respect the active search query, completion filter, and pin priority. The notes count is updated inside `renderAllNotes` and announces visible vs. total results (e.g. "1 of 5 notes").
6. **Pin priority**: Notes can be pinned to stay at the top of the displayed list (pinned notes sort first; relative order preserved within groups). Pin state is stored in the URL.
7. **Keyboard shortcuts**: `N` adds a note, `/` focuses search, `Esc` cancels an inline edit, and `Ctrl/Cmd+Enter` saves one. Shortcuts are ignored while typing in an input or textarea.
