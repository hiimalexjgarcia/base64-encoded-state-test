/**
 * URL state encoding/decoding utilities
 * Uses compact JSON + base64url for URL-safe encoding
 */

const { nanoid: nanoidFn } = require('nanoid');
import { AppState } from '../types';
import { validateNote } from './validation';

/**
 * Converts a Uint8Array to a base64 string
 */
const uint8ToBase64 = (uint8: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < uint8.byteLength; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
};

/**
 * Converts a base64 string to a Uint8Array
 */
const base64ToUint8 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const uint8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i);
  }
  return uint8;
};

/**
 * Helper to decode Uint8Array to string
 */
const uint8ToString = (uint8: Uint8Array): string => {
  return new TextDecoder().decode(uint8);
};

/**
 * Converts a standard base64 string to a URL-safe base64 string
 * Replaces + with -, / with _, and removes padding =
 * @param str - Standard base64 string
 * @returns URL-safe base64 string
 */
const toBase64Url = (str: string): string => {
  return str
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Converts a URL-safe base64 string to a standard base64 string
 * Replaces - with +, _ with /, and adds padding if needed
 * @param str - URL-safe base64 string
 * @returns Standard base64 string
 */
const fromBase64Url = (str: string): string => {
  // Add padding if needed (base64 length should be multiple of 4)
  let padded = str;
  const paddingLength = (4 - (str.length % 4)) % 4;
  if (paddingLength) {
    padded += '='.repeat(paddingLength);
  }
  
  return padded
    .replace(/-/g, '+')
    .replace(/_/g, '/');
};

/**
 * Compacts state by using short field names
 * @param state - Application state to compact
 * @returns Compact representation
 */
const compactState = (state: AppState): object => {
  return {
    n: state.notes.map(n => {
      const compactNote: Record<string, string> = {
        i: n.id,
        t: n.title
      };
      if (n.body) {
        compactNote.b = n.body;
      }
      return compactNote;
    })
  };
};

/**
 * Expands compact state back to full state
 * @param compact - Compact state representation
 * @returns Full application state
 */
const expandState = (compact: unknown): AppState => {
  if (!compact || typeof compact !== 'object') {
    return { notes: [] };
  }
  
  const c = compact as Record<string, unknown>;
  if (!Array.isArray(c.n)) {
    return { notes: [] };
  }
  
  const notes: Note[] = [];
  for (const item of c.n) {
    if (item && typeof item === 'object') {
      const n = item as Record<string, string>;
      const note: Partial<Note> = {
        id: n.i || '',
        title: n.t || '',
        body: n.b || ''
      };
      
      // Validate and add if valid
      if (validateNote(note as Note)) {
        notes.push(note as Note);
      }
    }
  }
  
  return { notes };
};

/**
 * Encodes application state to a URL-safe string
 * Uses: JSON → Compact → Base64url
 * @param state - Application state to encode
 * @returns URL-safe encoded string
 */
export const encodeState = (state: AppState): string => {
  try {
    if (!state) {
      return '';
    }

    if (!state.notes || state.notes.length === 0) {
      return '';
    }

    const compact = compactState(state);
    const json = JSON.stringify(compact);
    const inputData = new TextEncoder().encode(json);

    const base64 = uint8ToBase64(inputData);
    return toBase64Url(base64);
  } catch {
    return '';
  }
};

/**
 * Decodes a URL-safe string to application state
 * Uses: Base64url → JSON → Expand
 * @param encoded - URL-safe encoded string
 * @returns Application state
 */
export const decodeState = (encoded: string): AppState => {
  if (!encoded) {
    return { notes: [] };
  }

  if (typeof encoded !== 'string') {
    return { notes: [] };
  }

  try {
    const base64 = fromBase64Url(encoded);
    const uint8Data = base64ToUint8(base64);
    const json = uint8ToString(uint8Data);
    const data = JSON.parse(json);

    if (data && typeof data === 'object' && Array.isArray((data as any).n)) {
      return expandState(data);
    }
    return { notes: [] };
  } catch {
    return { notes: [] };
  }
};

/**
 * Generate a short unique ID using nanoid
 * @returns Short unique ID (21 characters)
 */
export const generateId = (): string => {
  return nanoidFn();
};
