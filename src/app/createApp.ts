/**
 * Composition root: wires the store, board, editor, toolbar, URL sync, undo,
 * and draft guard. Returns an app handle so tests and hot reload can tear it
 * down cleanly.
 */

import { NoteStore } from '../notes/store';
import { createBoard, BoardController } from '../ui/board';
import { clearSearchInput } from '../ui/dom';
import { createInlineEditor } from '../ui/inlineEditor';
import { createToolbar } from '../ui/toolbar';
import { createWarnings } from '../ui/warnings';
import { createNoteActions } from './noteActions';
import { createUndo } from './undo';
import { createUnsavedDraftGuard } from './unsavedDraftGuard';
import { buildCanonicalUrl, createUrlSync } from './urlSync';

export interface App {
  store: NoteStore;
  destroy: () => void;
}

export const createApp = (store: NoteStore): App => {
  const warnings = createWarnings();
  const undo = createUndo(store);

  // The board and editor refer to each other: the board re-mounts the active
  // draft after rendering, and the editor asks the board to re-render after a
  // save or cancel. The holder keeps that dependency acyclic without
  // introducing module-level state.
  const boardHolder: { current?: BoardController } = {};
  const editor = createInlineEditor({
    store,
    render: (options) => boardHolder.current?.render(options),
  });

  const noteActions = createNoteActions({
    store,
    editor,
    undo,
    clearSearch: clearSearchInput,
    onBudgetExceeded: warnings.showBudgetWarning,
  });

  const board = createBoard({
    store,
    getDraft: editor.getDraft,
    endDraft: editor.end,
    mountDraft: editor.mount,
    onDelete: noteActions.deleteNote,
    onEdit: editor.start,
    onToggleCompleted: noteActions.toggleCompleted,
    onTogglePinned: noteActions.togglePinned,
    onCycleColor: noteActions.cycleNoteColor,
  });
  boardHolder.current = board;

  const urlSync = createUrlSync({
    store,
    warnings,
    render: () => board.render(),
    beforeBoardReplacement: () => {
      editor.end();
      undo.hide();
    },
  });

  const unsubscribe = store.subscribe(urlSync.onStateChanged);
  const cleanupToolbar = createToolbar({
    board,
    editor,
    addNote: noteActions.addNote,
    clearCompleted: noteActions.clearCompleted,
    buildShareUrl: () => buildCanonicalUrl(store.getEncoded()),
  });
  const draftGuard = createUnsavedDraftGuard(editor.hasUnsavedDraft);

  window.addEventListener('hashchange', urlSync.handleHashChange, false);
  urlSync.initialize();
  board.render();

  return {
    store,
    destroy: (): void => {
      unsubscribe();
      cleanupToolbar();
      draftGuard.destroy();
      undo.destroy();
      editor.end();
      warnings.destroy();
      window.removeEventListener('hashchange', urlSync.handleHashChange, false);
    },
  };
};
