/**
 * Creates a new note with the default title and a random color.
 */

import { nanoid } from 'nanoid';
import { Note, randomColor } from './model';

export const createNote = (): Note => ({
  id: nanoid(),
  title: 'New Note',
  body: '',
  color: randomColor(),
});
