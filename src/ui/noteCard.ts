/**
 * Note card component: renders one sticky note as DOM.
 */

import { Note, NoteColor } from '../notes/model';

export interface NoteActions {
  onDelete: () => void;
  onEdit?: () => void;
  onToggleComplete?: () => void;
  onPin?: () => void;
  onCycleColor?: () => void;
}

const createButton = (
  className: string,
  label: string,
  text: string,
  onClick: () => void,
): HTMLButtonElement => {
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
  icon.className = 'note-delete-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '×';

  const text = document.createElement('span');
  text.className = 'screen-reader';
  text.textContent = 'Delete note';

  button.appendChild(icon);
  button.appendChild(text);
  button.addEventListener('click', onClick);

  return button;
};

const colorClass = (color?: NoteColor): string => color ? ` note-color-${color}` : '';

export const createNoteCard = (note: Note, actionsConfig: NoteActions): HTMLElement => {
  const { onDelete, onEdit, onToggleComplete, onPin, onCycleColor } = actionsConfig;

  const el = document.createElement('div');
  el.className =
    'note' +
    (note.completed ? ' note-completed' : '') +
    (note.pinned ? ' note-pinned' : '') +
    colorClass(note.color);
  el.dataset.id = note.id;
  el.setAttribute('role', 'listitem');

  const actions = document.createElement('div');
  actions.className = 'note-actions';

  if (onToggleComplete) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'note-complete-checkbox';
    checkbox.checked = !!note.completed;
    checkbox.setAttribute(
      'aria-label',
      note.completed ? 'Mark note as not completed' : 'Mark note as completed',
    );
    checkbox.addEventListener('change', onToggleComplete);
    actions.appendChild(checkbox);
  }

  if (onPin) {
    actions.appendChild(
      createButton(
        'note-pin' + (note.pinned ? ' is-pinned' : ''),
        note.pinned ? 'Unpin note' : 'Pin note to top',
        '📌',
        onPin,
      ),
    );
  }

  if (onCycleColor) {
    actions.appendChild(createButton('note-color', 'Change note color', '🎨', onCycleColor));
  }

  if (onEdit) {
    actions.appendChild(createButton('note-edit', 'Edit note', '✎', onEdit));
  }
  actions.appendChild(createDeleteButton(onDelete));

  // textContent is XSS-safe and does not parse HTML entities, so raw values
  // are assigned directly (sanitizing here would double-escape on screen).
  const title = document.createElement('div');
  title.className = 'note-title';
  title.textContent = note.title;

  const body = document.createElement('div');
  body.className = 'note-body';
  body.textContent = note.body;

  el.appendChild(actions);
  el.appendChild(title);
  el.appendChild(body);

  if (note.completed) {
    const overlay = document.createElement('div');
    overlay.className = 'note-completed-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.textContent = 'X';
    el.appendChild(overlay);
  }

  return el;
};
