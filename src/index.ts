import AppState from './state/appState';
import NoteComponent from './components/note';
import { validateNote } from './utils/validation';
import {
  cycleColor,
  formatNotesCount,
  getVisibleNotes,
  randomColor,
} from './utils/view';
import { Note, NOTE_VALIDATION } from './types';
import {
  decodeStateDetailed,
  isStateWithinBudget,
  DecodeFailureReason,
} from './utils/urlState';
import './index.css';

interface EditDraft {
  id: string;
  title: string;
  body: string;
  focusField: 'title' | 'body';
  selectionStart: number | null;
  selectionEnd: number | null;
}

// The active inline editor. Kept as a draft so a background re-render can
// rebuild the board without discarding unsaved text.
let editDraft: EditDraft | null = null;

// True while an invalid incoming link is being handled. The state must reset
// to an empty board without rewriting the address bar, so the user's original
// (possibly recoverable) link is preserved.
let suppressUrlSync = false;
let decodeFailure: DecodeFailureReason | null = null;

// Shareable-link warning threshold in characters. Browsers cap URLs
// (Safari ~80k), and long links break in chat apps and email clients.
const URL_LENGTH_WARN_THRESHOLD = 16_000;

const URL_WARNING_ID = 'urlWarning';

type UrlWarningKind = 'length' | 'replace' | 'budget' | null;
let urlWarningKind: UrlWarningKind = null;

const SHARE_URL_TOO_LARGE_MESSAGE =
  'This board is too large to fit in a shareable link. Remove some notes or ' +
  'shorten their text before adding more.';

const showUrlWarning = (message: string): void => {
  let warning = document.getElementById(URL_WARNING_ID);
  if (!warning) {
    warning = document.createElement('div');
    warning.id = URL_WARNING_ID;
    warning.className = 'url-warning';
    warning.setAttribute('role', 'status');
    warning.setAttribute('aria-live', 'polite');
    document.body.appendChild(warning);
  }
  if (warning.textContent !== message) {
    warning.textContent = message;
  }
};

const clearUrlWarning = (): void => {
  document.getElementById(URL_WARNING_ID)?.remove();
  urlWarningKind = null;
};

const showBudgetWarning = (): void => {
  if (urlWarningKind !== 'budget') {
    urlWarningKind = 'budget';
    showUrlWarning(SHARE_URL_TOO_LARGE_MESSAGE);
  }
};

const DECODE_WARNING_ID = 'decodeWarning';

const DECODE_FAILURE_MESSAGES: Record<DecodeFailureReason, string> = {
  'too-long':
    'This link is too long to open safely. It may have been truncated when ' +
    'it was shared.',
  'invalid-encoding':
    'This link’s note data is not valid base64url, so it cannot be read.',
  'invalid-json':
    'This link’s note data is corrupt or truncated, so it cannot be read.',
  'invalid-shape':
    'This link does not contain recognisable note data.',
  'unsupported-version':
    'This link was created by a newer version of the app and cannot be ' +
    'opened here.',
};

const showDecodeWarning = (reason: DecodeFailureReason): void => {
  let warning = document.getElementById(DECODE_WARNING_ID);
  if (!warning) {
    warning = document.createElement('div');
    warning.id = DECODE_WARNING_ID;
    warning.className = 'url-warning decode-warning';
    warning.setAttribute('role', 'alert');
    document.body.appendChild(warning);
  }

  warning.innerHTML = '';
  const text = document.createElement('span');
  text.textContent =
    `${DECODE_FAILURE_MESSAGES[reason]} The original link is unchanged — ` +
    'your notes were not deleted.';
  const startEmpty = document.createElement('button');
  startEmpty.type = 'button';
  startEmpty.textContent = 'Start empty';
  startEmpty.addEventListener('click', startEmptyBoard);
  warning.appendChild(text);
  warning.appendChild(startEmpty);
};

const clearDecodeWarning = (): void => {
  document.getElementById(DECODE_WARNING_ID)?.remove();
};

/**
 * The canonical share URL is always rebuilt from the current state rather
 * than read back from window.location.href. The address bar may be stale
 * when history.replaceState failed, and the copied link must still contain
 * the notes the user can see.
 */
