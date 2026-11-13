/**
 * Display formatting helpers.
 */

/**
 * Formats a notes count for display, e.g. "1 note", "2 notes". When a
 * filtered subset is on screen, the total is included, e.g. "2 of 5 notes".
 */
export const formatNotesCount = (count: number, total = count): string => {
  const noun = `note${total !== 1 ? 's' : ''}`;

  return total === count ? `${count} ${noun}` : `${count} of ${total} ${noun}`;
};
