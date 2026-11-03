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

AppState.pubsub.subscribe('appStateChanged', () => {
  syncStateToUrl();
  renderAllNotes();
});

AppState.pubsub.subscribe('notesStateChanged', (notes: Note[] | unknown) => {
  const notesArray = Array.isArray(notes) ? notes : [];
  const countElement = document.getElementById('notesDisplayCount');
  if (countElement) {
    countElement.textContent = `${notesArray.length} note${notesArray.length !== 1 ? 's' : ''}`;
  }
});

function updateNotesContainer(notes: Note[]): void {
  const container = document.querySelector<HTMLElement>('#notes');
  if (!container) return;

  notes.forEach((note) => {
    if (validateNote(note)) {
      const el = NoteComponent(
        note,
        () => {
          AppState.notes.remove(note);
        },
        () => {
          startInlineEdit(note);
        }
      );
      container.appendChild(el);
    }
  });
}

function renderAllNotes(): void {
  const container = document.querySelector<HTMLElement>('#notes');
  if (!container) return;
  container.innerHTML = '';
  updateNotesContainer(AppState.notes.getAll());
}

const setupSearch = (): void => {
  const input = document.querySelector<HTMLInputElement>('#notesInputSearch');
  if (!input) return;

  const search = (query: string): void => {
    const results = query.trim()
      ? AppState.notes.search(query).map((r) => r.item)
      : AppState.notes.getAll();

    const container = document.querySelector<HTMLElement>('#notes');
    if (container) {
      container.innerHTML = '';
      updateNotesContainer(results);
    }
  };

  input.addEventListener('input', (e: Event) => {
    search((e.target as HTMLInputElement).value);
  }, false);

  input.addEventListener('search', (e: Event) => {
    search((e.target as HTMLInputElement).value);
  }, false);
};

const startInlineEdit = (note: Note): void => {
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

  AppState.notes.update({ id, title, body });
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
