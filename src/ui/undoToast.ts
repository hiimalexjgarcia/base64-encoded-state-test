/**
 * Undo toast view. Owns the DOM and countdown only; restoring removed notes
 * is the caller's responsibility. The countdown pauses while the toast is
 * hovered or focused so keyboard and screen-reader users have time to act.
 */

const UNDO_TOAST_MS = 6000;

export interface UndoToastOptions {
  onUndo: () => void;
  onDismiss?: () => void;
}

export interface UndoToast {
  show: (message: string) => void;
  hide: () => void;
  destroy: () => void;
}

export const createUndoToast = ({ onUndo, onDismiss }: UndoToastOptions): UndoToast => {
  let timer: number | null = null;
  let deadline = 0;
  let remaining = UNDO_TOAST_MS;
  let hovered = false;
  let focused = false;

  const clearTimer = (): void => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const pause = (): void => {
    if (timer === null) {
      return;
    }
    clearTimer();
    remaining = Math.max(0, deadline - Date.now());
  };

  const resume = (): void => {
    if (hovered || focused) {
      return;
    }
    clearTimer();
    deadline = Date.now() + remaining;
    timer = window.setTimeout(hide, remaining);
  };

  const getToast = (): HTMLElement => {
    let toast = document.querySelector<HTMLElement>('#undoToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'undoToast';
      toast.className = 'undo-toast';
      // A live region containing an interactive control is awkward for screen
      // readers, so the toast is a labelled region and only its text is live.
      toast.setAttribute('role', 'region');
      toast.setAttribute('aria-label', 'Undo notification');
      // WCAG 2.2.1: don't dismiss while the user is reading or about to undo.
      toast.addEventListener('mouseenter', () => {
        hovered = true;
        pause();
      });
      toast.addEventListener('mouseleave', () => {
        hovered = false;
        resume();
      });
      toast.addEventListener('focusin', () => {
        focused = true;
        pause();
      });
      toast.addEventListener('focusout', (event) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !toast?.contains(next)) {
          focused = false;
          resume();
        }
      });
      toast.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          hide();
        }
      });
      document.body.appendChild(toast);
    }

    return toast;
  };

  const hide = (): void => {
    const toast = document.querySelector<HTMLElement>('#undoToast');
    if (toast?.contains(document.activeElement)) {
      document.getElementById('addNoteBtn')?.focus();
    }
    toast?.remove();
    clearTimer();
    hovered = false;
    focused = false;
    remaining = UNDO_TOAST_MS;
    onDismiss?.();
  };

  return {
    show: (message: string): void => {
      const toast = getToast();
      toast.innerHTML = '';

      hovered = false;
      focused = false;
      remaining = UNDO_TOAST_MS;

      const text = document.createElement('span');
      text.setAttribute('role', 'status');
      text.setAttribute('aria-live', 'polite');
      text.setAttribute('aria-atomic', 'true');
      text.textContent = message;

      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.className = 'btn btn-primary';
      undoBtn.textContent = 'Undo';
      undoBtn.addEventListener('click', () => {
        onUndo();
        hide();
      });

      const dismissBtn = document.createElement('button');
      dismissBtn.type = 'button';
      dismissBtn.className = 'undo-toast-dismiss';
      dismissBtn.setAttribute('aria-label', 'Dismiss notification');
      dismissBtn.textContent = '×';
      dismissBtn.addEventListener('click', hide);

      toast.appendChild(text);
      toast.appendChild(undoBtn);
      toast.appendChild(dismissBtn);

      clearTimer();
      deadline = Date.now() + UNDO_TOAST_MS;
      timer = window.setTimeout(hide, UNDO_TOAST_MS);

      // The button receives focus for keyboard users, which pauses the timer
      // until they move on (the focusin listener also covers later refocuses).
      undoBtn.focus();
      pause();
    },

    hide,

    destroy: (): void => {
      clearTimer();
      document.getElementById('undoToast')?.remove();
      onDismiss?.();
    },
  };
};
