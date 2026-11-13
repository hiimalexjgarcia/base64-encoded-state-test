/**
 * Unsaved-draft guard for reload and tab close. A single window-level
 * listener consults the latest app instance, so hot reloads and repeated
 * test bootstraps cannot stack stale guards.
 */

interface DraftGuardWindow extends Window {
  linkboardDraftGuardInstalled?: boolean;
  linkboardHasUnsavedDraft?: () => boolean;
  linkboardDraftGuardHandler?: (event: BeforeUnloadEvent) => void;
}

export interface UnsavedDraftGuard {
  destroy: () => void;
}

export const createUnsavedDraftGuard = (
  hasUnsavedDraft: () => boolean,
): UnsavedDraftGuard => {
  const guardWindow = window as DraftGuardWindow;
  guardWindow.linkboardHasUnsavedDraft = hasUnsavedDraft;

  if (!guardWindow.linkboardDraftGuardInstalled) {
    guardWindow.linkboardDraftGuardInstalled = true;
    const handler = (event: BeforeUnloadEvent): void => {
      if (!guardWindow.linkboardHasUnsavedDraft?.()) {
        return;
      }
      event.preventDefault();
      // Browsers require a truthy/empty returnValue assignment to show the
      // native "leave site?" confirmation.
      event.returnValue = '';
    };
    guardWindow.linkboardDraftGuardHandler = handler;
    window.addEventListener('beforeunload', handler);
  }

  return {
    destroy: (): void => {
      if (guardWindow.linkboardHasUnsavedDraft === hasUnsavedDraft) {
        guardWindow.linkboardHasUnsavedDraft = undefined;
      }
      const handler = guardWindow.linkboardDraftGuardHandler;
      // Only tear down the shared listener when this app still owns it.
      if (handler && !guardWindow.linkboardHasUnsavedDraft) {
        window.removeEventListener('beforeunload', handler);
        guardWindow.linkboardDraftGuardHandler = undefined;
        guardWindow.linkboardDraftGuardInstalled = false;
      }
    },
  };
};
