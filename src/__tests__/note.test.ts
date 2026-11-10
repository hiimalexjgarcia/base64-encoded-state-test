import { jest } from '@jest/globals';
import NoteComponent, { NoteActions } from '../components/note';
import { Note as NoteType } from '../types';

describe('NoteComponent', () => {
  const baseNote: NoteType = {
    id: 'note-1',
    title: 'Hello',
    body: 'World',
  };

  const createActions = (overrides: Partial<NoteActions> = {}): NoteActions => ({
    onDelete: jest.fn(),
    ...overrides,
  });

  it('should render title and body as textContent (no HTML parsing)', () => {
    const el = NoteComponent({ ...baseNote, title: 'Tom & Jerry', body: '<b>xss</b>' }, createActions());
    const title = el.querySelector('.note-title');
    const body = el.querySelector('.note-body');

    expect(title?.textContent).toBe('Tom & Jerry');
    expect(body?.textContent).toBe('<b>xss</b>');
    expect(body?.innerHTML).not.toContain('<b>');
  });

  it('should add completed class and overlay when completed', () => {
    const el = NoteComponent({ ...baseNote, completed: true }, createActions());
    expect(el.classList.contains('note-completed')).toBe(true);
    const overlay = el.querySelector('.note-completed-overlay');
    expect(overlay?.textContent).toBe('X');
  });

  it('should add pinned class and toggle pin button state', () => {
    const onPin = jest.fn();
    const el = NoteComponent({ ...baseNote, pinned: true }, createActions({ onPin }));
    expect(el.classList.contains('note-pinned')).toBe(true);
    const pinBtn = el.querySelector('.note-pin') as HTMLButtonElement;
    expect(pinBtn.classList.contains('is-pinned')).toBe(true);
    expect(pinBtn.getAttribute('aria-label')).toBe('Unpin note');
  });

  it('should add color class', () => {
    const el = NoteComponent({ ...baseNote, color: 'blue' }, createActions());
    expect(el.classList.contains('note-color-blue')).toBe(true);
  });

  it('should not add color class when color missing', () => {
    const el = NoteComponent(baseNote, createActions());
    expect([...el.classList].some(c => c.startsWith('note-color-'))).toBe(false);
  });

  it('should wire checkbox change to onToggleComplete', () => {
    const onToggleComplete = jest.fn();
    const el = NoteComponent(baseNote, createActions({ onToggleComplete }));
    const checkbox = el.querySelector('.note-complete-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(onToggleComplete).toHaveBeenCalledTimes(1);
  });

  it('should reflect completed state on checkbox', () => {
    const el = NoteComponent({ ...baseNote, completed: true }, createActions({ onToggleComplete: jest.fn() }));
    const checkbox = el.querySelector('.note-complete-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('should wire pin button click', () => {
    const onPin = jest.fn();
    const el = NoteComponent(baseNote, createActions({ onPin }));
    const pinBtn = el.querySelector('.note-pin') as HTMLButtonElement;
    pinBtn.click();
    expect(onPin).toHaveBeenCalledTimes(1);
  });

  it('should wire color, edit, delete buttons when actions provided', () => {
    const onCycleColor = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const el = NoteComponent(baseNote, createActions({ onCycleColor, onEdit, onDelete }));

    (el.querySelector('.note-color') as HTMLButtonElement).click();
    (el.querySelector('.note-edit') as HTMLButtonElement).click();
    (el.querySelector('.note-delete') as HTMLButtonElement).click();

    expect(onCycleColor).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('should only render actions that are provided', () => {
    const el = NoteComponent(baseNote, { onDelete: jest.fn() });
    expect(el.querySelector('.note-complete-checkbox')).toBeNull();
    expect(el.querySelector('.note-pin')).toBeNull();
    expect(el.querySelector('.note-color')).toBeNull();
    expect(el.querySelector('.note-edit')).toBeNull();
    expect(el.querySelector('.note-delete')).not.toBeNull();
  });

  it('should set data-id and base classes', () => {
    const el = NoteComponent(baseNote, createActions());
    expect(el.dataset.id).toBe('note-1');
    expect(el.classList.contains('note')).toBe(true);
  });

  it('should not add completed overlay when not completed', () => {
    const el = NoteComponent(baseNote, createActions());
    expect(el.querySelector('.note-completed-overlay')).toBeNull();
  });
});
