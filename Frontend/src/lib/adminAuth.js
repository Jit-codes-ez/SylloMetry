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

  return data;
}

/**
 * Categories allowlist for industry documents
 */
export const ALLOWED_INDUSTRY_CATEGORIES = [
  { value: 'qualification_file', label: 'Qualification File' },
  { value: 'job_description', label: 'Job Description' },
];

/**
 * 10. Upload industry PDF document to Supabase Storage.
 * POST /api/admin/industry-files
 */
export async function uploadIndustryFile(file, category) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/industry-files`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to upload industry file.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 11. List stored industry PDF documents with optional category filtering and pagination.
 * GET /api/admin/industry-files
 */
export async function listIndustryFiles({ category = '', limit = 10, offset = 0 } = {}) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const params = new URLSearchParams();
  if (category) params.append('category', category);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  const response = await fetch(`${API_BASE}/api/admin/industry-files?${params.toString()}`, {
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to list industry files.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 12. Request a 60-second temporary signed download URL for an industry PDF.
 * GET /api/admin/industry-files/download
 */
export async function getIndustryFileDownloadUrl(storagePath) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const params = new URLSearchParams({ storage_path: storagePath });
  const response = await fetch(`${API_BASE}/api/admin/industry-files/download?${params.toString()}`, {
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to generate download URL.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data.signed_url;
}

/**
 * 13. Delete an industry PDF document from Supabase Storage.
 * DELETE /api/admin/industry-files
 */
export async function deleteIndustryFile(storagePath) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const params = new URLSearchParams({ storage_path: storagePath });
  const response = await fetch(`${API_BASE}/api/admin/industry-files?${params.toString()}`, {
    method: 'DELETE',
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to delete industry file.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 14. Get stored files not yet registered in industry_documents.
 * GET /api/admin/industry-documents/unregistered
 */
export async function getUnregisteredIndustryFiles() {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/industry-documents/unregistered`, {
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to fetch unregistered files.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 15. Register an uploaded storage PDF into industry_documents.
 * POST /api/admin/industry-documents
 */
export async function registerIndustryDocument({
  document_name,
  document_type,
  issuing_organization,
  source_url,
  published_date,
  storage_path,
}) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/industry-documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      document_name: document_name.trim(),
      document_type: document_type.trim(),
      issuing_organization: issuing_organization ? issuing_organization.trim() : null,
      source_url: source_url ? source_url.trim() : null,
      published_date: published_date ? published_date.trim() : null,
      storage_path: storage_path.trim(),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to register industry document.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 16. Get all registered industry documents with linked occupations.
 * GET /api/admin/industry-documents
 */
export async function getRegisteredIndustryDocuments() {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/industry-documents`, {
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to fetch registered documents.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 17. Link an occupation to a registered industry document.
 * POST /api/admin/industry-documents/{document_id}/occupations
 */
export async function linkOccupationToDocument(documentId, {
  classification_system,
  classification_code,
  occupation_name,
  relationship_type,
}) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/industry-documents/${documentId}/occupations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      classification_system: classification_system.trim(),
      classification_code: classification_code.trim(),
      occupation_name: occupation_name.trim(),
      relationship_type: relationship_type.trim(),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to link occupation.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 18. Unlink an occupation from a registered industry document.
 * DELETE /api/admin/industry-documents/{document_id}/occupations/{occupation_id}
 */
export async function unlinkOccupationFromDocument(documentId, occupationId, relationshipType = null) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const params = new URLSearchParams();
  if (relationshipType) {
    params.append('relationship_type', relationshipType);
  }

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(
    `${API_BASE}/api/admin/industry-documents/${documentId}/occupations/${occupationId}${queryString}`,
    {
      method: 'DELETE',
      headers,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to unlink occupation.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 19. Retrieve text preview and page statistics for an industry document.
 * GET /api/admin/industry-documents/{document_id}/text-preview
 */
export async function getDocumentTextPreview(documentId, page = null) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const queryString = page ? `?page=${page}` : '';
  const response = await fetch(
    `${API_BASE}/api/admin/industry-documents/${documentId}/text-preview${queryString}`,
    {
      headers,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to preview extracted text.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 16. Start an LLM skill extraction background job for a registered document.
 * @param {number} documentId
 * @param {boolean} [dryRun=false]
 * @returns {Promise<{ job_id: string, status: string, document_id: number, dry_run: boolean, message: string }>}
 */
export async function startSkillExtraction(documentId, dryRun = false) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${API_BASE}/api/admin/industry-documents/${documentId}/extract-skills?dry_run=${Boolean(dryRun)}`,
    {
      method: 'POST',
      headers,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to start skill extraction.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 17. Poll the status and progress of a skill extraction job.
 * @param {string} jobId
 * @returns {Promise<{ job_id: string, status: 'running'|'done'|'failed', progress: Object, summary: Object, error: string }>}
 */
export async function getExtractionJobStatus(jobId) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/extraction-jobs/${jobId}`, {
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to fetch extraction job status.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 18. Delete ONLY pending skill evidence rows for a document.
 * @param {number} documentId
 * @returns {Promise<{ success: boolean, message: string, deleted_count: number, document_id: number }>}
 */
export async function deletePendingEvidence(documentId) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${API_BASE}/api/admin/industry-documents/${documentId}/pending-evidence`,
    {
      method: 'DELETE',
      headers,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to delete pending evidence.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}



/**
 * 19B. Retrieve complete page-wise extracted text and deterministic occupations (Part 3).
 * GET /api/admin/industry-documents/{document_id}/extraction-preview
 */
export async function getDocumentExtractionPreview(documentId) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${API_BASE}/api/admin/industry-documents/${documentId}/extraction-preview`,
    {
      headers,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to extract text and occupations.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 19C. Atomically validate, upsert, and associate edited occupations (Part 3).
 * POST /api/admin/industry-documents/{document_id}/occupations/save-batch
 */
export async function saveDocumentOccupationsBatch(documentId, occupations) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${API_BASE}/api/admin/industry-documents/${documentId}/occupations/save-batch`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ occupations }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to save occupations.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

/**
 * 19D. Transactionally save administrator-reviewed skills and supporting evidence (Part 5).
 * POST /api/admin/industry-documents/{document_id}/save-skills
 * @param {number} documentId
 * @param {Array<Object>} skills
 * @returns {Promise<{ success: boolean, message: string, document_id: number, new_skills_created: number, reused_skills_count: number, evidence_inserted: number, duplicates_skipped: number }>}
 */
export async function saveDocumentSkills(documentId, skills) {
  const accessToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${API_BASE}/api/admin/industry-documents/${documentId}/save-skills`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ skills }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || data.message || 'Failed to save skills and evidence.';
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  return data;
}

