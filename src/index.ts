import AppState from './state/appState';
import NoteComponent from './components/note';
import { validateNote } from './utils/validation';
import {
  cycleColor,
  formatNotesCount,
  getVisibleNotes,
  randomColor,
} from './utils/view';
import { Note } from './types';
import './index.css';

let editingId: string | null = null;

const syncStateToUrl = (): void => {
  const path = document.location.pathname || '/';
  window.history.replaceState(null, '', path + '#/' + AppState.state.getEncoded());
};

const getNotesContainer = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('#notes');

const getSearchInput = (): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>('#notesInputSearch');

const isShowCompletedChecked = (): boolean =>
  !!(document.getElementById('showCompletedCheckbox') as HTMLInputElement | null)?.checked;

const updateNotesCount = (): void => {
  const countElement = document.getElementById('notesDisplayCount');
  if (countElement) {
    countElement.textContent = formatNotesCount(AppState.notes.getAll().length);
  }
};

const renderVisibleNotes = (): Note[] =>
  getVisibleNotes(AppState.notes.getAll(), {
    query: getSearchInput()?.value ?? '',
    showCompleted: isShowCompletedChecked(),
  });

function createNoteElement(note: Note): HTMLElement {
  return NoteComponent(note, {
    onDelete: () => AppState.notes.remove(note),
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

function renderAllNotes(): void {
  editingId = null;
  renderNotes(renderVisibleNotes());
}

AppState.pubsub.subscribe('appStateChanged', () => {
  syncStateToUrl();
  renderAllNotes();
  updateNotesCount();
});

const setupSearch = (): void => {
  const input = getSearchInput();
  if (!input) {return;}

  const onSearch = (): void => {
    renderAllNotes();
  };

  input.addEventListener('input', onSearch, false);
  input.addEventListener('search', onSearch, false);
};

const startInlineEdit = (note: Note): void => {
  if (editingId) {
    renderAllNotes();
  }

  const container = getNotesContainer();
  if (!container) {return;}

  const noteEl = container.querySelector<HTMLElement>(`.note[data-id="${note.id}"]`);
  if (!noteEl) {return;}

  editingId = note.id;
  noteEl.classList.add('note-editing');

  const titleEl = noteEl.querySelector<HTMLElement>('.note-title');
  const bodyEl = noteEl.querySelector<HTMLElement>('.note-body');
  const actions = noteEl.querySelector<HTMLElement>('.note-actions');

  const handleEditKeys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      renderAllNotes();
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      saveInlineEdit(noteEl, note.id);
    }
  };

  if (titleEl) {
    const input = document.createElement('input');
    input.className = 'note-title-input';
    input.value = note.title;
    input.addEventListener('keydown', handleEditKeys);
    titleEl.replaceWith(input);
    input.focus();
    input.select();
  }

  if (bodyEl) {
    const textarea = document.createElement('textarea');
    textarea.className = 'note-body-input';
    textarea.value = note.body;
    textarea.addEventListener('keydown', handleEditKeys);
    bodyEl.replaceWith(textarea);
  }

  if (actions) {
    actions.innerHTML = '';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = '✓';
    saveBtn.setAttribute('aria-label', 'Save note');
    saveBtn.onclick = (): void => {
      saveInlineEdit(noteEl, note.id);
    };
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '✕';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');
    cancelBtn.onclick = (): void => {
      renderAllNotes();
    };
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
  }
};

const saveInlineEdit = (noteEl: HTMLElement, id: string): void => {
  const titleInput = noteEl.querySelector<HTMLInputElement>('.note-title-input');
  const bodyInput = noteEl.querySelector<HTMLTextAreaElement>('.note-body-input');
  const title = titleInput?.value.trim() || '';
  const body = bodyInput?.value.trim() || '';

  if (!title) {
    renderAllNotes();

    return;
  }

  const existing = AppState.notes.getAll().find((n) => n.id === id);
  AppState.notes.update({
    id,
    title,
    body,
    completed: existing?.completed,
    pinned: existing?.pinned,
    color: existing?.color,
  });
};

const addNote = (): void => {
  const note: Note = {
    id: AppState.generateId(),
    title: 'New Note',
    body: '',
    color: randomColor(),
  };
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
  const checkbox = document.getElementById('showCompletedCheckbox');
  if (!checkbox) {return;}
  checkbox.addEventListener('change', () => {
    renderAllNotes();
  });
};

const setupCopyLink = (): void => {
  const btn = document.getElementById('copyLinkBtn') as HTMLButtonElement | null;
  if (!btn) {return;}
  btn.addEventListener('click', async () => {
    const url = window.location.href;
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
  btn.addEventListener('click', () => {
    const completedCount = AppState.notes.getAll().filter((n) => n.completed).length;
    if (completedCount === 0) {return;}
    // eslint-disable-next-line no-alert
    if (window.confirm(`Clear ${completedCount} completed note${completedCount !== 1 ? 's' : ''}?`)) {
      AppState.notes.clearCompleted();
    }
  });
};

const initializeState = (): void => {
  try {
    const hash = window.location.hash.substring(2);
    if (hash) {
      AppState.state.setEncoded(hash);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error initializing state:', e);
    AppState.state.setEncoded(AppState.state.getEncoded());
  }
};

const initializeApp = (): void => {
  initializeState();
  setupSearch();
  setupAddButton();
  setupCopyLink();
  setupClearCompleted();
  setupShowCompleted();
  setupKeyboardShortcuts();
  window.addEventListener('hashchange', () => {
    initializeState();
  }, false);
  renderAllNotes();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
