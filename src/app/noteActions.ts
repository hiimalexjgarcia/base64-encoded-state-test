/**
 * Application-level note actions: add, delete, and clear completed.
 */

import { Note, randomColor } from '../notes/model';
import { NoteStore } from '../notes/store';
import { generateId } from '../persistence/urlCodec';
import type { CommitResult } from '../ui/inlineEditor';
import { formatNotesCount } from '../ui/format';
import type { UndoToastController } from '../ui/undoToast';

export interface NoteActionsDeps {
  store: NoteStore;
  editor: {
    commit: () => CommitResult;
    start: (note: Note) => void;
  };
  undo: UndoToastController;
  clearSearch: () => void;
  onBudgetExceeded: () => void;
}

export interface NoteActionsController {
  addNote: () => void;
  deleteNote: (note: Note) => void;
  clearCompleted: () => void;
}

export const createNoteActions = (deps: NoteActionsDeps): NoteActionsController => {
  const { store, editor, undo } = deps;

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

      const note: Note = {
        id: generateId(),
        title: 'New Note',
        body: '',
        color: randomColor(),
      };
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
      store.removeNote(note);
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
      store.clearCompleted();
      undo.show(`${formatNotesCount(completed.length)} cleared.`);
    },
  };
};
