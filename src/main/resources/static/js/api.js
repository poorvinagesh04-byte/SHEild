const TOKEN_KEY = 'sheild.accessToken';
const CASE_KEY = 'sheild.caseId';

let token = localStorage.getItem(TOKEN_KEY) || null;

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.fieldErrors = body && body.fieldErrors ? body.fieldErrors : null;
  }
}

export function authToken() {
  return token;
}

export function storedCaseId() {
  const value = Number(localStorage.getItem(CASE_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function rememberCase(caseId) {
  if (caseId) localStorage.setItem(CASE_KEY, String(caseId));
  else localStorage.removeItem(CASE_KEY);
}

export function clearSession() {
  token = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CASE_KEY);
}

function setToken(value) {
  token = value;
  localStorage.setItem(TOKEN_KEY, value);
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function api(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = options.body;
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body,
      signal: options.signal
    });
  } catch (err) {
    if (err && err.name === 'AbortError') throw err;
    throw new ApiError('SHEild could not reach the server. Check your connection and try again.', 0, null);
  }
  const parsed = await parseResponse(res);
  if (!res.ok) {
    const message = parsed && parsed.message
      ? parsed.message
      : `The request could not be completed (${res.status}).`;
    if (res.status === 401 && !path.startsWith('/api/session')) {
      window.dispatchEvent(new CustomEvent('sheild:unauthorized'));
    }
    throw new ApiError(message, res.status, parsed);
  }
  return parsed;
}

export async function ensureSession() {
  if (token) {
    try {
      const me = await api('/api/session/me');
      return me;
    } catch (err) {
      if (err.status === 401) {
        clearSession();
      } else {
        throw err;
      }
    }
  }
  const created = await api('/api/session', {
    method: 'POST',
    body: { displayName: null }
  });
  if (!created || !created.token) throw new ApiError('SHEild could not start a private session.', 500, null);
  setToken(created.token);
  return created;
}

export async function fetchBlob(path) {
  let res;
  try {
    res = await fetch(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  } catch {
    throw new ApiError('The file could not be loaded.', 0, null);
  }
  if (!res.ok) {
    let parsed = null;
    try { parsed = await res.json(); } catch { /* ignore */ }
    throw new ApiError(parsed?.message || 'The file could not be loaded.', res.status, parsed);
  }
  return res.blob();
}

export async function downloadBlob(path, filename) {
  const blob = await fetchBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function uploadEvidence(incidentId, file, note, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/incidents/${incidentId}/evidence`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener('load', () => {
      let body = null;
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve(body);
      } else {
        if (xhr.status === 401) window.dispatchEvent(new CustomEvent('sheild:unauthorized'));
        reject(new ApiError(body?.message || 'The file could not be uploaded.', xhr.status, body));
      }
    });
    xhr.addEventListener('error', () => {
      reject(new ApiError('The upload was interrupted. Check your connection and try again.', 0, null));
    });
    xhr.addEventListener('abort', () => {
      reject(new ApiError('The upload was cancelled.', 0, null));
    });
    const form = new FormData();
    form.append('file', file);
    if (note) form.append('note', note);
    xhr.send(form);
  });
}
