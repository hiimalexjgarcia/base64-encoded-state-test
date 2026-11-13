/**
 * Application-level note actions: add, edit state, delete, and clear
 * completed. All note mutations go through here so budget failures are
 * reported consistently.
 */

import { createNote } from '../notes/createNote';
import { cycleColor, Note } from '../notes/model';
import { NoteStore } from '../notes/store';
import type { CommitResult } from '../ui/inlineEditor';
import { formatNotesCount } from '../ui/format';
import type { UndoController } from './undo';

export interface NoteActionsDeps {
  store: NoteStore;
  editor: {
    commit: () => CommitResult;
    start: (note: Note) => void;
  };
  undo: UndoController;
  clearSearch: () => void;
  onBudgetExceeded: () => void;
}

export interface NoteActionsController {
  addNote: () => void;
  deleteNote: (note: Note) => void;
  clearCompleted: () => void;
  toggleCompleted: (note: Note) => void;
  togglePinned: (note: Note) => void;
  cycleNoteColor: (note: Note) => void;
}

export const createNoteActions = (deps: NoteActionsDeps): NoteActionsController => {
  const { store, editor, undo } = deps;

  const applyChange = (note: Note, changes: Partial<Note>): void => {
    const result = store.updateNote({ ...note, ...changes });
    if (!result.ok && result.reason === 'budget') {
      deps.onBudgetExceeded();
    }
  };

  return {
    addNote: (): void => {
      // Don't replace an open editor with a fresh note before its draft is valid.
      if (editor.commit() === 'invalid') {
        return;
      }

      // A search filter may not match the new note, which would leave the user
      // with no visible editor. Clearing the query guarantees the new note can
      // be seen and edited immediately.
      deps.clearSearch();

      const note = createNote();
      const result = store.addNote(note);
      if (!result.ok) {
        if (result.reason === 'budget') {
          deps.onBudgetExceeded();
        }

        return;
      }

      editor.start(note);
    },

    deleteNote: (note: Note): void => {
      undo.capture([note]);
      const result = store.removeNote(note);
      if (!result.ok) {
        undo.hide();

        return;
      }
      undo.show('Note deleted.');
    },

    clearCompleted: (): void => {
      if (editor.commit() === 'invalid') {
        return;
      }

      const completed = store.getNotes().filter((note) => note.completed);
      if (completed.length === 0) {
        return;
      }
      undo.capture(completed);
      const result = store.clearCompleted();
      if (!result.ok) {
        undo.hide();

        return;
      }
      undo.show(`${formatNotesCount(completed.length)} cleared.`);
    },

    toggleCompleted: (note: Note): void => {
      applyChange(note, { completed: !note.completed });
    },

    togglePinned: (note: Note): void => {
      applyChange(note, { pinned: !note.pinned });
    },

    cycleNoteColor: (note: Note): void => {
      applyChange(note, { color: cycleColor(note.color) });
    },
  };
};
