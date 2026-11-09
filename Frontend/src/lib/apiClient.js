import { supabase } from "@/lib/supabaseClient";

/**
 * Custom error class capturing HTTP status code and response payload.
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Retrieves the active Supabase JWT access token.
 * 1. Queries Supabase client's active session.
 * 2. Falls back to localStorage if available.
 */
export async function getAccessToken() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (!error && session?.access_token) {
      return session.access_token;
    }
  } catch (err) {
    console.warn("Could not retrieve session from Supabase client:", err);
  }

  return localStorage.getItem("supabase_token") || null;
}

/**
 * Authenticated Fetch Wrapper
 *
 * Automatically injects the active Supabase JWT Bearer token into
 * the Authorization header of outbound HTTP requests.
 *
 * @param {string} endpoint - API path (e.g. '/api/dashboard/stats' or full URL)
 * @param {RequestInit} [options={}] - Custom fetch options
 * @returns {Promise<any>}
 */
export async function fetchWithAuth(endpoint, options = {}) {
  const { headers = {}, body, ...customConfig } = options;

  // 1. Retrieve active JWT access token
  const token = await getAccessToken();

  // 2. Prepare headers
  const requestHeaders = new Headers(headers);

  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  // Automatically set Content-Type to application/json for object bodies (unless FormData)
  const isFormData = body instanceof FormData;
  if (body && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const serializedBody =
    body && !isFormData && typeof body === "object"
      ? JSON.stringify(body)
      : body;

  const config = {
    ...customConfig,
    headers: requestHeaders,
    body: serializedBody,
  };

  // 3. Dispatch request
  const response = await fetch(endpoint, config);

  // 4. Handle 401 Unauthorized
  if (response.status === 401) {
    console.warn("API returned 401 Unauthorized. Access token may be expired or invalid.");
  }

  // 5. Parse response content
  const contentType = response.headers.get("content-type");
  let data = null;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const errorMsg =
      (typeof data === "object" && data !== null ? data.detail || data.message : null) ||
      response.statusText ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}

/**
 * Convenient HTTP verb helpers
 */
export const apiClient = {
  get: (endpoint, options = {}) => fetchWithAuth(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options = {}) => fetchWithAuth(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options = {}) => fetchWithAuth(endpoint, { ...options, method: "PUT", body }),
  patch: (endpoint, body, options = {}) => fetchWithAuth(endpoint, { ...options, method: "PATCH", body }),
  delete: (endpoint, options = {}) => fetchWithAuth(endpoint, { ...options, method: "DELETE" }),
};

export default apiClient;

