const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE[ch]);
}

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

export function brandMark(cls = 'brand-mark') {
  return `<svg class="${cls}" viewBox="0 0 48 54" aria-hidden="true">
    <path d="M24 2.5 45 11v15.5c0 11.8-8.8 20.6-21 25C11.8 47.1 3 38.3 3 26.5V11L24 2.5Z" fill="currentColor"/>
    <path d="M23.5 15c-6 0-9.2 3.3-9.2 7.1 0 4.5 5.8 4.8 9.1 5.7 3.3.9 6.3 1.8 6.3 5.1 0 3.5-3.8 5.4-7.5 5.4-3.6 0-6.8-1.5-8.4-3.9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="36" cy="13" r="2.2" fill="#F5C84B"/>
  </svg>`;
}

export function brand({ large = false, tagline = false } = {}) {
  return `<a class="brand ${large ? 'brand-large' : ''}" href="#/" aria-label="SHEild home">
    ${brandMark()}
    <span>
      <span class="brand-word">SH<em>E</em>ild</span>
      ${tagline ? '<span class="brand-sub">Your safety. Your story.</span>' : ''}
    </span>
  </a>`;
}

export function formatDate(iso, opts = {}) {
  if (!iso) return 'Date not provided';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date not provided';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', ...opts
  }).format(date);
}

export function formatDateTime(iso) {
  if (!iso) return 'Date and time not provided';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date and time not provided';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(date);
}

