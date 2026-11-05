/**
 * URL state encoding/decoding utilities
 * Uses compact JSON + base64url for URL-safe encoding
 */

import { nanoid } from 'nanoid';
import { AppState, Note, NOTE_COLORS, NoteColor } from '../types';
import { validateNote } from './validation';

const uint8ToBase64 = (uint8: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
};

const base64ToUint8 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const toBase64Url = (str: string): string =>
  str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (str: string): string => {
  const pad = (4 - (str.length % 4)) % 4;
  const padded = pad ? str + '='.repeat(pad) : str;
  return padded.replace(/-/g, '+').replace(/_/g, '/');
};

const compactState = (state: AppState) => ({
  n: state.notes.map((note) => {
    const compact: Record<string, any> = { i: note.id, t: note.title };
    if (note.body) compact.b = note.body;
    if (note.completed) compact.c = 1;
    if (note.pinned) compact.p = 1;
    if (note.color) compact.k = note.color;
    return compact;
  }),
});

const expandState = (compact: unknown): AppState => {
  if (!compact || typeof compact !== 'object') return { notes: [] };
  const data = compact as { n?: unknown };
  if (!Array.isArray(data.n)) return { notes: [] };

  const notes: Note[] = [];
  for (const item of data.n) {
    if (!item || typeof item !== 'object') continue;
    const n = item as Record<string, any>;
    const note: Note = {
      id: n.i || '',
      title: n.t || '',
      body: n.b || '',
    };
    if (n.c) note.completed = true;
    if (n.p) note.pinned = true;
    if (typeof n.k === 'string' && NOTE_COLORS.includes(n.k as NoteColor)) note.color = n.k as NoteColor;
    if (validateNote(note)) notes.push(note);
  }
  return { notes };
};

/**
 * Encodes application state to a URL-safe string
 */
export const encodeState = (state: AppState): string => {
  try {
    if (!state?.notes?.length) return '';
    const json = JSON.stringify(compactState(state));
    const bytes = new TextEncoder().encode(json);
    return toBase64Url(uint8ToBase64(bytes));
  } catch {
    return '';
  }
};

/**
 * Decodes a URL-safe string to application state
 */
export const decodeState = (encoded: string): AppState => {
  if (!encoded || typeof encoded !== 'string') return { notes: [] };
  try {
    const json = new TextDecoder().decode(base64ToUint8(fromBase64Url(encoded)));
    const data = JSON.parse(json);
    if (data && typeof data === 'object' && Array.isArray(data.n)) {
      return expandState(data);
    }
    return { notes: [] };
  } catch {
    return { notes: [] };
  }
};

export const generateId = (): string => nanoid();
