import { formatNotesCount } from './format';

describe('formatNotesCount', () => {
  it('pluralizes counts', () => {
    expect(formatNotesCount(0)).toBe('0 notes');
    expect(formatNotesCount(1)).toBe('1 note');
    expect(formatNotesCount(2)).toBe('2 notes');
  });

  it('shows the visible count against the total', () => {
    expect(formatNotesCount(1, 5)).toBe('1 of 5 notes');
    expect(formatNotesCount(2, 2)).toBe('2 notes');
    expect(formatNotesCount(0, 1)).toBe('0 of 1 note');
  });
});