const buildCanonicalUrl = (encoded: string = AppState.state.getEncoded()): string => {
  const path = document.location.pathname || '/';
  // Preserve query parameters (e.g. analytics or campaign tags).
  const search = document.location.search || '';

  return `${window.location.origin}${path}${search}#/${encoded}`;
};

const syncStateToUrl = (): void => {
  const state = AppState.state.get();
  const encoded = AppState.state.getEncoded();
  if (state.notes.length > 0 && !encoded) {
    // AppState enforces the budget, but never write an empty hash over a
    // board that still has notes if encoding somehow fails.
    showBudgetWarning();

    return;
  }

  const url = buildCanonicalUrl(encoded);

  try {
    window.history.replaceState(null, '', url);
  } catch {
    // Some browsers reject very long or otherwise invalid history URLs.
    // Keep the notes in memory and tell the user the link is stale.
    if (urlWarningKind !== 'replace') {
      urlWarningKind = 'replace';
      showUrlWarning(
        'The address bar could not be updated, so this link may be out of ' +
        'date. Your notes are still in this tab — remove some notes to ' +
        'create a shareable link.',
      );
    }

    return;
  }

  if (url.length > URL_LENGTH_WARN_THRESHOLD) {
    if (urlWarningKind !== 'length') {
      urlWarningKind = 'length';
      showUrlWarning(
        `This share link is ${url.length.toLocaleString()} characters and may ` +
        'be truncated by browsers, chat apps, or email clients. Remove some ' +
        'notes to shorten it.',
      );
    }
  } else if (urlWarningKind) {
    clearUrlWarning();
  }
};

const getNotesContainer = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('#notes');

const getSearchInput = (): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>('#notesInputSearch');

const isShowCompletedChecked = (): boolean =>
  !!(document.getElementById('showCompletedCheckbox') as HTMLInputElement | null)?.checked;

const updateNotesCount = (visibleCount: number): void => {
  const countElement = document.getElementById('notesDisplayCount');
  if (countElement) {
    countElement.textContent = formatNotesCount(
      visibleCount,
      AppState.notes.getAll().length,
    );
  }
};

const renderVisibleNotes = (): Note[] =>
  getVisibleNotes(AppState.notes.getAll(), {
    query: getSearchInput()?.value ?? '',
    showCompleted: isShowCompletedChecked(),
    revision: AppState.state.getRevision(),
  });

/**
 * Finds a rendered note by ID without interpolating the ID into a CSS
 * selector. Note IDs come from shared links (URL state), so a crafted ID
 * such as `a"]` must not be able to break querySelector.
 */
const findNoteElement = (container: HTMLElement, id: string): HTMLElement | null => {
  const notes = container.querySelectorAll<HTMLElement>('.note');
  for (const el of notes) {
    if (el.dataset.id === id) {
      return el;
    }
  }

  return null;
};

/**
 * Returns focus to a note's Edit button after its editor closes, falling
 * back to Add Note when the note is no longer on screen (for example when
 * it was filtered out or deleted).
 */
const focusNoteControl = (id: string): void => {
  const container = getNotesContainer();
  const noteEl = container ? findNoteElement(container, id) : null;
  const editButton = noteEl?.querySelector<HTMLButtonElement>('.note-edit');

  if (editButton) {
    editButton.focus();

    return;
  }

  document.getElementById('addNoteBtn')?.focus();
};

interface UndoEntry {
  removed: Array<{ note: Note; index: number }>;
}

const UNDO_TOAST_MS = 6000;

let undoEntry: UndoEntry | null = null;
let undoToastTimer: number | null = null;
let undoToastDeadline = 0;
let undoToastRemaining = UNDO_TOAST_MS;
let undoToastHovered = false;
let undoToastFocused = false;

const clearUndoToastTimer = (): void => {
  if (undoToastTimer !== null) {
    window.clearTimeout(undoToastTimer);
    undoToastTimer = null;
  }
};

const pauseUndoToastTimer = (): void => {
  if (undoToastTimer === null) {
    return;
  }
  clearUndoToastTimer();
  undoToastRemaining = Math.max(0, undoToastDeadline - Date.now());
};

