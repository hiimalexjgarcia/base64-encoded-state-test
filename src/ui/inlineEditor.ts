/**
 * Inline note editor. One note is edited at a time, and the active draft is
 * kept outside the DOM so a background re-render cannot discard typed text.
 */

import { Note, NOTE_VALIDATION, validateNote } from '../notes/model';
import { NoteStore } from '../notes/store';
import { findNoteElement, focusNoteControl, getNotesContainer } from './dom';

export interface EditDraft {
  id: string;
  title: string;
  body: string;
  focusField: 'title' | 'body';
  selectionStart: number | null;
  selectionEnd: number | null;
}

export type CommitResult = 'none' | 'saved' | 'invalid';

export type RenderBoard = (options?: { preserveEdit?: boolean }) => void;

export interface InlineEditorDeps {
  store: NoteStore;
  render: RenderBoard;
}

export interface InlineEditorController {
  getDraft: () => EditDraft | null;
  start: (note: Note) => void;
  commit: () => CommitResult;
  end: () => void;
  mount: (noteEl: HTMLElement, draft: EditDraft, restoreFocus: boolean) => void;
  hasUnsavedDraft: () => boolean;
}

const EDIT_ERROR_CLASS = 'note-edit-error';
const EDIT_INPUTS = '.note-title-input, .note-body-input';

const clearEditError = (noteEl: HTMLElement): void => {
  noteEl.querySelector(`.${EDIT_ERROR_CLASS}`)?.remove();
  noteEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(EDIT_INPUTS).forEach((input) => {
    input.removeAttribute('aria-invalid');
  });
};

const showEditError = (noteEl: HTMLElement, message: string): void => {
  clearEditError(noteEl);
  const error = document.createElement('p');
  error.className = EDIT_ERROR_CLASS;
  error.setAttribute('role', 'alert');
  error.textContent = message;
  noteEl.appendChild(error);
  noteEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(EDIT_INPUTS).forEach((input) => {
    input.setAttribute('aria-invalid', 'true');
  });
};

