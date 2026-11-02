/**
 * Note component - creates a note DOM element
 */

import { Note as NoteType } from '../types';
import { sanitizeString } from '../utils/validation';

/**
 * Creates a note DOM element
 * @param note - Note object with id, title, body
 * @param deleteCallback - Callback to invoke when delete button is clicked
 * @param editCallback - Callback to invoke when edit button is clicked
 * @returns DOM element representing the note
 */
const Note = (note: NoteType, deleteCallback: () => void, editCallback?: () => void): HTMLElement => {
  // Create container
  const el = document.createElement('div');
  el.className = 'note';
  el.dataset.id = note.id;

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'note-actions';

  // Create edit button
  if (editCallback) {
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'note-edit';
    editButton.setAttribute('aria-label', 'Edit note');
    editButton.textContent = '✎';
    editButton.addEventListener('click', editCallback);
    buttonContainer.appendChild(editButton);
  }

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
  buttonContainer.appendChild(deleteButton);

  // Create details section
  const details = document.createElement('details');

  const summary = document.createElement('summary');
  const titleSpan = document.createElement('span');
  titleSpan.className = 'note-title';
  titleSpan.textContent = sanitizeString(note.title);
  summary.appendChild(titleSpan);

  const bodyParagraph = document.createElement('p');
  bodyParagraph.className = 'note-body';
  bodyParagraph.textContent = sanitizeString(note.body);

  details.appendChild(summary);
  details.appendChild(bodyParagraph);

  // Assemble the note
  el.appendChild(buttonContainer);
  el.appendChild(details);

  return el;
};

export default Note;