const resumeUndoToastTimer = (): void => {
  if (undoToastHovered || undoToastFocused) {
    return;
  }
  clearUndoToastTimer();
  undoToastDeadline = Date.now() + undoToastRemaining;
  undoToastTimer = window.setTimeout(hideUndoToast, undoToastRemaining);
};

const getUndoToast = (): HTMLElement => {
  let toast = document.querySelector<HTMLElement>('#undoToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'undoToast';
    toast.className = 'undo-toast';
    // A live region containing an interactive control is awkward for screen
    // readers, so the toast is a labelled region and only its text is live.
    toast.setAttribute('role', 'region');
    toast.setAttribute('aria-label', 'Undo notification');
    // WCAG 2.2.1: don't dismiss while the user is reading or about to undo.
    toast.addEventListener('mouseenter', () => {
      undoToastHovered = true;
      pauseUndoToastTimer();
    });
    toast.addEventListener('mouseleave', () => {
      undoToastHovered = false;
      resumeUndoToastTimer();
    });
    toast.addEventListener('focusin', () => {
      undoToastFocused = true;
      pauseUndoToastTimer();
    });
    toast.addEventListener('focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (!next || !toast?.contains(next)) {
        undoToastFocused = false;
        resumeUndoToastTimer();
      }
    });
    toast.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        hideUndoToast();
      }
    });
    document.body.appendChild(toast);
  }

  return toast;
};

const hideUndoToast = (): void => {
  const toast = document.querySelector<HTMLElement>('#undoToast');
  if (toast?.contains(document.activeElement)) {
    document.getElementById('addNoteBtn')?.focus();
  }
  toast?.remove();
  clearUndoToastTimer();
  undoToastHovered = false;
  undoToastFocused = false;
  undoToastRemaining = UNDO_TOAST_MS;
  // Once the toast is gone there is no control left to invoke the undo.
  undoEntry = null;
};

const undoRemoval = (): void => {
  if (!undoEntry) {
    return;
  }

  const current = AppState.notes.getAll();
  const ordered = [...undoEntry.removed].sort((a, b) => a.index - b.index);
  for (const { note, index } of ordered) {
    current.splice(Math.min(index, current.length), 0, note);
  }
  undoEntry = null;
  hideUndoToast();
  AppState.notes.setAll(current);
};

const showUndoToast = (message: string): void => {
  const toast = getUndoToast();
  toast.innerHTML = '';

  undoToastHovered = false;
  undoToastFocused = false;
  undoToastRemaining = UNDO_TOAST_MS;

  const text = document.createElement('span');
  text.setAttribute('role', 'status');
  text.setAttribute('aria-live', 'polite');
  text.setAttribute('aria-atomic', 'true');
  text.textContent = message;

  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'btn btn-primary';
  undoBtn.textContent = 'Undo';
  undoBtn.addEventListener('click', undoRemoval);

  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.className = 'undo-toast-dismiss';
  dismissBtn.setAttribute('aria-label', 'Dismiss notification');
  dismissBtn.textContent = '×';
  dismissBtn.addEventListener('click', hideUndoToast);

  toast.appendChild(text);
  toast.appendChild(undoBtn);
  toast.appendChild(dismissBtn);

  clearUndoToastTimer();
  undoToastDeadline = Date.now() + UNDO_TOAST_MS;
  undoToastTimer = window.setTimeout(hideUndoToast, UNDO_TOAST_MS);

  // The button receives focus for keyboard users, which pauses the timer
  // until they move on (the focusin listener also covers later refocuses).
  undoBtn.focus();
  pauseUndoToastTimer();
};

const captureUndo = (notes: Note[]): void => {
  const all = AppState.notes.getAll();
  undoEntry = {
    removed: notes
      .map((note) => ({ note, index: all.findIndex((n) => n.id === note.id) }))
      .filter((entry) => entry.index >= 0),
  };
};

const deleteNote = (note: Note): void => {
  captureUndo([note]);
  AppState.notes.remove(note);
  showUndoToast('Note deleted.');
};

