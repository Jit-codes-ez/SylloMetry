/**
 * SylloMetry - Native Windows / Browser Desktop Notification Utility
 * Exclusively for Skill Extraction Completion Notifications (Success, Failed, Partial).
 *
 * Strict Scope Restrictions:
 * - Skill extraction completions only.
 * - Uses the native Browser Notifications API.
 * - Explicit user opt-in required (never auto-requested on page load).
 * - Guaranteed single notification per extraction job (deduplication via jobId & sessionStorage).
 * - Safe fallback: does not throw or break extraction if notifications are disabled/unsupported.
 */

const NOTIFIED_JOBS_STORAGE_KEY = 'syllo_notified_extraction_jobs';

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
} catch (e) {
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
  return Notification.permission;
}

/**
 * Requests browser notification permission upon an explicit user action.
 * Never invoke automatically on page load.
 * @returns {Promise<'granted' | 'denied' | 'default' | 'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return getNotificationPermission();
  }
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
  } catch {}

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
  } catch {}
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
  // 1. Guard against unsupported or unpermitted states
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  // 2. Guard against duplicate notifications for the same job
  if (!jobId || hasJobBeenNotified(jobId)) {
    return null;
  }

  // 3. Mark as notified immediately before dispatching to prevent racing duplicate calls
  markJobAsNotified(jobId);

  const cleanDocName = documentName ? String(documentName).trim() : 'Document';

  let title = '';
  let body = '';

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
      } catch {}

      if (typeof onNotificationClick === 'function') {
        try {
          onNotificationClick({ jobId, documentId });
        } catch (clickErr) {
          console.error('Error in skill extraction notification click handler:', clickErr);
        }
      }

      try {
        notification.close();
      } catch {}
    };

    return notification;
  } catch (notifyErr) {
    console.warn('Browser prevented displaying native desktop notification:', notifyErr);
    return null;
  }
}
