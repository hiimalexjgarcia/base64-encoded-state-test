import {
  cycleColor,
  filterByCompletion,
  formatNotesCount,
  getVisibleNotes,
  randomColor,
  searchNotes,
  sortPinnedFirst,
} from '../utils/view';
import { Note, NOTE_COLORS, NoteColor } from '../types';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'id',
  title: 'Title',
  body: 'Body',
  ...overrides,
});

describe('view helpers', () => {
  describe('sortPinnedFirst', () => {
    it('should move pinned notes before unpinned ones', () => {
      const notes = [
        makeNote({ id: '1', pinned: false }),
        makeNote({ id: '2', pinned: true }),
        makeNote({ id: '3', pinned: false }),
      ];

      expect(sortPinnedFirst(notes).map((n) => n.id)).toEqual(['2', '1', '3']);
    });

    it('should preserve relative order within groups', () => {
      const notes = [
        makeNote({ id: 'a' }),
        makeNote({ id: 'b', pinned: true }),
        makeNote({ id: 'c' }),
        makeNote({ id: 'd', pinned: true }),
      ];

      expect(sortPinnedFirst(notes).map((n) => n.id)).toEqual(['b', 'd', 'a', 'c']);
    });

    it('should not mutate the input array', () => {
      const notes = [
        makeNote({ id: '1' }),
        makeNote({ id: '2', pinned: true }),
      ];
      const ids = notes.map((n) => n.id);

      sortPinnedFirst(notes);
      expect(notes.map((n) => n.id)).toEqual(ids);
    });

    it('should return empty array unchanged', () => {
      expect(sortPinnedFirst([])).toEqual([]);
    });
  });

  describe('filterByCompletion', () => {
    it('should hide completed notes by default', () => {
      const notes = [
        makeNote({ id: '1' }),
        makeNote({ id: '2', completed: true }),
      ];

      expect(filterByCompletion(notes).map((n) => n.id)).toEqual(['1']);
    });

    it('should keep completed notes when showCompleted is true', () => {
      const notes = [
        makeNote({ id: '1' }),
        makeNote({ id: '2', completed: true }),
      ];

      expect(filterByCompletion(notes, true).map((n) => n.id)).toEqual(['1', '2']);
    });
  });

  describe('searchNotes', () => {
    it('should return all notes for a blank query', () => {
      const notes = [
        makeNote({ id: '1' }),
        makeNote({ id: '2' }),
      ];

      expect(searchNotes(notes, '')).toEqual(notes);
      expect(searchNotes(notes, '   ')).toEqual(notes);
    });

    it('should match by title', () => {
      const notes = [
        makeNote({ id: '1', title: 'Hello World' }),
        makeNote({ id: '2', title: 'Goodbye' }),
      ];

      expect(searchNotes(notes, 'Hello').map((n) => n.id)).toEqual(['1']);
    });

    it('should match by body', () => {
      const notes = [
        makeNote({ id: '1', body: 'needle in haystack' }),
        makeNote({ id: '2', body: 'nothing here' }),
      ];

      expect(searchNotes(notes, 'needle').map((n) => n.id)).toEqual(['1']);
    });

    it('should return empty for non-matching query', () => {
      const notes = [makeNote({ title: 'Alpha' })];
      expect(searchNotes(notes, 'zzzznonexistent')).toEqual([]);
    });
  });

  describe('getVisibleNotes', () => {
    const notes = [
      makeNote({ id: 'plain', title: 'Groceries' }),
      makeNote({ id: 'completed', title: 'Homework', completed: true }),
      makeNote({ id: 'pinned', title: 'Pinned', pinned: true }),
      makeNote({ id: 'pinned-completed', title: 'Pinned Homework', pinned: true, completed: true }),
    ];

    it('should apply search, completion filter, and pin sort', () => {
      const visible = getVisibleNotes(notes, {}).map((n) => n.id);

      expect(visible).toEqual(['pinned', 'plain']);
    });

    it('should include completed notes when showCompleted is true', () => {
      const visible = getVisibleNotes(notes, { showCompleted: true }).map((n) => n.id);

      expect(visible).toEqual(['pinned', 'pinned-completed', 'plain', 'completed']);
    });

    it('should hide completed matches when filtering by query', () => {
      const visible = getVisibleNotes(notes, { query: 'Homework' }).map((n) => n.id);

      expect(visible).toEqual([]);
    });

    it('should combine search with showCompleted', () => {
      const visible = getVisibleNotes(notes, { query: 'Homework', showCompleted: true }).map((n) => n.id);

      expect(visible).toEqual(['pinned-completed', 'completed']);
    });

    it('should keep pin priority for query matches', () => {
      const visible = getVisibleNotes(notes, { query: 'Groceries' }).map((n) => n.id);

      expect(visible).toEqual(['plain']);
    });
  });

  describe('cycleColor', () => {
    it('should map undefined to the first color', () => {
      expect(cycleColor(undefined)).toBe(NOTE_COLORS[0]);
    });

    it('should advance through the palette', () => {
      expect(cycleColor('yellow')).toBe('green');
      expect(cycleColor('green')).toBe('blue');
    });

    it('should wrap around from the last color', () => {
      expect(cycleColor('orange')).toBe(NOTE_COLORS[0]);
    });

    it('should map unknown colors to the first color', () => {
      expect(cycleColor('chartreuse' as NoteColor)).toBe(NOTE_COLORS[0]);
    });

    it('should never return undefined', () => {
      NOTE_COLORS.forEach((color) => {
        expect(cycleColor(color)).toBeDefined();
      });
    });
  });

  describe('randomColor', () => {
    it('should return a known palette color', () => {
      for (let i = 0; i < 20; i++) {
        expect(NOTE_COLORS).toContain(randomColor());
      }
    });
  });

  describe('formatNotesCount', () => {
    it('should pluralize counts', () => {
      expect(formatNotesCount(0)).toBe('0 notes');
      expect(formatNotesCount(1)).toBe('1 note');
      expect(formatNotesCount(2)).toBe('2 notes');
    });
  });
});
