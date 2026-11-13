# Application Flow Diagram

```mermaid
graph TD
    A[User loads page] --> B[main.ts starts<br/>bootstrap composition root]
    B --> C[urlSession reads URL hash<br/>accepts #/encoded or #encoded]
    C -->|hash empty| D[Keep empty board]
    C -->|hash present| E[store.loadEncoded → urlCodec.decodeStateDetailed]
    E -->|read error| E1[Keep original hash; load empty board]
    E1 --> E2[warnings shows reason + Start empty action]
    E -->|valid| F[Decode base64url + compact JSON; enforce byte budget]
    F --> G[Validate each note]
    G --> H[store commits state and bumps revision]
    D --> I[board.render - active draft restored]
    H --> J[store publishes to subscribers]
    J --> K[urlSession syncs canonical URL + warnings guard]
    K --> L{URL too long or replaceState failed?}
    L -->|yes| M[warnings shows visible banner]
    L -->|no| N[Clear warning if present]
    J --> I
    I --> O[selectors.getVisibleNotes:<br/>search + completion filter + pin sort]
    O --> P[noteCard renders each note]
    I --> Q[board updates notes count]

    R[User clicks Add Note or presses N] --> R1[noteActions commits active draft; clears search]
    R1 --> R2{store within URL byte budget?}
    R2 -->|no| R3[Keep board unchanged; warnings shows size warning]
    R2 -->|yes| S[Create note with generateId + random color]
    S --> T[store.addNote]
    T --> J
    T --> U[inlineEditor.start]

    V[User clicks Edit] --> U
    U --> W[Replace title/body with capped inputs; track a draft]
    W --> X[User saves: button or Ctrl/Cmd+Enter]
    X --> Y{validateNote passes?}
    Y -->|no| Z[Keep editor open + show inline alert]
    Y -->|yes| Y1{store accepts the update within budget?}
    Y1 -->|no| Y2[Keep editor open + show size error]
    Y1 -->|yes| AA[store.updateNote]
    AA --> J
    W --> AB[User cancels: button or Esc]
    AB --> I
    W --> W1[Dirty draft on reload/tab close]
    W1 --> W2[unloadGuard beforeunload asks for confirmation]

    AC[User toggles complete / pin / color] --> AD[store.updateNote]
    AD --> J

    AE[User clicks Delete] --> AF[noteActions captures undo entry]
    AF --> AG[store.removeNote]
    AG --> J
    AG --> AH[undoToast shows; countdown paused while focused or hovered]
    AH --> AI[User clicks Undo]
    AI --> AJ[noteActions restores the previous order]
    AJ --> J
    AH --> AH1[Dismiss with button or Esc]

    AK[User clicks Clear completed] --> AL[noteActions captures undo entries]
    AL --> AM[store.clearCompleted]
    AM --> J
    AM --> AH

    AN[User types in search or presses /] --> AN1[Commit active draft, then debounce 100 ms]
    AN1 --> I
    AO[User toggles Show completed] --> AO1[Commit active draft; revert toggle if invalid]
    AO1 --> I
    AP[User clicks Copy link] --> AP1[Commit active draft; abort if invalid]
    AP1 --> AQ[urlSession.buildCanonicalUrl from current state; copy it]
    AR[User navigates hash / back / forward] --> AS[hashchange: end edit, drop undo history]
    AS -->|hash empty| AT[Reset store to empty board]
    AS -->|hash present| E
    AT --> J
```

## Module Layout

- **Entry point** (`src/main.ts`): Imports `src/styles/app.css`, chooses when to start based on `document.readyState`, and exports `stop()` for teardown. All wiring lives in the composition root, not here.
- **Composition root** (`src/app/bootstrap.ts`): `bootstrap(store = noteStore)` constructs the warnings, undo toast, inline editor, board, toolbar, URL session, and unload guard, then returns an `AppController` whose `destroy()` removes every listener and timer. The board and editor reference each other through a small holder so the dependency stays acyclic; no UI module keeps module-level state.
- **Note model** (`src/notes/model.ts`): `Note`, `NOTE_COLORS`, `NOTE_VALIDATION`, `validateNote`, `normalizeNote`, `cycleColor`, and `randomColor`.
- **Store** (`src/notes/store.ts`): `createNoteStore()` plus a singleton default. Flattened methods (`addNote`, `updateNote`, `removeNote`, `setNotes`, `clearCompleted`, `loadEncoded`, `getEncoded`, `getNotes`, `getState`, `getRevision`, `subscribe`) return typed `MutationResult`/`LoadResult` values instead of throwing. Mutations are validated, budget-checked, committed immutably, and bump a monotonic revision.
- **Selectors** (`src/notes/selectors.ts`): Pure sorting, completion filtering, and Fuse search helpers, plus `createVisibleNotesSelector()`, which owns the Fuse index cache keyed by store revision.
- **Persistence** (`src/persistence/urlCodec.ts`): Compact JSON (`{v,n:[{i,t,b,c,p,k}]}`) → UTF-8 → base64url, decode failure reasons, byte/length budgets, and `generateId`.
- **App services** (`src/app/`): `noteActions.ts` (add/delete/clear-completed and undo capture), `urlSession.ts` (hash load, canonical URL, sync, recovery), `unloadGuard.ts` (dirty-draft `beforeunload`), and `errors.ts` (error reporting).
- **UI factories** (`src/ui/`): `board.ts` renders the visible list and restores the active draft, `inlineEditor.ts` owns the draft lifecycle, `toolbar.ts` wires buttons/search/shortcuts, `noteCard.ts` builds a note element, `warnings.ts` manages the URL/decode banners, `undoToast.ts` manages the undo countdown, and `dom.ts`/`format.ts` hold small helpers.
- **Tests**: Unit tests sit next to the modules they cover (`src/**/*.test.ts`). Whole-app tests live in `tests/` and share `tests/support/appHarness.ts`, which boots the real composition root against the real `index.html` body with a fresh store per test.

