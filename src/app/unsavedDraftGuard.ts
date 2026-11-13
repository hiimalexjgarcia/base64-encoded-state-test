/**
 * Unsaved-draft guard for reload and tab close. A single window-level
 * listener consults the latest app instance, so hot reloads and repeated
 * test bootstraps cannot stack stale guards.
 */

interface DraftGuardWindow extends Window {
  stickyNotesDraftGuardInstalled?: boolean;
  stickyNotesHasUnsavedDraft?: () => boolean;
  stickyNotesDraftGuardHandler?: (event: BeforeUnloadEvent) => void;
}

export interface UnsavedDraftGuard {
  destroy: () => void;
}

export const createUnsavedDraftGuard = (
  hasUnsavedDraft: () => boolean,
): UnsavedDraftGuard => {
  const guardWindow = window as DraftGuardWindow;
  guardWindow.stickyNotesHasUnsavedDraft = hasUnsavedDraft;

  if (!guardWindow.stickyNotesDraftGuardInstalled) {
    guardWindow.stickyNotesDraftGuardInstalled = true;
    const handler = (event: BeforeUnloadEvent): void => {
      if (!guardWindow.stickyNotesHasUnsavedDraft?.()) {
        return;
      }
      event.preventDefault();
      // Browsers require a truthy/empty returnValue assignment to show the
      // native "leave site?" confirmation.
      event.returnValue = '';
    };
    guardWindow.stickyNotesDraftGuardHandler = handler;
    window.addEventListener('beforeunload', handler);
  }

  return {
    destroy: (): void => {
      if (guardWindow.stickyNotesHasUnsavedDraft === hasUnsavedDraft) {
        guardWindow.stickyNotesHasUnsavedDraft = undefined;
      }
      const handler = guardWindow.stickyNotesDraftGuardHandler;
      // Only tear down the shared listener when this app still owns it.
      if (handler && !guardWindow.stickyNotesHasUnsavedDraft) {
        window.removeEventListener('beforeunload', handler);
        guardWindow.stickyNotesDraftGuardHandler = undefined;
        guardWindow.stickyNotesDraftGuardInstalled = false;
      }
    },
  };
};
