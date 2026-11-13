/**
 * Undo history for deletions and clear-completed. Captures removed notes and
 * their original positions, restores them on request, and delegates the
 * visible toast to the UI layer.
 */

import { Note } from '../notes/model';
import { NoteStore } from '../notes/store';
import { createUndoToast } from '../ui/undoToast';

interface RemovedNote {
  note: Note;
  index: number;
}

export interface UndoController {
  capture: (notes: Note[]) => void;
  show: (message: string) => void;
  hide: () => void;
  destroy: () => void;
}

export const createUndo = (store: NoteStore): UndoController => {
  let removed: RemovedNote[] = [];

  const restore = (): void => {
    if (removed.length === 0) {
      return;
    }

    const current = store.getNotes();
    [...removed]
      .sort((a, b) => a.index - b.index)
      .forEach(({ note, index }) => {
        current.splice(Math.min(index, current.length), 0, note);
      });
    removed = [];
    store.setNotes(current);
  };

  const toast = createUndoToast({
    onUndo: restore,
    onDismiss: () => {
      removed = [];
    },
  });

  return {
    capture: (notes: Note[]): void => {
      const all = store.getNotes();
      removed = notes
        .map((note) => ({ note, index: all.findIndex((item) => item.id === note.id) }))
        .filter((entry) => entry.index >= 0);
    },

    show: (message: string): void => {
      toast.show(message);
    },

    hide: (): void => {
      removed = [];
      toast.hide();
    },

    destroy: (): void => {
      removed = [];
      toast.destroy();
    },
  };
};
