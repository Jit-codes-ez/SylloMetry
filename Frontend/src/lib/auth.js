/**
 * SylloMetry Authentication API Client
 * Connects frontend to the FastAPI backend (/api/auth)
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * 1. Request an email OTP verification code.
 * POST /api/auth/signup/otp/send
 */
export async function sendSignupOtp(email, fullName) {
  const payload = { email };
  if (fullName && fullName.trim()) {
    payload.full_name = fullName.trim();
  }

  const response = await fetch(`${API_BASE}/api/auth/signup/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to send verification code. Please try again.';
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * 2. Verify the 6-digit OTP code against Supabase Auth.
 * POST /api/auth/signup/otp/verify
 */
export async function verifySignupOtp(email, token) {
  const response = await fetch(`${API_BASE}/api/auth/signup/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Invalid or expired verification code.';
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * 3. Complete account registration with password and full name.
 * POST /api/auth/signup
 */
export async function completeSignup({ fullName, email, password, confirmPassword, termsAccepted, accessToken }) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      full_name: (fullName || '').trim(),
      email,
      password,
      confirm_password: confirmPassword,
      terms_accepted: Boolean(termsAccepted),
      access_token: accessToken || null,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Registration failed. Please try again.';
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Direct Supabase Auth client signup handler.
 * Ensures full_name is passed via options.data.
 */
export async function signUpWithSupabase(supabaseClient, { email, password, fullName }) {
  return await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  });
}

/**
 * 4. Check if an email already exists in public.users.
 * GET /api/auth/check-email
 */
export async function checkEmailExists(email) {
  if (!email || !email.trim()) return false;
  const response = await fetch(`${API_BASE}/api/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to verify email availability.';
    throw new Error(errorMsg);
  }
  return Boolean(data.exists);
}

/**
 * 5. Initiate Google OAuth signup.
 * GET /api/auth/signup/google
 * Optionally passes email parameter to check existence beforehand.
 */
export async function getGoogleSignupUrl(email) {
  const queryParams = new URLSearchParams();
  if (email && email.trim()) {
    queryParams.append('email', email.trim());
  }
  const url = `${API_BASE}/api/auth/signup/google${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.authorization_url) {
    const errorMsg = data.detail || 'Failed to initiate Google signup.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data.authorization_url;
}

/**
 * 6. Synchronize Google OAuth user to database.
 * POST /api/auth/oauth/sync
 */
export async function syncOAuthUser(accessToken, mode = 'signup') {
  const response = await fetch(`${API_BASE}/api/auth/oauth/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, mode }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to sync Google user account.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}


