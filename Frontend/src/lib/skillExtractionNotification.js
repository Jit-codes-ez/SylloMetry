/**
 * SylloMetry - Native Windows / Browser Desktop Notification Utility
 * Exclusively for Skill Extraction Completion Notifications (Success, Failed, Partial).
 *
 * Strict Scope Restrictions:
 * - Skill extraction completions only.
 * - Uses the native Browser Notifications API.
 * - Explicit user opt-in required (never auto-requested on page load).
 * - Full user toggle support (ON/OFF) persisted in localStorage.
 * - Guaranteed single notification per extraction job (deduplication via jobId & sessionStorage).
 * - Safe fallback: does not throw or break extraction if notifications are disabled/unsupported.
 */

const NOTIFIED_JOBS_STORAGE_KEY = 'syllo_notified_extraction_jobs';
const NOTIFICATION_PREF_STORAGE_KEY = 'syllo_skill_extraction_notifications_enabled';

// In-memory set of notified job IDs for instant zero-latency deduplication
const inMemoryNotifiedJobs = new Set();

// Hydrate in-memory set from sessionStorage if available
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const stored = window.sessionStorage.getItem(NOTIFIED_JOBS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => inMemoryNotifiedJobs.add(id));
      }
    }
  }
} catch {
  // Session storage access issue in restrictive contexts; safely ignore
}

/**
 * Checks if the Notifications API is supported in the current browser & context.
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof window.Notification === 'function'
  );
}

/**
 * Retrieves the current notification permission state.
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/**
 * Retrieves the user-level notification preference (persisted in localStorage).
 * Defaults to true if browser permission is already granted, false otherwise.
 * @returns {boolean}
 */
export function getNotificationPreference() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const stored = window.localStorage.getItem(NOTIFICATION_PREF_STORAGE_KEY);
    if (stored === 'false') return false;
    if (stored === 'true') return true;
    // If not explicitly set, default to true only if permission is already granted
    return getNotificationPermission() === 'granted';
  } catch {
    return false;
  }
}

/**
 * Persists the user-level notification preference in localStorage.
 * @param {boolean} enabled
 */
export function setNotificationPreference(enabled) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(NOTIFICATION_PREF_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage access issue in private browsing; safely ignore
  }
}

/**
 * Checks whether skill extraction desktop notifications are currently active:
 * Browser must support them, permission must be 'granted', and user toggle must be enabled.
 * @returns {boolean}
 */
export function isExtractionNotificationActive() {
  return (
    isNotificationSupported() &&
    getNotificationPermission() === 'granted' &&
    getNotificationPreference() === true
  );
}

/**
 * Requests browser notification permission upon an explicit user action.
 * Supports both modern Promise-based and legacy callback-based browser APIs safely.
 * Never invoke automatically on page load.
 * @returns {Promise<'granted' | 'denied' | 'default' | 'unsupported'>}
 */
export function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return Promise.resolve('unsupported');
  }

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (perm) => {
      if (!resolved) {
        resolved = true;
        resolve(perm || getNotificationPermission());
      }
    };

    try {
      // Notification.requestPermission in some browsers takes a callback, in others returns a Promise
      const p = Notification.requestPermission((callbackResult) => {
        safeResolve(callbackResult);
      });

      if (p && typeof p.then === 'function') {
        p.then((promiseResult) => {
          safeResolve(promiseResult);
        }).catch((err) => {
          console.warn('Error in Notification.requestPermission promise:', err);
          safeResolve(getNotificationPermission());
        });
      }
    } catch (err) {
      console.warn('Failed to call Notification.requestPermission:', err);
      safeResolve(getNotificationPermission());
    }
  });
}

/**
 * Toggles the notification state on user click.
 * Handles permission request if default, instructions if denied, and toggling if granted.
 *
 * @returns {Promise<{
 *   supported: boolean,
 *   permission: 'granted' | 'denied' | 'default' | 'unsupported',
 *   active: boolean,
 *   message: string
 * }>}
 */
export async function toggleSkillExtractionNotifications() {
  if (!isNotificationSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      active: false,
      message: 'Desktop notifications are not supported in this browser.',
    };
  }

  const currentPerm = getNotificationPermission();

  if (currentPerm === 'denied') {
    return {
      supported: true,
      permission: 'denied',
      active: false,
      message:
        'Notifications are blocked in your browser site settings. Click the lock/settings icon in your browser address bar, set Notifications to "Allow", and try again.',
    };
  }

  if (currentPerm === 'default') {
    const requestedPerm = await requestNotificationPermission();
    if (requestedPerm === 'granted') {
      setNotificationPreference(true);
      return {
        supported: true,
        permission: 'granted',
        active: true,
        message: 'Desktop notifications enabled for skill extraction completion.',
      };
    } else {
      setNotificationPreference(false);
      return {
        supported: true,
        permission: requestedPerm,
        active: false,
        message:
          requestedPerm === 'denied'
            ? 'Notifications were blocked in your browser settings. You can allow them anytime from the address bar.'
            : 'Notification permission was not granted.',
      };
    }
  }

  // When currentPerm === 'granted': toggle user preference between ON and OFF
  const currentPref = getNotificationPreference();
  const nextPref = !currentPref;
  setNotificationPreference(nextPref);

  return {
    supported: true,
    permission: 'granted',
    active: nextPref,
    message: nextPref
      ? 'Skill extraction desktop notifications turned ON.'
      : 'Skill extraction desktop notifications turned OFF.',
  };
}

