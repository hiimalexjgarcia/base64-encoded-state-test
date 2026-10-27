/* eslint-env browser */

import AppState from './state/appState';
import Note from './components/note';
import { createNoteFromForm, validateNote } from './utils/validation';
import { Note as NoteType } from './types';
import './modernizr';

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

AppState.pubsub.subscribe('notesStateChanged', (notes: NoteType[] | unknown) => {
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
function $<T extends HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

/**
 * Updates the notes container with new notes
 * @param notes - Array of notes to add
 */
function updateNotesContainer(notes: NoteType[]): void {
  const container = $('#notes');
  if (!container) return;
  
  notes.forEach((note) => {
    if (validateNote(note)) {
      const el = Note(note, () => {
        AppState.notes.remove(note);
      });
      container.appendChild(el);
    }
  });
}

/**
 * Renders all notes from current state
 */
function renderAllNotes(): void {
  const container = $('#notes');
  if (!container) return;
  
  container.innerHTML = '';
  const allNotes = AppState.notes.getAll();
  updateNotesContainer(allNotes);
}

// Set up notes toolbar
const setupSearch = (): void => {
  const searchInput = $('#notesInputSearch') as HTMLInputElement | null;
  if (!searchInput) return;
  
  searchInput.addEventListener('search', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const query = target.value;
    const results = query 
      ? AppState.notes.search(query).map((r) => r.item)
      : AppState.notes.getAll();
    
    const container = $('#notes');
    if (container) {
      container.innerHTML = '';
      updateNotesContainer(results);
    }
  }, false);
};

const setupForm = (): void => {
  const addNoteForm = $('#addNoteForm') as HTMLFormElement | null;
  if (!addNoteForm) return;
  
  addNoteForm.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    
    const formData = new FormData(addNoteForm);
    const noteData = createNoteFromForm(formData);
    
    if (!noteData) {
      // Validation failed - optionally show error to user
      console.error('Invalid note data');
      return;
    }
    
    // Create full note object with ID
    const note: NoteType = {
      id: AppState.generateId(),
      title: noteData.title,
      body: noteData.body
    };
    
    // Add to state (validation happens inside AppState.notes.add)
    AppState.notes.add(note);
    
    // Reset form
    addNoteForm.reset();
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
