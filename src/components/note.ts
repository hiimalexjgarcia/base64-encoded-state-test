import { Note as NoteType } from '../types';
import { sanitizeString } from '../utils/validation';

const createButton = (className: string, label: string, text: string, onClick: () => void): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
};

const createDeleteButton = (onClick: () => void): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'note-delete';
  button.setAttribute('aria-label', 'Delete note');

  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.style.pointerEvents = 'none';
  icon.textContent = '×';

  const text = document.createElement('span');
  text.className = 'screen-reader';
  text.textContent = 'Delete note';

  button.appendChild(icon);
  button.appendChild(text);
  button.addEventListener('click', onClick);
  return button;
};

const Note = (note: NoteType, deleteCallback: () => void, editCallback?: () => void): HTMLElement => {
  const el = document.createElement('div');
  el.className = 'note';
  el.dataset.id = note.id;

  const actions = document.createElement('div');
  actions.className = 'note-actions';

  if (editCallback) {
    actions.appendChild(createButton('note-edit', 'Edit note', '✎', editCallback));
  }
  actions.appendChild(createDeleteButton(deleteCallback));

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const title = document.createElement('span');
  title.className = 'note-title';
  title.textContent = sanitizeString(note.title);
  summary.appendChild(title);

  const body = document.createElement('p');
  body.className = 'note-body';
  body.textContent = sanitizeString(note.body);

  details.appendChild(summary);
  details.appendChild(body);

  el.appendChild(actions);
  el.appendChild(details);

  return el;
};

export default Note;
