/**
 * Board renderer: visible-note pipeline, note cards, empty states, and count.
 */

import { Note, validateNote } from '../notes/model';
import { NoteStore } from '../notes/store';
import { createVisibleNotesSelector } from '../notes/selectors';
import { findNoteElement, getNotesContainer, getSearchInput, isShowCompletedChecked } from './dom';
import { formatNotesCount } from './format';
import { createNoteCard } from './noteCard';
import type { EditDraft } from './inlineEditor';

export interface BoardDeps {
  store: NoteStore;
  getDraft: () => EditDraft | null;
  endDraft: () => void;
  mountDraft: (noteEl: HTMLElement, draft: EditDraft, restoreFocus: boolean) => void;
  onDelete: (note: Note) => void;
  onEdit: (note: Note) => void;
  onToggleCompleted: (note: Note) => void;
  onTogglePinned: (note: Note) => void;
  onCycleColor: (note: Note) => void;
}

export interface BoardController {
  render: (options?: { preserveEdit?: boolean }) => void;
}

const getEmptyStateMessage = (total: number, query: string): string => {
  if (total === 0) {
    return 'No notes yet — click “Add Note” to create one.';
  }
  if (query) {
    return `No notes match “${query}”.`;
  }

  return 'All notes are completed — toggle “Show completed” to view them.';
};

export const createBoard = (deps: BoardDeps): BoardController => {
  const { store } = deps;
  const selectVisibleNotes = createVisibleNotesSelector();

  const updateNotesCount = (visibleCount: number): void => {
    const countElement = document.getElementById('notesDisplayCount');
    if (countElement) {
      countElement.textContent = formatNotesCount(visibleCount, store.getNotes().length);
    }
  };

  const createNoteElement = (note: Note): HTMLElement => createNoteCard(note, {
    onDelete: () => deps.onDelete(note),
    onEdit: () => deps.onEdit(note),
    onToggleComplete: () => deps.onToggleCompleted(note),
    onPin: () => deps.onTogglePinned(note),
    onCycleColor: () => deps.onCycleColor(note),
  });

  const renderNotes = (notes: Note[], total: number, query: string): void => {
    const container = getNotesContainer();
    if (!container) {return;}
    container.innerHTML = '';
    if (notes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'notes-empty';
      empty.textContent = getEmptyStateMessage(total, query);
      container.appendChild(empty);

      return;
    }
    notes.forEach((note) => {
      if (validateNote(note)) {
        container.appendChild(createNoteElement(note));
      }
    });
  };

  return {
    render: ({ preserveEdit = true } = {}): void => {
      const draft = preserveEdit ? deps.getDraft() : null;
      const query = getSearchInput()?.value ?? '';
      const notes = store.getNotes();
      const visibleNotes = selectVisibleNotes(notes, {
        query,
        showCompleted: isShowCompletedChecked(),
        revision: store.getRevision(),
      });

      renderNotes(visibleNotes, notes.length, query.trim());
      updateNotesCount(visibleNotes.length);

      if (!draft) {
        return;
      }

      const container = getNotesContainer();
      const noteEl = container ? findNoteElement(container, draft.id) : null;
      if (!noteEl) {
        // The edited note is gone (filtered out, deleted, or replaced by a
        // different URL state), so there is nothing left to edit.
        deps.endDraft();

        return;
      }

      deps.mountDraft(noteEl, draft, true);
    },
  };
};
