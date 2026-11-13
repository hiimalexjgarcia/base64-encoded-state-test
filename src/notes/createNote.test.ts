import { createNote } from './createNote';
import { NOTE_COLORS } from './model';

describe('createNote', () => {
  it('creates a note with defaults', () => {
    const note = createNote();

    expect(note.title).toBe('New Note');
    expect(note.body).toBe('');
    expect(note.id).not.toBe('');
    expect(NOTE_COLORS).toContain(note.color);
  });

  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createNote().id));

    expect(ids.size).toBe(50);
  });
});
