/**
 * Shared DOM lookups and focus helpers used by board, toolbar, and editor.
 */

export const getNotesContainer = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('#notes');

export const getSearchInput = (): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>('#notesInputSearch');

export const clearSearchInput = (): void => {
  const search = getSearchInput();
  if (search?.value) {
    search.value = '';
  }
};

export const getShowCompletedCheckbox = (): HTMLInputElement | null =>
  document.getElementById('showCompletedCheckbox') as HTMLInputElement | null;

export const isShowCompletedChecked = (): boolean =>
  !!getShowCompletedCheckbox()?.checked;

/**
 * Finds a rendered note by ID without interpolating the ID into a CSS
 * selector. Note IDs come from shared links (URL state), so a crafted ID
 * such as `a"]` must not be able to break querySelector.
 */
export const findNoteElement = (container: HTMLElement, id: string): HTMLElement | null => {
  const notes = container.querySelectorAll<HTMLElement>('.note');
  for (const el of notes) {
    if (el.dataset.id === id) {
      return el;
    }
  }

  return null;
};

/**
 * Returns focus to a note's Edit button after its editor closes, falling
 * back to Add Note when the note is no longer on screen (for example when
 * it was filtered out or deleted).
 */
export const focusNoteControl = (id: string): void => {
  const container = getNotesContainer();
  const noteEl = container ? findNoteElement(container, id) : null;
  const editButton = noteEl?.querySelector<HTMLButtonElement>('.note-edit');

  if (editButton) {
    editButton.focus();

    return;
  }

  document.getElementById('addNoteBtn')?.focus();
};