export const createInlineEditor = (deps: InlineEditorDeps): InlineEditorController => {
  const { store } = deps;
  let editDraft: EditDraft | null = null;

  const end = (): void => {
    editDraft = null;
  };

  const mount = (noteEl: HTMLElement, draft: EditDraft, restoreFocus: boolean): void => {
    editDraft = draft;
    noteEl.classList.add('note-editing');

    const titleEl = noteEl.querySelector<HTMLElement>('.note-title');
    const bodyEl = noteEl.querySelector<HTMLElement>('.note-body');
    const actions = noteEl.querySelector<HTMLElement>('.note-actions');

    const handleEditKeys = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        end();
        deps.render({ preserveEdit: false });
        focusNoteControl(draft.id);
      } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        saveInlineEdit(noteEl, draft.id);
      }
    };

    // Listen on the whole card so Escape also works when focus is on the
    // Save/Cancel buttons, not just inside the text inputs.
    noteEl.addEventListener('keydown', handleEditKeys);

    // Keep the draft and caret position in sync so a re-render can rebuild
    // this editor without losing what the user has typed.
    const trackDraft = (
      field: 'title' | 'body',
      input: HTMLInputElement | HTMLTextAreaElement,
    ): void => {
      const sync = (): void => {
        if (editDraft?.id !== draft.id) {return;}
        draft[field] = input.value;
        draft.focusField = field;
        draft.selectionStart = input.selectionStart;
        draft.selectionEnd = input.selectionEnd;
      };

      input.addEventListener('input', () => {
        clearEditError(noteEl);
        sync();
      });
      input.addEventListener('focus', sync);
      input.addEventListener('click', sync);
      input.addEventListener('keyup', sync);
    };

    let titleInput: HTMLInputElement | null = null;
    if (titleEl) {
      titleInput = document.createElement('input');
      titleInput.className = 'note-title-input';
      titleInput.value = draft.title;
      titleInput.maxLength = NOTE_VALIDATION.TITLE_MAX_LENGTH;
      titleInput.setAttribute('aria-label', 'Note title');
      trackDraft('title', titleInput);
      titleEl.replaceWith(titleInput);
    }

    let bodyInput: HTMLTextAreaElement | null = null;
    if (bodyEl) {
      bodyInput = document.createElement('textarea');
      bodyInput.className = 'note-body-input';
      bodyInput.value = draft.body;
      bodyInput.maxLength = NOTE_VALIDATION.BODY_MAX_LENGTH;
      bodyInput.setAttribute('aria-label', 'Note body');
      trackDraft('body', bodyInput);
      bodyEl.replaceWith(bodyInput);
    }

    if (actions) {
      actions.innerHTML = '';
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.textContent = '✓';
      saveBtn.setAttribute('aria-label', 'Save note');
      saveBtn.onclick = (): void => {
        saveInlineEdit(noteEl, draft.id);
      };
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = '✕';
      cancelBtn.setAttribute('aria-label', 'Cancel edit');
      cancelBtn.onclick = (): void => {
        end();
        deps.render({ preserveEdit: false });
        focusNoteControl(draft.id);
      };
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
    }

    if (!restoreFocus) {
      return;
    }

    const target = draft.focusField === 'body' ? bodyInput : titleInput;
    if (!target) {
      return;
    }
    target.focus();
    if (draft.selectionStart !== null && draft.selectionEnd !== null) {
      target.setSelectionRange(draft.selectionStart, draft.selectionEnd);
    } else if (target === titleInput) {
      target.select();
    }
  };

  const saveInlineEdit = (noteEl: HTMLElement, id: string): boolean => {
    const titleInput = noteEl.querySelector<HTMLInputElement>('.note-title-input');
    const bodyInput = noteEl.querySelector<HTMLTextAreaElement>('.note-body-input');
    const title = titleInput?.value.trim() || '';
    const body = bodyInput?.value.trim() || '';

    if (!title) {
      showEditError(noteEl, 'A note needs a title.');
      titleInput?.focus();

      return false;
    }

    const existing = store.getNotes().find((note) => note.id === id);
    const updated: Note = {
      id,
      title,
      body,
      completed: existing?.completed,
      pinned: existing?.pinned,
      color: existing?.color,
    };

    if (!validateNote(updated)) {
      showEditError(
        noteEl,
        `Title must be 1–${NOTE_VALIDATION.TITLE_MAX_LENGTH} characters and ` +
        `body up to ${NOTE_VALIDATION.BODY_MAX_LENGTH}.`,
      );
      titleInput?.focus();

      return false;
    }

    // Clear the draft before committing: the store publishes synchronously,
    // and the board must not re-mount the editor for the state it is about to
    // replace. A failed commit restores the draft below so the editor (and
    // its error) stays on screen.
    const draft = editDraft;
    end();
    const result = store.updateNote(updated);
    if (!result.ok) {
      editDraft = draft;
      showEditError(
        noteEl,
        result.reason === 'budget'
          ? 'This edit would make the board too large to fit in a shareable link. ' +
            'Shorten the note or remove another note first.'
          : 'This note could not be saved. Check its title and body length.',
      );
      titleInput?.focus();

      return false;
    }

    focusNoteControl(id);

    return true;
  };

  const commit = (): CommitResult => {
    if (!editDraft) {
      return 'none';
    }

    const container = getNotesContainer();
    const noteEl = container ? findNoteElement(container, editDraft.id) : null;
    const titleInput = noteEl?.querySelector<HTMLInputElement>('.note-title-input');
    if (!noteEl || !titleInput) {
      end();

      return 'none';
    }

    return saveInlineEdit(noteEl, editDraft.id) ? 'saved' : 'invalid';
  };

  return {
    getDraft: (): EditDraft | null => editDraft,

    start: (note: Note): void => {
      if (editDraft) {
        if (editDraft.id === note.id) {
          return;
        }
        // Switching notes commits the current draft; an invalid draft keeps
        // the existing editor on screen instead of dropping it silently.
        if (commit() === 'invalid') {
          return;
        }
      }

      const container = getNotesContainer();
      if (!container) {return;}

      const noteEl = findNoteElement(container, note.id);
      if (!noteEl) {return;}

      mount(noteEl, {
        id: note.id,
        title: note.title,
        body: note.body,
        focusField: 'title',
        selectionStart: null,
        selectionEnd: null,
      }, true);
    },

    commit,

    end,

    mount,

    hasUnsavedDraft: (): boolean => {
      const draft = editDraft;
      if (!draft) {
        return false;
      }

      const saved = store.getNotes().find((note) => note.id === draft.id);
      if (!saved) {
        return true;
      }

      return draft.title !== saved.title || draft.body !== saved.body;
    },
  };
};
