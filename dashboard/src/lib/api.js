/**
 * Lantern Dashboard — API Helper
 * 
 * Centralized fetch functions for all collector API endpoints.
 * All requests go to the collector at port 4000.
 */

const COLLECTOR_URL = process.env.NEXT_PUBLIC_COLLECTOR_URL || 'http://localhost:4000';

/**
 * Get the stored JWT token.
 */
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lantern_token');
}

/**
 * Generic GET request to the collector API.
 * Automatically attaches JWT if available.
 */
async function fetchAPI(path, params = {}) {
  const url = new URL(path, COLLECTOR_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value);
  });

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url.toString(), {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000), // Never hang forever — 10s max
    });
  } catch (err) {
    // TypeError = network error (server down, CORS, DNS fail)
    // AbortError = our timeout fired
    const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError';
    const networkErr = new Error(
      isTimeout
        ? 'Collector did not respond in time. It may be restarting.'
        : 'Cannot reach collector. Check that it is running.'
    );
    networkErr.isNetworkError = true;
    throw networkErr;
  }

  if (response.status === 401) {
    // Token expired or invalid — clear and redirect
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lantern_token');
      localStorage.removeItem('lantern_user');
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generic mutation request (POST/PUT/DELETE).
 * Automatically attaches JWT if available.
 */
async function mutateAPI(path, method = 'POST', body = null, params = {}) {
  const url = new URL(path, COLLECTOR_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value);
  });

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
    signal: AbortSignal.timeout(10000), // Never hang forever — 10s max
  };
  if (body) options.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(url.toString(), options);
  } catch (err) {
    const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError';
    const networkErr = new Error(
      isTimeout
        ? 'Request timed out. The server may be temporarily unavailable.'
        : 'Cannot reach server. Please check your connection and try again.'
    );
    networkErr.isNetworkError = true;
    throw networkErr;
  }

  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('lantern_token');
    localStorage.removeItem('lantern_user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `API error: ${response.status}`);
  }
  return response.json();
}



export function getOverviewStats(projectId, range = '-24h') {
  return fetchAPI('/api/metrics/overview', { projectId, range });
}

export function getRPMData(projectId, range = '-30m') {
  return fetchAPI('/api/metrics/rpm', { projectId, range });
}

export function getResponseTimeData(projectId, range = '-30m') {
  return fetchAPI('/api/metrics/response-time', { projectId, range });
}

export function getLatencyPercentiles(projectId, range = '-30m') {
  return fetchAPI('/api/metrics/latency-percentiles', { projectId, range });
}

export function getApdexScore(projectId, range = '-24h', targetMs = 200) {
  return fetchAPI('/api/metrics/apdex', { projectId, range, targetMs });
}

export function getEndpoints(projectId, range = '-24h') {
  return fetchAPI('/api/metrics/endpoints', { projectId, range });
}

export function getErrors(projectId, range = '-24h', endpoint = null, statusCode = null) {
  return fetchAPI('/api/metrics/errors', { projectId, range, endpoint, statusCode });
}

export function getSystemMetrics(projectId, range = '-24h') {
  return fetchAPI('/api/metrics/system', { projectId, range });
}

// ── Alerts API functions ──

export function getAlertRules(projectId) {
  return fetchAPI('/api/alerts', { projectId });
}

export function createAlertRule(projectId, rule) {
  return mutateAPI('/api/alerts', 'POST', { ...rule, projectId }, { projectId });
}

export function updateAlertRule(projectId, ruleId, updates) {
  return mutateAPI(`/api/alerts/${ruleId}`, 'PUT', updates, { projectId });
}

export function deleteAlertRule(projectId, ruleId) {
  return mutateAPI(`/api/alerts/${ruleId}`, 'DELETE', null, { projectId });
}

export function getAlertHistory(projectId, limit = 50) {
  return fetchAPI('/api/alerts/history', { projectId, limit });
}

// ── Auth API functions ──

export function registerUser(name, email, password) {
  return mutateAPI('/api/auth/register', 'POST', { name, email, password });
}

export function loginUser(email, password) {
  return mutateAPI('/api/auth/login', 'POST', { email, password });
}

export function getMe() {
  return fetchAPI('/api/auth/me');
}

/**
 * Authenticate with Google.
 * credential — the ID token string from @react-oauth/google's onSuccess callback.
 * Returns { token, user } just like loginUser().
 */
export function googleAuth(credential) {
  return mutateAPI('/api/auth/google', 'POST', { credential });
}

// ── Projects API functions ──

export function getProjects() {
  return fetchAPI('/api/projects');
}

export function createProject(name) {
  return mutateAPI('/api/projects', 'POST', { name });
}

export function deleteProject(projectId) {
  return mutateAPI(`/api/projects/${projectId}`, 'DELETE');
}

export function regenerateProjectKey(projectId) {
  return mutateAPI(`/api/projects/${projectId}/regenerate-key`, 'POST');
}