const clearCompletedNotes = (): void => {
  if (commitActiveEdit() === 'invalid') {
    return;
  }

  const completed = AppState.notes.getAll().filter((n) => n.completed);
  if (completed.length === 0) {
    return;
  }
  captureUndo(completed);
  AppState.notes.clearCompleted();
  showUndoToast(
    `${formatNotesCount(completed.length)} cleared.`,
  );
};


function createNoteElement(note: Note): HTMLElement {
  return NoteComponent(note, {
    onDelete: () => deleteNote(note),
    onEdit: () => startInlineEdit(note),
    onToggleComplete: () => AppState.notes.update({ ...note, completed: !note.completed }),
    onPin: () => AppState.notes.update({ ...note, pinned: !note.pinned }),
    onCycleColor: () => {
      AppState.notes.update({ ...note, color: cycleColor(note.color) });
    },
  });
}

const getEmptyStateMessage = (): string => {
  const query = (getSearchInput()?.value ?? '').trim();
  const total = AppState.notes.getAll().length;

  if (total === 0) {
    return 'No notes yet — click “Add Note” to create one.';
  }
  if (query) {
    return `No notes match “${query}”.`;
  }

  return 'All notes are completed — toggle “Show completed” to view them.';
};

function renderNotes(notes: Note[]): void {
  const container = getNotesContainer();
  if (!container) {return;}
  container.innerHTML = '';
  if (notes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'notes-empty';
    empty.textContent = getEmptyStateMessage();
    container.appendChild(empty);

    return;
  }
  notes.forEach((note) => {
    if (validateNote(note)) {
      container.appendChild(createNoteElement(note));
    }
  });
}

interface RenderOptions {
  /** Re-open the active editor after rebuilding the board. */
  preserveEdit?: boolean;
}

const endEdit = (): void => {
  editDraft = null;
};

function renderAllNotes({ preserveEdit = true }: RenderOptions = {}): void {
  const draft = preserveEdit ? editDraft : null;
  const visibleNotes = renderVisibleNotes();
  renderNotes(visibleNotes);
  updateNotesCount(visibleNotes.length);

  if (!draft) {
    return;
  }

  const container = getNotesContainer();
  const noteEl = container ? findNoteElement(container, draft.id) : null;
  if (!noteEl) {
    // The edited note is gone (filtered out, deleted, or replaced by a
    // different URL state), so there is nothing left to edit.
    endEdit();

    return;
  }

  mountInlineEditor(noteEl, draft, true);
}

AppState.pubsub.subscribe('appStateChanged', () => {
  if (suppressUrlSync) {
    // An unreadable incoming link is being replaced with an empty board.
    // Render it without rewriting the address bar so the original hash stays
    // available for the user to inspect or recover.
    renderAllNotes();

    return;
  }

  // Once the user changes state, the preserved invalid link is no longer the
  // source of truth and its warning has served its purpose.
  if (decodeFailure) {
    decodeFailure = null;
    clearDecodeWarning();
  }

  syncStateToUrl();
  renderAllNotes();
});

// Wait for typing to settle before running the fuzzy-search pipeline.
// Re-rendering the whole board on every keystroke gets sluggish once a
// shared link carries hundreds of notes.
const SEARCH_DEBOUNCE_MS = 100;

const setupSearch = (): void => {
  const input = getSearchInput();
  if (!input) {return;}

  let timer: number | null = null;
  const scheduleRender = (): void => {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      timer = null;
      renderAllNotes();
    }, SEARCH_DEBOUNCE_MS);
  };

  const onSearchChange = (): void => {
    // Commit an open editor before filtering so typing in the search box
    // cannot silently throw away an in-progress edit. Invalid drafts keep
    // the editor (and its error) on screen instead.
    if (commitActiveEdit() === 'invalid') {
      return;
    }
    scheduleRender();
  };

  input.addEventListener('input', onSearchChange, false);
  input.addEventListener('search', onSearchChange, false);
};

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

