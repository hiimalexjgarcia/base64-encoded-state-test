/**
 * URL state encoding/decoding utilities
 * Uses compact JSON + base64url for URL-safe encoding
 */

import { nanoid } from 'nanoid';
import { AppState, Note, NOTE_COLORS, NoteColor } from '../types';
import { validateNote } from './validation';

interface CompactNote {
  i: string;
  t: string;
  b?: string;
  c?: number;
  p?: number;
  k?: NoteColor;
}

interface CompactState {
  /** URL schema version. Links without a version are treated as v1. */
  v: 1;
  n: CompactNote[];
}

const URL_STATE_VERSION = 1 as const;

/**
 * Upper bound for an encoded hash. Browsers cap URLs well below this, so a
 * decoded value longer than this is not a legitimate share link and is
 * discarded before any base64/JSON work happens.
 */
export const MAX_ENCODED_LENGTH = 100_000;

/**
 * Upper bound for the compact JSON payload in UTF-8 bytes. base64 expands
 * three bytes to four characters, so 75,000 bytes encode to at most 100,000
 * characters — exactly the decode ceiling above. Keeping the write budget in
 * bytes (rather than JavaScript string length) means multi-byte text cannot
 * produce a link that the decoder later rejects.
 */
export const MAX_STATE_BYTES = Math.floor(MAX_ENCODED_LENGTH / 4 * 3);

export type DecodeFailureReason =
  | 'too-long'
  | 'invalid-encoding'
  | 'invalid-json'
  | 'invalid-shape'
  | 'unsupported-version';

export interface DecodeResult {
  state: AppState;
  /** Null when the input was empty or decoded successfully. */
  error: DecodeFailureReason | null;
}

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
  const pad = (4 - str.length % 4) % 4;
  const padded = pad ? str + '='.repeat(pad) : str;

  return padded.replace(/-/g, '+').replace(/_/g, '/');
};

const compactState = (state: AppState): CompactState => ({
  v: URL_STATE_VERSION,
  n: state.notes.map((note) => {
    const compact: CompactNote = { i: note.id, t: note.title };
    if (note.body) {
      compact.b = note.body;
    }
    if (note.completed) {
      compact.c = 1;
    }
    if (note.pinned) {
      compact.p = 1;
    }
    if (note.color) {
      compact.k = note.color;
    }

    return compact;
  }),
});

const expandState = (compact: unknown): AppState => {
  if (!compact || typeof compact !== 'object') {
    return { notes: [] };
  }
  const data = compact as { n?: unknown };
  if (!Array.isArray(data.n)) {
    return { notes: [] };
  }

  const notes: Note[] = [];
  const seenIds = new Set<string>();
  for (const item of data.n) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const n = item as Record<string, unknown>;
    const note: Note = {
      id: typeof n.i === 'string' ? n.i : '',
      title: typeof n.t === 'string' ? n.t : '',
      body: typeof n.b === 'string' ? n.b : '',
    };
    if (n.c) {
      note.completed = true;
    }
    if (n.p) {
      note.pinned = true;
    }
    if (typeof n.k === 'string' && NOTE_COLORS.includes(n.k as NoteColor)) {
      note.color = n.k as NoteColor;
    }
    // Duplicate ids would make update/remove affect several notes at once,
    // so a shared link can only contribute one note per id.
    if (validateNote(note) && !seenIds.has(note.id)) {
      seenIds.add(note.id);
      notes.push(note);
    }
  }

  return { notes };
};

/**
 * Encodes the compact state to UTF-8 bytes. Shared by the size-budget check
 * and the encoder so the two always measure the same payload.
 */
const compactStateBytes = (state: AppState): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(compactState(state)));

/**
 * Returns true when the board's compact JSON payload fits within the write
 * budget. AppState refuses mutations that would exceed this, so the app can
 * never generate a link that decodeState would reject.
 */
export const isStateWithinBudget = (state: AppState): boolean => {
  try {
    if (!state?.notes?.length) {
      return true;
    }

    return compactStateBytes(state).length <= MAX_STATE_BYTES;
  } catch {
    return false;
  }
};

/**
 * Encodes application state to a URL-safe string
 */
export const encodeState = (state: AppState): string => {
  try {
    if (!state?.notes?.length) {return '';}
    const bytes = compactStateBytes(state);
    // Defensive: AppState enforces the budget before committing a change, but
    // returning an unreadable link is never an acceptable fallback.
    if (bytes.length > MAX_STATE_BYTES) {return '';}

    const encoded = toBase64Url(uint8ToBase64(bytes));

    return encoded.length <= MAX_ENCODED_LENGTH ? encoded : '';
  } catch {
    return '';
  }
};

/**
 * Decodes a URL-safe string and reports why a non-empty link failed.
 */
export const decodeStateDetailed = (encoded: string): DecodeResult => {
  const empty: AppState = { notes: [] };
  if (!encoded || typeof encoded !== 'string') {
    return { state: empty, error: null };
  }
  if (encoded.length > MAX_ENCODED_LENGTH) {
    return { state: empty, error: 'too-long' };
  }

  let json: string;
  try {
    json = new TextDecoder().decode(base64ToUint8(fromBase64Url(encoded)));
  } catch {
    return { state: empty, error: 'invalid-encoding' };
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { state: empty, error: 'invalid-json' };
  }

  if (!data || typeof data !== 'object') {
    return { state: empty, error: 'invalid-shape' };
  }
  const compact = data as { n?: unknown; v?: unknown };
  if (!Array.isArray(compact.n)) {
    return { state: empty, error: 'invalid-shape' };
  }
  // Links written before the version field are implicitly v1.
  if (compact.v !== undefined && compact.v !== URL_STATE_VERSION) {
    return { state: empty, error: 'unsupported-version' };
  }

  return { state: expandState(compact), error: null };
};

/**
 * Decodes a URL-safe string to application state. Use decodeStateDetailed
 * when the reason for a failure needs to be shown to the user.
 */
export const decodeState = (encoded: string): AppState =>
  decodeStateDetailed(encoded).state;

export const generateId = (): string => nanoid();
