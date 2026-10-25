import { api, rememberCase, storedCaseId } from './api.js';

export const state = {
  session: null,
  caseId: storedCaseId(),
  dashboard: null,
  support: {
    feeling: null,
    entries: [],
    response: null,
    associate: false
  }
};

export function setActiveCase(caseId) {
  state.caseId = caseId || null;
  rememberCase(caseId);
  if (!caseId) state.dashboard = null;
}

export async function loadDashboard(force = false) {
  if (!state.caseId) return null;
  if (!force && state.dashboard && state.dashboard.caseInfo && state.dashboard.caseInfo.id === state.caseId) {
    return state.dashboard;
  }
  const data = await api(`/api/cases/${state.caseId}/dashboard`);
  state.dashboard = data;
  return data;
}

export async function createCase(title) {
  const created = await api('/api/cases', {
    method: 'POST',
    body: { title: title || null }
  });
  setActiveCase(created.id);
  state.dashboard = null;
  return created;
}

export async function listCases() {
  return api('/api/cases');
}

export async function fetchSummaryText(caseId) {
  const { fetchBlob } = await import('./api.js');
  const blob = await fetchBlob(`/api/cases/${caseId}/summary`);
  return blob.text();
}

export function clearActiveCase() {
  setActiveCase(null);
}