const mountInlineEditor = (noteEl: HTMLElement, draft: EditDraft, restoreFocus: boolean): void => {
  editDraft = draft;
  noteEl.classList.add('note-editing');

  const titleEl = noteEl.querySelector<HTMLElement>('.note-title');
  const bodyEl = noteEl.querySelector<HTMLElement>('.note-body');
  const actions = noteEl.querySelector<HTMLElement>('.note-actions');

  const handleEditKeys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      endEdit();
      renderAllNotes({ preserveEdit: false });
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
      endEdit();
      renderAllNotes({ preserveEdit: false });
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

const startInlineEdit = (note: Note): void => {
  if (editDraft) {
    if (editDraft.id === note.id) {
      return;
    }
    // Switching notes commits the current draft; an invalid draft keeps
    // the existing editor on screen instead of dropping it silently.
    if (commitActiveEdit() === 'invalid') {
      return;
    }
  }

  const container = getNotesContainer();
  if (!container) {return;}

  const noteEl = findNoteElement(container, note.id);
  if (!noteEl) {return;}

  mountInlineEditor(noteEl, {
    id: note.id,
    title: note.title,
    body: note.body,
    focusField: 'title',
    selectionStart: null,
    selectionEnd: null,
  }, true);
};

type CommitResult = 'none' | 'saved' | 'invalid';

const commitActiveEdit = (): CommitResult => {
  if (!editDraft) {
    return 'none';
  }

  const container = getNotesContainer();
  const noteEl = container ? findNoteElement(container, editDraft.id) : null;
  const titleInput = noteEl?.querySelector<HTMLInputElement>('.note-title-input');
  if (!noteEl || !titleInput) {
    endEdit();

    return 'none';
  }

  return saveInlineEdit(noteEl, editDraft.id) ? 'saved' : 'invalid';
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

  const existing = AppState.notes.getAll().find((n) => n.id === id);
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

  const nextNotes = AppState.notes.getAll().map((note) => {
    return note.id === id ? updated : note;
  });
  if (!isStateWithinBudget({ notes: nextNotes })) {
    showEditError(
      noteEl,
      'This edit would make the board too large to fit in a shareable link. ' +
      'Shorten the note or remove another note first.',
    );
    titleInput?.focus();

    return false;
  }

  endEdit();
  AppState.notes.update(updated);
  focusNoteControl(id);

  return true;
};

const addNote = (): void => {
  // Don't replace an open editor with a fresh note before its draft is valid.
  if (commitActiveEdit() === 'invalid') {
    return;
  }

  // A search filter may not match the new note, which would leave the user
  // with no visible editor. Clearing the query guarantees the new note can
  // be seen and edited immediately.
  const search = getSearchInput();
  if (search?.value) {
    search.value = '';
  }

  const note: Note = {
    id: AppState.generateId(),
    title: 'New Note',
    body: '',
    color: randomColor(),
  };
  if (!isStateWithinBudget({ notes: [...AppState.notes.getAll(), note] })) {
    showBudgetWarning();

    return;
  }
  AppState.notes.add(note);
  startInlineEdit(note);
};

const setupAddButton = (): void => {
  const addBtn = document.getElementById('addNoteBtn');
  if (!addBtn) {return;}

  addBtn.addEventListener('click', addNote);
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {return false;}

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
};

const setupKeyboardShortcuts = (): void => {
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {return;}
    if (isTypingTarget(event.target)) {return;}

    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      addNote();
    } else if (event.key === '/') {
      event.preventDefault();
      getSearchInput()?.focus();
    }
  });
};

const setupShowCompleted = (): void => {
  const checkbox = document.getElementById('showCompletedCheckbox') as HTMLInputElement | null;
  if (!checkbox) {return;}
  checkbox.addEventListener('change', () => {
    // Commit the draft first; undo the toggle if it can't be saved.
    if (commitActiveEdit() === 'invalid') {
      checkbox.checked = !checkbox.checked;

      return;
    }
    renderAllNotes();
  });
};

const setupCopyLink = (): void => {
  const btn = document.getElementById('copyLinkBtn') as HTMLButtonElement | null;
  if (!btn) {return;}
  btn.addEventListener('click', async () => {
    // A copy action must not capture the previous saved state. Commit the
    // open draft first; an invalid draft keeps the editor and its error.
    if (commitActiveEdit() === 'invalid') {
      return;
    }

    // Rebuild the URL from state instead of reading location.href: the
    // address bar can be stale when replaceState failed, and copying it would
    // silently share an older board.
    const url = buildCanonicalUrl();
    try {
      await navigator.clipboard.writeText(url);
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = original;
      }, 1500);
    } catch {
      // eslint-disable-next-line no-alert
      window.prompt('Copy this link:', url);
    }
  });
};

