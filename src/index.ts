/* eslint-env browser */

import AppState from './state/appState';
import NoteComponent from './components/note';
import { validateNote } from './utils/validation';
import { Note, NOTE_COLORS, NoteColor } from './types';
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

const formatNotesCount = (count: number): string =>
  `${count} note${count !== 1 ? 's' : ''}`;

const updateNotesCount = (): void => {
  const countElement = document.getElementById('notesDisplayCount');
  if (countElement) {
    countElement.textContent = formatNotesCount(AppState.notes.getAll().length);
  }
};

const sortPinnedFirst = (notes: Note[]): Note[] =>
  [...notes].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

const filterByCompletion = (notes: Note[], showCompleted = isShowCompletedChecked()): Note[] =>
  showCompleted ? notes : notes.filter((n) => !n.completed);

const getSearchResults = (query: string): Note[] => {
  const trimmed = query.trim();
  return trimmed ? AppState.notes.search(trimmed).map((r) => r.item) : AppState.notes.getAll();
};

const getVisibleNotes = (query = getSearchInput()?.value ?? ''): Note[] =>
  sortPinnedFirst(filterByCompletion(getSearchResults(query)));

const randomColor = (): NoteColor =>
  NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];

const cycleColor = (color?: NoteColor): NoteColor => {
  if (!color) return NOTE_COLORS[0];
  const idx = NOTE_COLORS.indexOf(color);
  if (idx < 0) return NOTE_COLORS[0];
  return NOTE_COLORS[(idx + 1) % NOTE_COLORS.length];
};

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

function renderNotes(notes: Note[]): void {
  const container = getNotesContainer();
  if (!container) return;
  container.innerHTML = '';
  notes.forEach((note) => {
    if (validateNote(note)) {
      container.appendChild(createNoteElement(note));
    }
  });
}

function renderAllNotes(): void {
  editingId = null;
  renderNotes(getVisibleNotes());
}

AppState.pubsub.subscribe('appStateChanged', () => {
  syncStateToUrl();
  renderAllNotes();
  updateNotesCount();
});

const setupSearch = (): void => {
  const input = getSearchInput();
  if (!input) return;

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
  if (!container) return;

  const noteEl = container.querySelector<HTMLElement>(`.note[data-id="${note.id}"]`);
  if (!noteEl) return;

  editingId = note.id;
  noteEl.classList.add('note-editing');

  const titleEl = noteEl.querySelector<HTMLElement>('.note-title');
  const bodyEl = noteEl.querySelector<HTMLElement>('.note-body');
  const actions = noteEl.querySelector<HTMLElement>('.note-actions');

  if (titleEl) {
    const input = document.createElement('input');
    input.className = 'note-title-input';
    input.value = note.title;
    titleEl.replaceWith(input);
    input.focus();
    input.select();
  }

  if (bodyEl) {
    const textarea = document.createElement('textarea');
    textarea.className = 'note-body-input';
    textarea.value = note.body;
    bodyEl.replaceWith(textarea);
  }

  if (actions) {
    actions.innerHTML = '';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = '✓';
    saveBtn.setAttribute('aria-label', 'Save note');
    saveBtn.onclick = () => saveInlineEdit(noteEl, note.id);
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '✕';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');
    cancelBtn.onclick = () => renderAllNotes();
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

const setupAddButton = (): void => {
  const addBtn = document.getElementById('addNoteBtn');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const note: Note = {
      id: AppState.generateId(),
      title: 'New Note',
      body: '',
      color: randomColor(),
    };
    AppState.notes.add(note);
    startInlineEdit(note);
  });
};

const setupShowCompleted = (): void => {
  const checkbox = document.getElementById('showCompletedCheckbox');
  if (!checkbox) return;
  checkbox.addEventListener('change', () => {
    renderAllNotes();
  });
};

const setupCopyLink = (): void => {
  const btn = document.getElementById('copyLinkBtn') as HTMLButtonElement | null;
  if (!btn) return;
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
      window.prompt('Copy this link:', url);
    }
  });
};

const setupClearCompleted = (): void => {
  const btn = document.getElementById('clearCompletedBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const completedCount = AppState.notes.getAll().filter((n) => n.completed).length;
    if (completedCount === 0) return;
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
