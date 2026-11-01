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
 * 4. Initiate Google OAuth signup.
 * GET /api/auth/signup/google
 */
export async function getGoogleSignupUrl() {
  const response = await fetch(`${API_BASE}/api/auth/signup/google`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.authorization_url) {
    throw new Error(data.detail || 'Failed to initiate Google signup.');
  }

  return data.authorization_url;
}