export function formatTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function timeAgo(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.round(seconds / 86400)} day${Math.round(seconds / 86400) === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

export function toLocalInputValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(value) {
  if (!value) return 'S';
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function safeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function reviewStatus(status) {
  if (status === 'REVIEWED') return { label: 'Reviewed', cls: 'status-reviewed' };
  if (status === 'NEEDS_REVIEW') return { label: 'Needs review', cls: 'status-review' };
  return { label: 'Draft', cls: 'status-draft' };
}

export function reviewBadge(status) {
  const state = reviewStatus(status);
  return `<span class="status-pill ${state.cls}"><span class="dot"></span>${state.label}</span>`;
}

export function toast(type, title, message = '', timeout = 5200) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type === 'danger' ? 'error' : type}`;
  const iconName = type === 'success' ? 'check-circle' : type === 'danger' || type === 'error' ? 'alert' : 'sparkle';
  el.innerHTML = `
    <span class="toast-icon">${icon(iconName)}</span>
    <span class="toast-body"><strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}</span>
    <button type="button" aria-label="Dismiss notification">${icon('x')}</button>`;
  const remove = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 230);
  };
  el.querySelector('button').addEventListener('click', remove);
  host.appendChild(el);
  if (timeout > 0) setTimeout(remove, timeout);
}

const CONTINUE_FLASH_KEY = 'sheild.continueFlash';

export function continueBanner({ title, message = '', label = 'Continue to my case', href = '#/dashboard', scrollTarget = '' } = {}) {
  return `<section class="continue-panel">
    <span class="continue-icon">${icon('check-circle')}</span>
    <div class="continue-copy">
      <span class="continue-kicker">Case update complete</span>
      <strong>${escapeHtml(title || 'Update saved')}</strong>
      ${message ? `<span>${escapeHtml(message)}</span>` : ''}
    </div>
    <a class="btn btn-primary continue-action" href="${escapeHtml(href)}"${scrollTarget ? ` data-continue-scroll="${escapeHtml(scrollTarget)}"` : ''}>
      ${escapeHtml(label)} ${icon('arrow-right')}
    </a>
  </section>`;
}

export function continueSlot(flash = null) {
  return `<div class="continue-slot" id="continue-slot" aria-live="polite">${flash ? continueBanner(flash) : ''}</div>`;
}

export function mountContinue(root, flash = null) {
  const slot = root.querySelector('#continue-slot');
  if (!slot) return;
  if (flash && !slot.querySelector('.continue-panel')) {
    slot.innerHTML = continueBanner(flash);
  }
  bindContinueLinks(slot);
}

export function showContinue(root, options) {
  const slot = root.querySelector('#continue-slot');
  if (!slot) return;
  slot.innerHTML = continueBanner(options);
  bindContinueLinks(slot);
}

export function clearContinue(root) {
  const slot = root.querySelector('#continue-slot');
  if (slot) slot.innerHTML = '';
}

function bindContinueLinks(slot) {
  slot.querySelectorAll('[data-continue-scroll]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.getElementById(link.dataset.continueScroll);
      const href = link.getAttribute('href');
      if (target && (!href || href === location.hash)) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });
}

export function queueContinue(flash) {
  try {
    sessionStorage.setItem(CONTINUE_FLASH_KEY, JSON.stringify(flash));
  } catch { /* storage may be unavailable */ }
}

export function takeContinue() {
  try {
    const raw = sessionStorage.getItem(CONTINUE_FLASH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CONTINUE_FLASH_KEY);
    const parsed = JSON.parse(raw);
    return parsed && parsed.title ? parsed : null;
  } catch {
    return null;
  }
}

export function setBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.classList.add('is-loading');
    button.disabled = true;
    if (label && !button.dataset.originalLabel) {
      button.dataset.originalLabel = button.innerHTML;
      button.innerHTML = `<span class="btn-label">${escapeHtml(label)}</span>`;
    }
  } else {
    button.classList.remove('is-loading');
    button.disabled = false;
    if (button.dataset.originalLabel) {
      button.innerHTML = button.dataset.originalLabel;
      delete button.dataset.originalLabel;
    }
  }
}

export function openModal({ title, subtitle = '', body = '', footer = '', wide = false, onMount }) {
  const dialog = document.getElementById('modal');
  const host = document.getElementById('modal-content');
  if (!dialog || !host) return null;
  host.innerHTML = `
    <div class="modal-inner" ${wide ? 'style="width:min(680px, calc(100vw - 30px))"' : ''}>
      <div class="modal-head">
        <div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div>
        <button type="button" class="modal-close" data-modal-close aria-label="Close dialog">${icon('x')}</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">${footer}</div>
    </div>`;
  const close = () => { if (dialog.open) dialog.close(); };
  host.querySelectorAll('[data-modal-close]').forEach((btn) => btn.addEventListener('click', close));
  dialog.onclick = (event) => {
    if (event.target === dialog) close();
  };
  dialog.oncancel = () => { /* allow native close */ };
  if (!dialog.open) dialog.showModal();
  if (onMount) onMount(host, close, dialog);
  return { dialog, close, host };
}

export function closeModal() {
  const dialog = document.getElementById('modal');
  if (dialog && dialog.open) dialog.close();
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: `<p>${escapeHtml(message)}</p>`,
      footer: `<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHtml(confirmLabel)}</button>`,
      onMount(host, close) {
        const finish = (value) => { close(); resolve(value); };
        host.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
        host.querySelector('[data-confirm]').addEventListener('click', async () => {
          if (onConfirm) {
            const btn = host.querySelector('[data-confirm]');
            btn.disabled = true;
            try { await onConfirm(); finish(true); } catch { btn.disabled = false; }
          } else {
            finish(true);
          }
        });
      }
    });
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    textarea.remove();
    return ok;
  }
}

export function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function setFieldError(field, message) {
  if (!field) return;
  const error = document.querySelector(`[data-error-for="${field.id}"]`);
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (error) {
    error.textContent = message || '';
    error.classList.toggle('is-visible', Boolean(message));
  }
}

export function clearFormErrors(form) {
  form.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
    el.classList.remove('is-visible');
  });
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
}

export function debounce(fn, delay = 400) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function emptyState({ iconName = 'shield', title, body, actionLabel, actionId, secondaryLabel, secondaryId }) {
  return `<div class="empty-state">
    <div class="empty-icon">${icon(iconName)}</div>
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(body)}</p>
    ${actionLabel ? `<button type="button" class="btn btn-primary" id="${actionId || 'empty-action'}">${escapeHtml(actionLabel)} ${icon('arrow-right')}</button>` : ''}
    ${secondaryLabel ? `<button type="button" class="btn btn-ghost" id="${secondaryId || 'empty-secondary'}">${escapeHtml(secondaryLabel)}</button>` : ''}
  </div>`;
}

const objectUrls = new Set();

export function trackObjectUrl(url) {
  objectUrls.add(url);
}

export function revokeObjectUrls() {
  objectUrls.forEach((url) => {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  });
  objectUrls.clear();
}

export async function loadProtectedImage(path, imgEl) {
  try {
    const { fetchBlob } = await import('./api.js');
    const blob = await fetchBlob(path);
    const url = URL.createObjectURL(blob);
    trackObjectUrl(url);
    imgEl.src = url;
    imgEl.classList.remove('hidden');
    const placeholder = imgEl.parentElement.querySelector('.thumb-loading');
    if (placeholder) placeholder.remove();
  } catch {
    const holder = imgEl.parentElement;
    if (holder) holder.innerHTML = icon('alert');
  }
}

export function openPrivacyModal() {
  openModal({
    title: 'Privacy and access',
    subtitle: 'How SHEild stores what you share — in this prototype.',
    body: `
      <div class="stack">
        <p><strong>What is stored.</strong> Your case, incident details, evidence metadata and files, links, report drafts, checklist progress, and the summaries you confirm are stored in this application's MySQL database and local evidence folder.</p>
        <p><strong>Who can open it.</strong> This build uses an anonymous access token kept in this browser. It is not a full user account. Anyone using this browser profile may be able to open the case; clearing browser data will remove your access. There is no password recovery.</p>
        <p><strong>How evidence is protected.</strong> Evidence files are stored outside the public web folder and served only after the access token is checked. Files are not end-to-end encrypted, and this is not production-grade secure storage.</p>
        <p><strong>What SHEild never does.</strong> It does not send your evidence to platforms, police, or authorities. It does not use an external AI provider in this build. Automatic OCR is not configured.</p>
        <p><strong>Your choices.</strong> You can delete individual evidence items or delete the entire case. Deleting a case removes its incidents, links, drafts, checklist, and evidence files from this application.</p>
        <div class="modal-note">Prototype limitation: authentication, encryption at rest, audit logging, and multi-device recovery are not implemented. Please use synthetic or non-sensitive material when exploring this hackathon build.</div>
      </div>`,
    footer: `<button type="button" class="btn btn-primary" data-modal-close>I understand</button>`
  });
}

export function setRouteProgress(active) {
  const bar = document.getElementById('route-progress');
  if (bar) bar.classList.toggle('is-active', active);
}

export function focusMainHeading() {
  const heading = document.querySelector('#main h1') || document.querySelector('#main h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
}
