/**
 * Composition root: wires the store, board, editor, toolbar, URL session,
 * undo toast, and unload guard. Returns a controller so tests (and future
 * hot-reload code) can tear the app down cleanly.
 */

import noteStore, { NoteStore } from '../notes/store';
import { createNoteActions } from './noteActions';
import { createUrlSession, buildCanonicalUrl } from './urlSession';
import { setupUnloadGuard } from './unloadGuard';
import { createBoard, BoardController } from '../ui/board';
import { clearSearchInput } from '../ui/dom';
import { createInlineEditor } from '../ui/inlineEditor';
import { setupToolbar } from '../ui/toolbar';
import { createUndoToast } from '../ui/undoToast';
import { createWarnings } from '../ui/warnings';

export interface AppController {
  store: NoteStore;
  destroy: () => void;
}

export const bootstrap = (store: NoteStore = noteStore): AppController => {
  const warnings = createWarnings();
  const undo = createUndoToast(store);

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
  });
  boardHolder.current = board;

  const urlSession = createUrlSession({
    store,
    warnings,
    render: () => board.render(),
    beforeBoardReplacement: () => {
      editor.end();
      undo.hide();
    },
  });

  const unsubscribe = store.subscribe(urlSession.onStateChanged);
  const cleanupToolbar = setupToolbar({
    store,
    board,
    editor,
    addNote: noteActions.addNote,
    clearCompleted: noteActions.clearCompleted,
    buildShareUrl: () => buildCanonicalUrl(store.getEncoded()),
  });
  const unloadGuard = setupUnloadGuard(editor.hasUnsavedDraft);

  window.addEventListener('hashchange', urlSession.handleHashChange, false);
  urlSession.initialize();
  board.render();

  return {
    store,
    destroy: (): void => {
      unsubscribe();
      cleanupToolbar();
      unloadGuard.destroy();
      undo.destroy();
      editor.end();
      warnings.destroy();
      window.removeEventListener('hashchange', urlSession.handleHashChange, false);
    },
  };
};