## Data Flow

1. **State Management** (`src/notes/store.ts`): A factory creates an immutable state container. Every mutation validates and normalizes the affected note, checks the URL byte budget, and commits by replacing the state object. Rejected mutations leave state untouched, return `{ ok: false, reason: 'invalid' | 'budget' }`, and publish nothing. Committed changes bump a revision and notify subscribers; `getState()`/`getNotes()` return clones so callers cannot mutate internal data.
2. **URL Encoding** (`src/persistence/urlCodec.ts`): Compact JSON (`{v,n:[{i,t,b,c,p,k}]}`) → UTF-8 → base64url. `v` is the schema version (currently 1; links without it are treated as v1, unknown versions are rejected). Decoded on load and on `hashchange`; encoded whenever state changes. The hash reader accepts both `#/<state>` and `#<state>`. `c` marks completed notes, `p` marks pinned notes, and `k` stores an optional note color. Encoded input longer than `MAX_ENCODED_LENGTH` (100,000 characters) is rejected before decoding, and the compact payload is capped at `MAX_STATE_BYTES` (75,000 UTF-8 bytes) so a generated link can always be reopened. `decodeStateDetailed` reports a reason (`too-long`, `invalid-encoding`, `invalid-json`, `invalid-shape`, or `unsupported-version`). Duplicate note ids are dropped so update/remove still target a single note.
3. **URL Session & Guardrails** (`src/app/urlSession.ts`): `buildCanonicalUrl` produces `origin + pathname + search + #/state`, preserving query parameters. The session loads the hash into the store, syncs state changes with `history.replaceState`, and drives the warning banners. If the URL exceeds 16k characters or the browser rejects the update, `ui/warnings.ts` shows a visible `#urlWarning` explaining that the link may be truncated or stale; it clears automatically when the URL becomes short enough again. An unreadable incoming hash is not overwritten: the store stays empty, a `#decodeWarning` explains why and keeps the original link, and only its "Start empty" button clears the hash. Copy link rebuilds the same canonical URL from current state, so it is correct even when `replaceState` failed and the address bar is stale.
4. **UI** (`src/ui/board.ts`, `src/ui/inlineEditor.ts`, `src/ui/toolbar.ts`, `src/ui/noteCard.ts`): Factories subscribe to store changes and render sticky notes with a pure view pipeline (`selectors.getVisibleNotes`: search, completion filter, pinned-first sort). The board supports inline editing with `Esc`/`Ctrl+Enter` shortcuts (Escape works from the Save/Cancel buttons too), completion/pin/color toggles, search, filtering, copy-link, clear-completed, and an undo toast for deletions and clear-completed. The active editor is an `EditDraft` (id, title, body, focused field, caret position): state-change re-renders rebuild the board and re-mount that editor with the draft intact, while search, show-completed, add-note, clear-completed, and copy-link first commit the draft so an external action cannot silently discard typed text. An invalid or over-budget draft aborts the external action (the show-completed checkbox reverts) and keeps the editor and its error visible. `ui/unloadGuard.ts` triggers the browser's `beforeunload` confirmation for a dirty draft. Saving or cancelling returns focus to the note's Edit button. The undo toast pauses while focused or hovered, dismisses with its × button or `Esc`, and resumes with the remaining time; a `hashchange` ends any active edit and drops the undo history because the incoming URL replaces the board.
5. **Search** (`src/notes/selectors.ts`): The single search implementation uses the Fuse.js basic build (no extended-search operators) across title and body. The search input commits any active edit, then is debounced by 100 ms before the board re-renders. `createVisibleNotesSelector()` caches the Fuse index by the store revision counter, since `getNotes()` returns a clone. Visible results respect the active search query, completion filter, and pin priority. The notes count is updated by the board and announces visible vs. total results (e.g. "1 of 5 notes").
6. **Pin priority**: Notes can be pinned to stay at the top of the displayed list (pinned notes sort first; relative order preserved within groups). Pin state is stored in the URL.
7. **Keyboard shortcuts**: `N` adds a note, `/` focuses search, `Esc` cancels an inline edit, and `Ctrl/Cmd+Enter` saves one. Shortcuts are ignored while typing in an input or textarea.
