/**
 * Note component - creates a note DOM element
 */

import { Note as NoteType } from '../types';
import { sanitizeString } from '../utils/validation';

/**
 * Creates a note DOM element
 * @param note - Note object with id, title, body
 * @param deleteCallback - Callback to invoke when delete button is clicked
 * @returns DOM element representing the note
 */
const Note = (note: NoteType, deleteCallback: () => void): HTMLElement => {
  // Create container
  const el = document.createElement('div');
  el.className = 'note';
  el.dataset.id = note.id;

  // Create delete button
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'note-delete';
  deleteButton.setAttribute('aria-label', 'Delete note');

  const deleteSpanIcon = document.createElement('span');
  deleteSpanIcon.setAttribute('aria-hidden', 'true');
  deleteSpanIcon.style.pointerEvents = 'none';
  deleteSpanIcon.textContent = '×';

  const deleteSpanText = document.createElement('span');
  deleteSpanText.className = 'screen-reader';
  deleteSpanText.textContent = 'Delete note';

  deleteButton.appendChild(deleteSpanIcon);
  deleteButton.appendChild(deleteSpanText);
  deleteButton.addEventListener('click', deleteCallback);

  // Create details section
  const details = document.createElement('details');

  const summary = document.createElement('summary');
  const titleSpan = document.createElement('span');
  titleSpan.className = 'note-title';
  // Use textContent for XSS prevention (sanitize just in case)
  titleSpan.textContent = sanitizeString(note.title);
  summary.appendChild(titleSpan);

  const bodyParagraph = document.createElement('p');
  bodyParagraph.className = 'note-body';
  // Use textContent for XSS prevention (sanitize just in case)
  bodyParagraph.textContent = sanitizeString(note.body);

  details.appendChild(summary);
  details.appendChild(bodyParagraph);

  // Assemble the note
  el.appendChild(deleteButton);
  el.appendChild(details);

  return el;
};

export default Note;
