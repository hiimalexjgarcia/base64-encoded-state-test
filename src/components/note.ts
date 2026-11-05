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

const Note = (
  note: NoteType,
  deleteCallback: () => void,
  editCallback?: () => void,
  toggleCallback?: () => void,
  pinCallback?: () => void
): HTMLElement => {
  const el = document.createElement('div');
  el.className =
    'note' + (note.completed ? ' note-completed' : '') + (note.pinned ? ' note-pinned' : '');
  el.dataset.id = note.id;

  const actions = document.createElement('div');
  actions.className = 'note-actions';

  if (toggleCallback) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'note-complete-checkbox';
    checkbox.checked = !!note.completed;
    checkbox.setAttribute('aria-label', 'Mark note as completed');
    checkbox.addEventListener('change', toggleCallback);
    actions.appendChild(checkbox);
  }

  if (pinCallback) {
    actions.appendChild(
      createButton(
        'note-pin' + (note.pinned ? ' is-pinned' : ''),
        note.pinned ? 'Unpin note' : 'Pin note to top',
        '📌',
        pinCallback
      )
    );
  }

  if (editCallback) {
    actions.appendChild(createButton('note-edit', 'Edit note', '✎', editCallback));
  }
  actions.appendChild(createDeleteButton(deleteCallback));

  const title = document.createElement('div');
  title.className = 'note-title';
  title.textContent = sanitizeString(note.title);

  const body = document.createElement('div');
  body.className = 'note-body';
  body.textContent = sanitizeString(note.body);

  el.appendChild(actions);
  el.appendChild(title);
  el.appendChild(body);

  if (note.completed) {
    const overlay = document.createElement('div');
    overlay.className = 'note-completed-overlay';
    overlay.textContent = 'X';
    el.appendChild(overlay);
  }

  return el;
};

export default Note;
