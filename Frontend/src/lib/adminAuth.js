/**
 * SylloMetry Administration Authentication & Document Management Client
 * Connects frontend Admin Portal to FastAPI backend (/api/admin)
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export const ADMIN_TOKEN_KEY = 'syllo_admin_token';
export const ADMIN_REFRESH_TOKEN_KEY = 'syllo_admin_refresh_token';
export const ADMIN_USER_KEY = 'syllo_admin';

/**
 * 1. Request an admin email OTP verification code.
 * POST /api/admin/auth/otp/send
 */
export async function sendAdminLoginOtp(email) {
  const response = await fetch(`${API_BASE}/api/admin/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to send admin verification code.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 2. Verify admin 6-digit OTP code.
 * POST /api/admin/auth/otp/verify
 */
export async function verifyAdminLoginOtp(email, token) {
  const response = await fetch(`${API_BASE}/api/admin/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      token: token.trim(),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Invalid or expired verification code.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 3. Log in admin with verified email and password.
 * POST /api/admin/auth/login
 */
export async function loginAdminWithPassword({ email, password, remember }) {
  const response = await fetch(`${API_BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      remember: Boolean(remember),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Admin authentication failed. Please verify your credentials.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 4. Fetch current admin profile from token.
 * GET /api/admin/auth/me
 */
export async function getCurrentAdmin(token) {
  const accessToken = token || localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!accessToken) return null;

  try {
    const response = await fetch(`${API_BASE}/api/admin/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json().catch(() => ({}));
    return data.admin || null;
  } catch {
    return null;
  }
}

/**
 * 5. Sign out the administrator.
 * POST /api/admin/auth/logout
 */
export async function logoutAdminApi() {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  try {
    if (accessToken) {
      await fetch(`${API_BASE}/api/admin/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }
  } catch {
    // Ignore network errors on logout
  } finally {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  }
}

/**
 * 6. Upload a PDF document for administrative ingestion pipeline.
 * POST /api/admin/documents/upload
 */
export async function uploadAdminPdf(file) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to upload PDF document.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 7. List documents queued or ingested by admin.
 * GET /api/admin/documents
 */
export async function getAdminDocuments() {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${API_BASE}/api/admin/documents`, {
      headers,
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json().catch(() => ({}));
    return data.documents || [];
  } catch {
    return [];
  }
}

/**
 * 8. Create a new administrator account.
 * POST /api/admin/create
 */
export async function createAdminAccount({ email, password }) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to create new administrator.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 9. Change password for current administrator.
 * POST /api/admin/auth/change-password
 */
export async function changeAdminPassword({ current_password, new_password }) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/auth/change-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      current_password,
      new_password,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to change administrator password.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}


