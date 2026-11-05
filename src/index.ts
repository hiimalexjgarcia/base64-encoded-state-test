/* eslint-env browser */

import AppState from './state/appState';
import NoteComponent from './components/note';
import { validateNote } from './utils/validation';
import { Note } from './types';
import './index.css';

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

const filterByCompletion = (notes: Note[], showCompleted = isShowCompletedChecked()): Note[] =>
  showCompleted ? notes : notes.filter((n) => !n.completed);

const getSearchResults = (query: string): Note[] => {
  const trimmed = query.trim();
  return trimmed ? AppState.notes.search(trimmed).map((r) => r.item) : AppState.notes.getAll();
};

const getVisibleNotes = (query = getSearchInput()?.value ?? ''): Note[] =>
  filterByCompletion(getSearchResults(query));

function createNoteElement(note: Note): HTMLElement {
  return NoteComponent(
    note,
    () => AppState.notes.remove(note),
    () => startInlineEdit(note),
    () => AppState.notes.update({ ...note, completed: !note.completed })
  );
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
  if (document.querySelector('.note-editing')) {
    renderAllNotes();
  }

  const container = document.querySelector<HTMLElement>('#notes');
  if (!container) return;

  const noteEl = container.querySelector<HTMLElement>(`.note[data-id="${note.id}"]`);
  if (!noteEl) return;

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
  AppState.notes.update({ id, title, body, completed: existing?.completed });
};

const setupAddButton = (): void => {
  const addBtn = document.getElementById('addNoteBtn');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const note: Note = {
      id: AppState.generateId(),
      title: 'New Note',
      body: '',
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
