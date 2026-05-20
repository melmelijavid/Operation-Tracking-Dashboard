const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// All requests are credentialed so the browser sends/accepts the httpOnly
// session cookie. The token never lives in JS — it's set and cleared by the
// server via Set-Cookie / clearCookie.
export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  // For FormData uploads, let fetch set Content-Type with the multipart
  // boundary itself. Setting application/json here would break the upload.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!headers.has('Content-Type') && options.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const err = new Error(data?.message || 'API request failed.');
    err.status = response.status;
    throw err;
  }

  return data;
}
