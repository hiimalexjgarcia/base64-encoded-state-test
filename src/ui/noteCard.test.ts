import { jest } from '@jest/globals';
import { createNoteCard, NoteCardActions } from './noteCard';
import { Note } from '../notes/model';

describe('createNoteCard', () => {
  const baseNote: Note = {
    id: 'note-1',
    title: 'Hello',
    body: 'World',
  };

  const createActions = (overrides: Partial<NoteCardActions> = {}): NoteCardActions => ({
    onDelete: jest.fn(),
    ...overrides,
  });

  it('renders title and body as textContent (no HTML parsing)', () => {
    const el = createNoteCard({ ...baseNote, title: 'Tom & Jerry', body: '<b>xss</b>' }, createActions());
    const title = el.querySelector('.note-title');
    const body = el.querySelector('.note-body');

    expect(title?.textContent).toBe('Tom & Jerry');
    expect(body?.textContent).toBe('<b>xss</b>');
    expect(body?.innerHTML).not.toContain('<b>');
  });

  it('adds the completed class and overlay when completed', () => {
    const el = createNoteCard({ ...baseNote, completed: true }, createActions());

    expect(el.classList.contains('note-completed')).toBe(true);
    const overlay = el.querySelector('.note-completed-overlay');
    expect(overlay?.textContent).toBe('X');
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
  });

  it('adds the pinned class and toggles the pin button state', () => {
    const onPin = jest.fn();
    const el = createNoteCard({ ...baseNote, pinned: true }, createActions({ onPin }));

    expect(el.classList.contains('note-pinned')).toBe(true);
    const pinBtn = el.querySelector('.note-pin') as HTMLButtonElement;
    expect(pinBtn.classList.contains('is-pinned')).toBe(true);
    expect(pinBtn.getAttribute('aria-label')).toBe('Unpin note');
  });

  it('adds a color class only when a color is set', () => {
    const colored = createNoteCard({ ...baseNote, color: 'blue' }, createActions());
    const plain = createNoteCard(baseNote, createActions());

    expect(colored.classList.contains('note-color-blue')).toBe(true);
    expect([...plain.classList].some((c) => c.startsWith('note-color-'))).toBe(false);
  });

  it('wires the completion checkbox to onToggleComplete', () => {
    const onToggleComplete = jest.fn();
    const el = createNoteCard(baseNote, createActions({ onToggleComplete }));
    const checkbox = el.querySelector('.note-complete-checkbox') as HTMLInputElement;

    expect(checkbox.checked).toBe(false);
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(onToggleComplete).toHaveBeenCalledTimes(1);
  });

  it('reflects completed state on the checkbox', () => {
    const el = createNoteCard(
      { ...baseNote, completed: true },
      createActions({ onToggleComplete: jest.fn() }),
    );

    expect((el.querySelector('.note-complete-checkbox') as HTMLInputElement).checked).toBe(true);
  });

  it('labels the completed checkbox by the action it performs', () => {
    const active = createNoteCard(baseNote, createActions({ onToggleComplete: jest.fn() }));
    const completed = createNoteCard(
      { ...baseNote, completed: true },
      createActions({ onToggleComplete: jest.fn() }),
    );

    expect(active.querySelector('.note-complete-checkbox')?.getAttribute('aria-label'))
      .toBe('Mark note as completed');
    expect(completed.querySelector('.note-complete-checkbox')?.getAttribute('aria-label'))
      .toBe('Mark note as not completed');
  });

  it('wires the pin button click', () => {
    const onPin = jest.fn();
    const el = createNoteCard(baseNote, createActions({ onPin }));

    (el.querySelector('.note-pin') as HTMLButtonElement).click();
    expect(onPin).toHaveBeenCalledTimes(1);
  });

  it('wires color, edit, and delete buttons when actions are provided', () => {
    const onCycleColor = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const el = createNoteCard(baseNote, createActions({ onCycleColor, onEdit, onDelete }));

    (el.querySelector('.note-color') as HTMLButtonElement).click();
    (el.querySelector('.note-edit') as HTMLButtonElement).click();
    (el.querySelector('.note-delete') as HTMLButtonElement).click();

    expect(onCycleColor).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('only renders actions that are provided', () => {
    const el = createNoteCard(baseNote, { onDelete: jest.fn() });

    expect(el.querySelector('.note-complete-checkbox')).toBeNull();
    expect(el.querySelector('.note-pin')).toBeNull();
    expect(el.querySelector('.note-color')).toBeNull();
    expect(el.querySelector('.note-edit')).toBeNull();
    expect(el.querySelector('.note-delete')).not.toBeNull();
  });

  it('sets data-id, base classes, and listitem role', () => {
    const el = createNoteCard(baseNote, createActions());

    expect(el.dataset.id).toBe('note-1');
    expect(el.classList.contains('note')).toBe(true);
    expect(el.getAttribute('role')).toBe('listitem');
  });

  it('styles the delete icon with a class instead of inline styles', () => {
    const el = createNoteCard(baseNote, createActions());
    const icon = el.querySelector('.note-delete-icon');

    expect(icon).not.toBeNull();
    expect((icon as HTMLElement).getAttribute('style')).toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not add the completed overlay when not completed', () => {
    const el = createNoteCard(baseNote, createActions());

    expect(el.querySelector('.note-completed-overlay')).toBeNull();
  });
});
