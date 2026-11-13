/**
 * URL sync: reads the hash, loads shared state, writes canonical URLs, and
 * owns the invalid-link recovery flow.
 */

import { NoteStore } from '../notes/store';
import { DecodeFailureReason } from '../url/codec';
import { URL_LENGTH_WARN_THRESHOLD, WarningsController } from '../ui/warnings';

/**
 * The canonical share URL is always rebuilt from state rather than read back
 * from window.location.href. The address bar may be stale when
 * history.replaceState failed, and the copied link must still contain the
 * notes the user can see.
 */
export const buildCanonicalUrl = (encoded: string): string => {
  const path = document.location.pathname || '/';
  // Preserve query parameters (e.g. analytics or campaign tags).
  const search = document.location.search || '';

  return `${window.location.origin}${path}${search}#/${encoded}`;
};

/**
 * Reads the encoded state from the canonical `#/<state>` hash. Other hash
 * formats are not treated as application state.
 */
export const readHash = (): string => {
  const { hash } = window.location;

  return hash.startsWith('#/') ? hash.slice(2) : '';
};

export interface UrlSyncDeps {
  store: NoteStore;
  warnings: WarningsController;
  render: () => void;
  /** End transient UI (active edit, undo toast) before replacing the board. */
  beforeBoardReplacement: () => void;
}

export interface UrlSyncController {
  initialize: () => void;
  onStateChanged: () => void;
  handleHashChange: () => void;
}

export const createUrlSync = (deps: UrlSyncDeps): UrlSyncController => {
  const { store, warnings } = deps;
  // True while an invalid incoming link is being replaced with an empty board.
  // The state must reset without rewriting the address bar, so the user's
  // original (possibly recoverable) link is preserved.
  let suppressUrlSync = false;
  let decodeFailure: DecodeFailureReason | null = null;

  const syncStateToUrl = (): void => {
    const state = store.getState();
    const encoded = store.getEncoded();
    if (state.notes.length > 0 && !encoded) {
      // The store enforces the budget, but never write an empty hash over a
      // board that still has notes if encoding somehow fails.
      warnings.showBudgetWarning();

      return;
    }

    const url = buildCanonicalUrl(encoded);

    try {
      window.history.replaceState(null, '', url);
    } catch {
      // Some browsers reject very long or otherwise invalid history URLs.
      // Keep the notes in memory and tell the user the link is stale.
      warnings.showReplaceWarning();

      return;
    }

    if (url.length > URL_LENGTH_WARN_THRESHOLD) {
      warnings.showLengthWarning(url.length);
    } else {
      warnings.clearUrlWarning();
    }
  };

  const startEmptyBoard = (): void => {
    decodeFailure = null;
    warnings.clearDecodeWarning();
    deps.beforeBoardReplacement();
    // Publishing an empty state also syncs the canonical `#/` URL because the
    // decode-warning suppression has already been lifted.
    store.loadEncoded('');
  };

  const initialize = (): void => {
    const hash = readHash();
    if (!hash) {
      decodeFailure = null;
      warnings.clearDecodeWarning();

      return;
    }

    const result = store.loadEncoded(hash);
    if (result.error) {
      // Keep the incoming hash exactly as it is. The failure reason lets the
      // warning explain what went wrong, and the explicit "Start empty" action
      // is the only thing that replaces the broken link.
      decodeFailure = result.error;
      suppressUrlSync = true;
      try {
        store.loadEncoded('');
      } finally {
        suppressUrlSync = false;
      }
      warnings.showDecodeWarning(result.error, startEmptyBoard);

      return;
    }

    decodeFailure = null;
    warnings.clearDecodeWarning();
  };

  return {
    initialize,

    onStateChanged: (): void => {
      if (suppressUrlSync) {
        // An unreadable incoming link is being replaced with an empty board.
        // Render it without rewriting the address bar so the original hash
        // stays available for the user to inspect or recover.
        deps.render();

        return;
      }

      // Once the user changes state, the preserved invalid link is no longer
      // the source of truth and its warning has served its purpose.
      if (decodeFailure) {
        decodeFailure = null;
        warnings.clearDecodeWarning();
      }

      syncStateToUrl();
      deps.render();
    },

    handleHashChange: (): void => {
      // Incoming URL state replaces the board wholesale, so an in-progress
      // edit no longer has a note to attach to, and an undo entry belongs to
      // the previous board.
      deps.beforeBoardReplacement();
      const hash = readHash();
      if (hash) {
        initialize();
      } else {
        // Clearing the hash drops the shared state instead of keeping the
        // previous board around under a URL that claims to be empty.
        decodeFailure = null;
        warnings.clearDecodeWarning();
        store.loadEncoded('');
      }
    },
  };
};
