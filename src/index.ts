/* eslint-env browser */

import AppState from './state/appState';
import Note from './components/note';
import { createNoteFromForm, validateNote } from './utils/validation';
import { Note } from './types';
import './index.css';

// Initialize state synchronization with URL
const syncStateToUrl = (): void => {
  const path = (document.location.pathname as string) || '/';
  window.history.replaceState(
    null,
    '',
    path + '#/' + AppState.state.getEncoded()
  );
};

// Subscribe to state changes
AppState.pubsub.subscribe('appStateChanged', () => {
  syncStateToUrl();
  // Re-render notes when state changes
  renderAllNotes();
});

AppState.pubsub.subscribe('notesStateChanged', (notes: Note[] | unknown) => {
  const notesArray = Array.isArray(notes) ? notes : [];
  const countElement = document.getElementById('notesDisplayCount');
  if (countElement) {
    countElement.textContent = `${notesArray.length} note${notesArray.length !== 1 ? 's' : ''}`;
  }
});

// DOM helper functions
/**
 * Query selector helper
 * @param selector - CSS selector
 * @returns First matching element
 */
/**
 * Updates the notes container with new notes
 * @param notes - Array of notes to add
 */
function updateNotesContainer(notes: Note[]): void {
  const container = document.querySelector<HTMLElement>('#notes');
  if (!container) return;

  notes.forEach((note) => {
    if (validateNote(note)) {
      const el = Note(note, () => {
        AppState.notes.remove(note);
      }, () => {
        startEditNote(note);
      });
      container.appendChild(el);
    }
  });
}

/**
 * Renders all notes from current state
 */
function renderAllNotes(): void {
  const container = document.querySelector<HTMLElement>('#notes');
  if (!container) return;

  container.innerHTML = '';
  updateNotesContainer(AppState.notes.getAll());
}

// Set up notes toolbar
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

let editingNoteId: string | null = null;

const getFormElements = (form: HTMLFormElement) => ({
  titleInput: form.querySelector('input[name="note"]') as HTMLInputElement | null,
  bodyInput: form.querySelector('textarea[name="detail"]') as HTMLTextAreaElement | null,
  legend: form.querySelector('legend'),
  submitBtn: form.querySelector('input[type="submit"]') as HTMLInputElement | null,
  cancelBtn: document.getElementById('cancelEditBtn'),
});

const startEditNote = (note: Note): void => {
  const form = document.querySelector<HTMLFormElement>('#addNoteForm');
  if (!form) return;

  editingNoteId = note.id;
  const { titleInput, bodyInput, legend, submitBtn, cancelBtn } = getFormElements(form);

  if (titleInput) titleInput.value = note.title;
  if (bodyInput) bodyInput.value = note.body;
  if (legend) legend.textContent = 'Edit note';
  if (submitBtn) submitBtn.value = 'Save';
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  titleInput?.focus();
};

const cancelEdit = (): void => {
  editingNoteId = null;
  const form = document.querySelector<HTMLFormElement>('#addNoteForm');
  if (!form) return;
  form.reset();
  const { legend, submitBtn, cancelBtn } = getFormElements(form);
  if (legend) legend.textContent = 'Add note';
  if (submitBtn) submitBtn.value = 'Submit';
  if (cancelBtn) cancelBtn.style.display = 'none';
};

const setupForm = (): void => {
  const form = document.querySelector<HTMLFormElement>('#addNoteForm');
  if (!form) return;

  const { cancelBtn } = getFormElements(form);
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelEdit);
  }

  form.addEventListener('submit', (e: Event) => {
    e.preventDefault();

    const formData = new FormData(form);
    const noteData = createNoteFromForm(formData);

    if (!noteData) {
      console.error('Invalid note data');
      return;
    }

    if (editingNoteId) {
      AppState.notes.update({
        id: editingNoteId,
        title: noteData.title,
        body: noteData.body,
      });
      cancelEdit();
      return;
    }

    AppState.notes.add({
      id: AppState.generateId(),
      title: noteData.title,
      body: noteData.body,
    });

    form.reset();
  }, false);
};

// Initialize App state from URL
const initializeState = (): void => {
  try {
    const hash = window.location.hash.substring(2);
    if (hash) {
      AppState.state.setEncoded(hash);
    }
    // If no hash, state is already initialized to empty by default
  } catch (e) {
    console.error('Error initializing state:', e);
    // Reset to default state
    AppState.state.setEncoded(AppState.state.getEncoded());
  }
};

// Initial render
const initializeApp = (): void => {
  // Initialize state from URL
  initializeState();
  
  // Set up event listeners
  setupSearch();
  setupForm();
  
  // Initial render of all notes
  window.addEventListener('hashchange', () => {
    initializeState();
  }, false);
  
  // Initial render
  renderAllNotes();
};

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