/**
 * Checks whether a notification has already been triggered for the given extraction job.
 * @param {string} jobId
 * @returns {boolean}
 */
export function hasJobBeenNotified(jobId) {
  if (!jobId) return false;
  if (inMemoryNotifiedJobs.has(jobId)) return true;

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(NOTIFIED_JOBS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.includes(jobId)) {
          inMemoryNotifiedJobs.add(jobId);
          return true;
        }
      }
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Marks an extraction job as notified to prevent any duplicate triggers across re-renders/polling.
 * @param {string} jobId
 */
export function markJobAsNotified(jobId) {
  if (!jobId) return;
  inMemoryNotifiedJobs.add(jobId);

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const storedList = Array.from(inMemoryNotifiedJobs);
      window.sessionStorage.setItem(NOTIFIED_JOBS_STORAGE_KEY, JSON.stringify(storedList));
    }
  } catch {
    // ignore
  }
}

/**
 * Triggers a native desktop notification when an extraction job reaches a terminal state.
 *
 * @param {Object} options
 * @param {string} options.jobId - Unique identifier of the extraction job
 * @param {'completed' | 'done' | 'completed_with_warnings' | 'failed'} options.status - Terminal job status
 * @param {string} options.documentName - Display name of the document being processed
 * @param {number} [options.documentId] - Document ID for route navigation on click
 * @param {number} [options.extractedCount] - Total count of extracted skills
 * @param {number} [options.failedWindowsCount] - Count of failed windows if partial
 * @param {number} [options.totalWindows] - Total windows evaluated
 * @param {string} [options.errorMessage] - Failure explanation if job failed
 * @param {(info: { jobId: string, documentId?: number }) => void} [options.onNotificationClick] - Click callback
 * @returns {Notification | null}
 */
export function notifySkillExtractionTerminalState({
  jobId,
  status,
  documentName,
  documentId,
  extractedCount,
  failedWindowsCount = 0,
  totalWindows = 0,
  errorMessage,
  onNotificationClick,
}) {
  // 1. Guard: desktop notifications must be active (supported, browser permission granted, user preference enabled)
  if (!isExtractionNotificationActive()) {
    return null;
  }

  // 2. Guard against duplicate notifications for the same job
  if (!jobId || hasJobBeenNotified(jobId)) {
    return null;
  }

  // 3. Mark as notified immediately before dispatching to prevent racing duplicate calls
  markJobAsNotified(jobId);

  const cleanDocName = documentName ? String(documentName).trim() : 'Document';

  let title;
  let body;

  // Outcome A: Successful extraction
  if (status === 'completed' || status === 'done') {
    title = 'Skill Extraction Completed';
    const countText = typeof extractedCount === 'number'
      ? `${extractedCount} technical skill${extractedCount === 1 ? '' : 's'}`
      : 'technical skills';
    body = `"${cleanDocName}": Successfully extracted ${countText}. Click to review.`;
  }
  // Outcome C: Partial extraction (some windows failed)
  else if (status === 'completed_with_warnings') {
    title = 'Skill Extraction Partially Completed';
    const countText = typeof extractedCount === 'number'
      ? `${extractedCount} skill${extractedCount === 1 ? '' : 's'} extracted`
      : 'Completed with warnings';
    const failDetail = failedWindowsCount > 0
      ? ` (${failedWindowsCount}${totalWindows > 0 ? ` of ${totalWindows}` : ''} window${failedWindowsCount === 1 ? '' : 's'} failed)`
      : '';
    body = `"${cleanDocName}": ${countText}${failDetail}. Click to inspect and review.`;
  }
  // Outcome B: Failed extraction
  else if (status === 'failed') {
    title = 'Skill Extraction Failed';
    const reason = errorMessage ? `: ${errorMessage}` : ' encountered an error. Please retry.';
    body = `"${cleanDocName}" extraction${reason}`;
  } else {
    // Non-terminal or unrecognized status; do not notify
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `syllo-skill-extraction-${jobId}`,
      renotify: false,
    });

    notification.onclick = (event) => {
      event.preventDefault();
      try {
        window.focus();
      } catch {
        // ignore
      }

      if (typeof onNotificationClick === 'function') {
        try {
          onNotificationClick({ jobId, documentId });
        } catch (clickErr) {
          console.error('Error in skill extraction notification click handler:', clickErr);
        }
      }

      // Also dispatch custom event for global app listeners (like AdminDashboard)
      try {
        window.dispatchEvent(
          new CustomEvent('syllo:open-extraction-review', {
            detail: { jobId, documentId },
          })
        );
      } catch {
        // ignore
      }

      try {
        notification.close();
      } catch {
        // ignore
      }
    };

    return notification;
  } catch (notifyErr) {
    console.warn('Browser prevented displaying native desktop notification:', notifyErr);
    return null;
  }
}
