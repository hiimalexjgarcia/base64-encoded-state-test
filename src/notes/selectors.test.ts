import {
  createVisibleNotesSelector,
  filterByCompletion,
  getVisibleNotes,
  searchNotes,
  sortPinnedFirst,
} from './selectors';
import { Note } from './model';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'id',
  title: 'Title',
  body: 'Body',
  ...overrides,
});

describe('note selectors', () => {
  describe('sortPinnedFirst', () => {
    it('moves pinned notes before unpinned ones', () => {
      const notes = [
        makeNote({ id: '1', pinned: false }),
        makeNote({ id: '2', pinned: true }),
        makeNote({ id: '3', pinned: false }),
      ];

      expect(sortPinnedFirst(notes).map((n) => n.id)).toEqual(['2', '1', '3']);
    });

    it('preserves relative order within groups', () => {
      const notes = [
        makeNote({ id: 'a' }),
        makeNote({ id: 'b', pinned: true }),
        makeNote({ id: 'c' }),
        makeNote({ id: 'd', pinned: true }),
      ];

      expect(sortPinnedFirst(notes).map((n) => n.id)).toEqual(['b', 'd', 'a', 'c']);
    });

    it('does not mutate the input array', () => {
      const notes = [
        makeNote({ id: '1' }),
        makeNote({ id: '2', pinned: true }),
      ];
      const ids = notes.map((n) => n.id);

      sortPinnedFirst(notes);
      expect(notes.map((n) => n.id)).toEqual(ids);
    });

    it('returns an empty array unchanged', () => {
      expect(sortPinnedFirst([])).toEqual([]);
    });
  });

  describe('filterByCompletion', () => {
    it('hides completed notes by default', () => {
      const notes = [
        makeNote({ id: '1' }),
        makeNote({ id: '2', completed: true }),
      ];

      expect(filterByCompletion(notes).map((n) => n.id)).toEqual(['1']);
    });

    it('keeps completed notes when showCompleted is true', () => {
      const notes = [
        makeNote({ id: '1' }),
        makeNote({ id: '2', completed: true }),
      ];

      expect(filterByCompletion(notes, true).map((n) => n.id)).toEqual(['1', '2']);
    });
  });

  describe('searchNotes', () => {
    it('returns all notes for a blank query', () => {
      const notes = [
        makeNote({ id: '1' }),
        makeNote({ id: '2' }),
      ];

      expect(searchNotes(notes, '')).toEqual(notes);
      expect(searchNotes(notes, '   ')).toEqual(notes);
    });

    it('matches by title', () => {
      const notes = [
        makeNote({ id: '1', title: 'Hello World' }),
        makeNote({ id: '2', title: 'Goodbye' }),
      ];

      expect(searchNotes(notes, 'Hello').map((n) => n.id)).toEqual(['1']);
    });

    it('matches by body', () => {
      const notes = [
        makeNote({ id: '1', body: 'needle in haystack' }),
        makeNote({ id: '2', body: 'nothing here' }),
      ];

      expect(searchNotes(notes, 'needle').map((n) => n.id)).toEqual(['1']);
    });

    it('returns empty for a non-matching query', () => {
      const notes = [makeNote({ title: 'Alpha' })];

      expect(searchNotes(notes, 'zzzznonexistent')).toEqual([]);
    });

    it('treats Fuse extended-search operators as literal text', () => {
      const notes = [
        makeNote({ id: '1', title: 'Alpha' }),
        makeNote({ id: '2', title: 'Beta' }),
      ];

      // With useExtendedSearch, "!Alpha" means "not Alpha" and would return
      // Beta. The plain search ignores the punctuation and matches Alpha.
      expect(searchNotes(notes, '!Alpha').map((n) => n.id)).toEqual(['1']);
    });
  });

  describe('getVisibleNotes', () => {
    const notes = [
      makeNote({ id: 'plain', title: 'Groceries' }),
      makeNote({ id: 'completed', title: 'Homework', completed: true }),
      makeNote({ id: 'pinned', title: 'Pinned', pinned: true }),
      makeNote({ id: 'pinned-completed', title: 'Pinned Homework', pinned: true, completed: true }),
    ];

    it('applies search, completion filter, and pin sort', () => {
      expect(getVisibleNotes(notes, {}).map((n) => n.id)).toEqual(['pinned', 'plain']);
    });

    it('includes completed notes when showCompleted is true', () => {
      expect(getVisibleNotes(notes, { showCompleted: true }).map((n) => n.id))
        .toEqual(['pinned', 'pinned-completed', 'plain', 'completed']);
    });

    it('hides completed matches when filtering by query', () => {
      expect(getVisibleNotes(notes, { query: 'Homework' }).map((n) => n.id)).toEqual([]);
    });

    it('combines search with showCompleted', () => {
      expect(getVisibleNotes(notes, { query: 'Homework', showCompleted: true }).map((n) => n.id))
        .toEqual(['pinned-completed', 'completed']);
    });

    it('keeps pin priority for query matches', () => {
      expect(getVisibleNotes(notes, { query: 'Groceries' }).map((n) => n.id)).toEqual(['plain']);
    });
  });

  describe('createVisibleNotesSelector', () => {
    it('reuses the cached index when the revision is unchanged', () => {
      const notes = [
        makeNote({ id: '1', title: 'Alpha' }),
        makeNote({ id: '2', title: 'Beta' }),
      ];
      const select = createVisibleNotesSelector();

      expect(select(notes, { query: 'Alpha', revision: 7 }).map((n) => n.id)).toEqual(['1']);
      expect(select(notes, { query: 'Alpha', revision: 7 }).map((n) => n.id)).toEqual(['1']);
      expect(select(notes, { query: 'Beta', revision: 8 }).map((n) => n.id)).toEqual(['2']);
    });

    it('searches without a revision for one-off use', () => {
      const notes = [makeNote({ id: '1', title: 'Alpha' })];
      const select = createVisibleNotesSelector();

      expect(select(notes, { query: 'Alpha' }).map((n) => n.id)).toEqual(['1']);
    });
  });
});