const setupClearCompleted = (): void => {
  const btn = document.getElementById('clearCompletedBtn');
  if (!btn) {return;}
  // Undo already covers accidental clears, so a confirm dialog would only
  // add friction on top of the recovery path.
  btn.addEventListener('click', clearCompletedNotes);
};

/**
 * Reads the encoded state from the hash. Accepts both `#/<state>` (the
 * canonical format this app writes) and `#<state>`, rather than assuming
 * the two-character prefix and chopping data off a hand-edited URL.
 */
const readHash = (): string => window.location.hash.replace(/^#\/?/, '');

const initializeState = (hash: string): void => {
  if (!hash) {
    decodeFailure = null;
    clearDecodeWarning();

    return;
  }

  const result = decodeStateDetailed(hash);
  if (result.error) {
    // Keep the incoming hash exactly as it is. Decoding the failure reason
    // lets the warning explain what went wrong, and the explicit "Start
    // empty" action is the only thing that replaces the broken link.
    decodeFailure = result.error;
    suppressUrlSync = true;
    try {
      AppState.state.setEncoded('');
    } finally {
      suppressUrlSync = false;
    }
    showDecodeWarning(result.error);

    return;
  }

  decodeFailure = null;
  clearDecodeWarning();
  AppState.state.setEncoded(hash);
};

function startEmptyBoard(): void {
  decodeFailure = null;
  clearDecodeWarning();
  endEdit();
  hideUndoToast();
  // Publishing an empty state also syncs the canonical `#/` URL because the
  // decode-warning suppression has already been lifted.
  AppState.state.setEncoded('');
}

const handleHashChange = (): void => {
  // Incoming URL state replaces the board wholesale, so an in-progress
  // edit no longer has a note to attach to, and an undo entry belongs to
  // the previous board.
  endEdit();
  hideUndoToast();
  const hash = readHash();
  if (hash) {
    initializeState(hash);
  } else {
    // Clearing the hash drops the shared state instead of keeping the
    // previous board around under a URL that claims to be empty.
    decodeFailure = null;
    clearDecodeWarning();
    AppState.state.setEncoded('');
  }
};

const hasUnsavedDraft = (): boolean => {
  const draft = editDraft;
  if (!draft) {
    return false;
  }

  const saved = AppState.notes.getAll().find((note) => note.id === draft.id);
  if (!saved) {
    return true;
  }

  return draft.title !== saved.title || draft.body !== saved.body;
};

interface DraftGuardWindow extends Window {
  stickyNotesDraftGuardInstalled?: boolean;
  stickyNotesHasUnsavedDraft?: () => boolean;
}

const setupUnloadGuard = (): void => {
  const guardWindow = window as DraftGuardWindow;
  // The guard reads the latest app instance through a window property. That
  // keeps a single listener installed across hot reloads and test module
  // resets instead of piling up stale closures.
  guardWindow.stickyNotesHasUnsavedDraft = hasUnsavedDraft;
  if (guardWindow.stickyNotesDraftGuardInstalled) {
    return;
  }
  guardWindow.stickyNotesDraftGuardInstalled = true;

  window.addEventListener('beforeunload', (event) => {
    if (!guardWindow.stickyNotesHasUnsavedDraft?.()) {
      return;
    }
    event.preventDefault();
    // Browsers require a truthy/empty returnValue assignment to show the
    // native "leave site?" confirmation.
    event.returnValue = '';
  });
};

const initializeApp = (): void => {
  initializeState(readHash());
  setupSearch();
  setupAddButton();
  setupCopyLink();
  setupClearCompleted();
  setupShowCompleted();
  setupKeyboardShortcuts();
  setupUnloadGuard();
  window.addEventListener('hashchange', handleHashChange, false);
  renderAllNotes();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
