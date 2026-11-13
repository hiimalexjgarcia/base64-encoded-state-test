/**
 * Visible warning banners for share-link length, history failures, budget
 * rejections, and unreadable incoming links.
 */

import { DecodeFailureReason } from '../url/codec';

const URL_WARNING_ID = 'urlWarning';
const DECODE_WARNING_ID = 'decodeWarning';

// Shareable-link warning threshold in characters. Browsers cap URLs
// (Safari ~80k), and long links break in chat apps and email clients.
export const URL_LENGTH_WARN_THRESHOLD = 16_000;

const SHARE_URL_TOO_LARGE_MESSAGE =
  'This board is too large to fit in a shareable link. Remove some notes or ' +
  'shorten their text before adding more.';

const REPLACE_FAILED_MESSAGE =
  'The address bar could not be updated, so this link may be out of date. ' +
  'Your notes are still in this tab — remove some notes to create a ' +
  'shareable link.';

const DECODE_FAILURE_MESSAGES: Record<DecodeFailureReason, string> = {
  'too-long':
    'This link is too long to open safely. It may have been truncated when ' +
    'it was shared.',
  'invalid-encoding':
    'This link’s note data is not valid base64url, so it cannot be read.',
  'invalid-json':
    'This link’s note data is corrupt or truncated, so it cannot be read.',
  'invalid-shape':
    'This link does not contain recognisable note data.',
  'unsupported-version':
    'This link uses an unsupported schema version and cannot be opened here.',
};

type UrlWarningKind = 'length' | 'replace' | 'budget' | null;

export interface WarningsController {
  showBudgetWarning: () => void;
  showReplaceWarning: () => void;
  showLengthWarning: (urlLength: number) => void;
  clearUrlWarning: () => void;
  showDecodeWarning: (reason: DecodeFailureReason, onStartEmpty: () => void) => void;
  clearDecodeWarning: () => void;
  destroy: () => void;
}

const showUrlWarning = (message: string): void => {
  let warning = document.getElementById(URL_WARNING_ID);
  if (!warning) {
    warning = document.createElement('div');
    warning.id = URL_WARNING_ID;
    warning.className = 'url-warning';
    warning.setAttribute('role', 'status');
    warning.setAttribute('aria-live', 'polite');
    document.body.appendChild(warning);
  }
  if (warning.textContent !== message) {
    warning.textContent = message;
  }
};

export const createWarnings = (): WarningsController => {
  let urlWarningKind: UrlWarningKind = null;

  const clearUrlWarning = (): void => {
    document.getElementById(URL_WARNING_ID)?.remove();
    urlWarningKind = null;
  };

  const clearDecodeWarning = (): void => {
    document.getElementById(DECODE_WARNING_ID)?.remove();
  };

  return {
    showBudgetWarning: (): void => {
      if (urlWarningKind !== 'budget') {
        urlWarningKind = 'budget';
        showUrlWarning(SHARE_URL_TOO_LARGE_MESSAGE);
      }
    },

    showReplaceWarning: (): void => {
      if (urlWarningKind !== 'replace') {
        urlWarningKind = 'replace';
        showUrlWarning(REPLACE_FAILED_MESSAGE);
      }
    },

    showLengthWarning: (urlLength: number): void => {
      if (urlWarningKind !== 'length') {
        urlWarningKind = 'length';
        showUrlWarning(
          `This share link is ${urlLength.toLocaleString()} characters and may ` +
          'be truncated by browsers, chat apps, or email clients. Remove some ' +
          'notes to shorten it.',
        );
      }
    },

    clearUrlWarning,

    showDecodeWarning: (reason, onStartEmpty): void => {
      let warning = document.getElementById(DECODE_WARNING_ID);
      if (!warning) {
        warning = document.createElement('div');
        warning.id = DECODE_WARNING_ID;
        warning.className = 'url-warning decode-warning';
        warning.setAttribute('role', 'alert');
        document.body.appendChild(warning);
      }

      warning.innerHTML = '';
      const text = document.createElement('span');
      text.textContent =
        `${DECODE_FAILURE_MESSAGES[reason]} The original link is unchanged — ` +
        'your notes were not deleted.';
      const startEmpty = document.createElement('button');
      startEmpty.type = 'button';
      startEmpty.textContent = 'Start empty';
      startEmpty.addEventListener('click', onStartEmpty);
      warning.appendChild(text);
      warning.appendChild(startEmpty);
    },

    clearDecodeWarning,

    destroy: (): void => {
      clearUrlWarning();
      clearDecodeWarning();
    },
  };
};
