import { ApiError, clearSession, ensureSession } from './api.js';
import { loadDashboard, setActiveCase, state } from './store.js';
import {
  brand, closeModal, focusMainHeading, icon, openModal, openPrivacyModal,
  revokeObjectUrls, setRouteProgress, toast
} from './ui.js';
import { renderWelcome } from './screens/welcome.js';
import { renderReport } from './screens/report.js';
import { renderEvidence } from './screens/evidence.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderAction } from './screens/action.js';
import { renderSupport, renderSupportStandalone } from './screens/support.js';

const app = document.getElementById('app');
let rendering = false;
let pending = false;
let unauthorisedShown = false;

const navItems = [
  { key: 'dashboard', href: '#/dashboard', label: 'My case', icon: 'grid' },
  { key: 'report', href: '#/report', label: 'Report an incident', icon: 'plus' },
  { key: 'evidence', href: '#/evidence', label: 'Evidence review', icon: 'file' },
  { key: 'action', href: '#/action', label: 'Take action', icon: 'arrow-right' },
  { key: 'support', href: '#/support', label: 'Emotional support', icon: 'heart' }
];

const mobileItems = [
  { key: 'welcome', href: '#/', label: 'Home', icon: 'home' },
  { key: 'report', href: '#/report', label: 'Report', icon: 'plus' },
  { key: 'dashboard', href: '#/dashboard', label: 'My case', icon: 'grid' },
  { key: 'action', href: '#/action', label: 'Act', icon: 'arrow-right' },
  { key: 'support', href: '#/support', label: 'Support', icon: 'heart' }
];

function routeFromHash() {
  const raw = (location.hash || '#/').replace(/^#/, '');
  const [pathPart, queryPart = ''] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const query = new URLSearchParams(queryPart);
  const name = parts[0] || 'welcome';
  const params = { id: parts[1] || null };
  if (name === 'evidence' && !params.id && query.get('incident')) params.id = query.get('incident');
  return { name, params, query, path: pathPart || '/' };
}

function shell(active, dashboard) {
  const info = dashboard?.caseInfo;
  const counts = dashboard?.incidents?.length || 0;
  const percent = info?.progressPercent || 0;
  const caseBlock = info ? `
    <a class="sidebar-case" href="#/dashboard" style="text-decoration:none">
      <div class="sidebar-case-top">
        <span class="sidebar-case-ref">${info.reference}</span>
        <span class="badge badge-berry" style="padding:3px 7px;font-size:9px">${info.statusLabel}</span>
      </div>
      <div class="sidebar-case-title">${escapeTitle(info.title)}</div>
      <div class="sidebar-progress"><span style="width:${Math.max(percent, 2)}%"></span></div>
      <div class="sidebar-case-foot"><span>${counts} incident${counts === 1 ? '' : 's'}</span><span>${percent}% ready</span></div>
    </a>` : `
    <a class="sidebar-case" href="#/" style="text-decoration:none">
      <div class="sidebar-case-ref">No case open</div>
      <div class="sidebar-case-title">Start with what happened</div>
      <div class="sidebar-case-foot"><span>Your space is private</span></div>
    </a>`;

  const nav = navItems.map((item) => `
    <a class="side-link ${active === item.key || (active === 'welcome' && item.key === 'dashboard') ? 'active' : ''}" href="${item.href}">
      ${icon(item.icon)}<span>${item.label}</span>
    </a>`).join('');

  return `
  <div class="app-shell">
    <aside class="sidebar" aria-label="SHEild navigation">
      <div class="sidebar-brand">${brand()}</div>
      ${caseBlock}
      <nav class="side-nav">
        <a class="side-link" href="#/">${icon('home')}<span>Welcome & safety</span></a>
        <div class="side-label">Your case</div>
        ${nav}
      </nav>
      <div class="sidebar-spacer"></div>
      <div class="sidebar-support">
        ${icon('heart')}
        <h3>You do not have to do this alone.</h3>
        <p>Guided support, grounding, and resources. No judgement.</p>
        <a href="#/support">Open support ${icon('arrow-right', 'icon-sm')}</a>
      </div>
      <div class="sidebar-foot">
        <button type="button" data-privacy>${icon('lock', 'icon-sm')} Privacy & data</button>
        <span>v1.0</span>
      </div>
    </aside>

    <div class="main-shell">
      <header class="mobile-topbar">
        ${brand()}
        <div class="top-actions">
          ${info ? `<span class="case-ref-sm">${info.reference}</span>` : ''}
          <a class="btn btn-icon" href="#/support" aria-label="Open emotional support">${icon('heart')}</a>
        </div>
      </header>
      <main id="main" class="content" tabindex="-1">
        <div class="page-loader" role="status"><div class="spinner"></div><span>Opening your private space…</span></div>
      </main>
      <nav class="mobile-bottom-nav" aria-label="Primary mobile navigation">
        ${mobileItems.map((item) => `<a href="${item.href}" class="${active === item.key ? 'active' : ''}" ${active === item.key ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.label}</span></a>`).join('')}
      </nav>
    </div>
  </div>`;
}

function escapeTitle(value) {
  return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function bindShell() {
  document.querySelectorAll('[data-privacy]').forEach((btn) => {
    btn.addEventListener('click', openPrivacyModal);
  });
}

function handleUnauthorised() {
  if (unauthorisedShown) return;
  unauthorisedShown = true;
  openModal({
    title: 'This access session is no longer recognised',
    subtitle: 'No saved information has been exposed.',
    body: `<p>SHEild could not verify the private access token stored in this browser. This can happen if the browser was cleared, the database was reset, or the session belongs to another device.</p>
      <p>Starting again creates a new anonymous session. Existing cases will not be visible unless you still have their original browser access token.</p>`,
    footer: `<button type="button" class="btn btn-secondary" data-modal-close>Stay here</button>
      <button type="button" class="btn btn-primary" id="restart-session">Start a new private session</button>`,
    onMount(host, close) {
      host.querySelector('#restart-session').addEventListener('click', () => {
        clearSession();
        location.hash = '#/';
        location.reload();
      });
    }
  });
}

function renderError(error) {
  const status = error instanceof ApiError ? error.status : 500;
  const title = status === 404 ? 'That page could not be found' : 'Something interrupted this screen';
  const message = error?.message || 'SHEild could not load this information.';
  app.innerHTML = `
    <div class="support-standalone">
      <div class="support-standalone-nav">${brand()}<a class="btn btn-secondary btn-sm" href="#/">Back to welcome</a></div>
      <div class="error-page">
        <div class="empty-icon">${icon(status === 404 ? 'search' : 'alert')}</div>
        <h1>${title}</h1>
        <p>${escapeTitle(message)}</p>
        <div class="row">
          <button type="button" class="btn btn-primary" id="retry">Try again ${icon('refresh')}</button>
          <a class="btn btn-secondary" href="#/">Go to welcome</a>
        </div>
      </div>
    </div>`;
  app.querySelector('#retry')?.addEventListener('click', () => renderRoute(true));
  focusMainHeading();
}

async function renderRoute(force = false) {
  if (rendering) { pending = true; return; }
  rendering = true;
  setRouteProgress(true);
  revokeObjectUrls();
  closeModal();
  const route = routeFromHash();

  try {
    if (route.name === 'welcome' || route.name === 'notfound') {
      const view = await renderWelcome({ navigate, reload: () => renderRoute(true), route });
      app.innerHTML = view.html;
      view.mount?.(app, { navigate, reload: () => renderRoute(true) });
      document.title = 'SHEild — Your safety. Your story. Your next step.';
      return;
    }

    if (route.name === 'support' && !state.caseId) {
      const view = await renderSupportStandalone({ navigate, route });
      app.innerHTML = view.html;
      view.mount?.(app, { navigate, reload: () => renderRoute(true) });
      document.title = 'Emotional support — SHEild';
      return;
    }

    const caseRequired = ['report', 'evidence', 'dashboard', 'action'].includes(route.name);
    if (caseRequired && !state.caseId) {
      toast('info', 'No case is open', 'Start a new case or continue one saved in this browser.');
      const view = await renderWelcome({ navigate, reload: () => renderRoute(true), route, noCase: true });
      app.innerHTML = view.html;
      view.mount?.(app, { navigate, reload: () => renderRoute(true) });
      return;
    }

    let dashboard = null;
    if (state.caseId) {
      try {
        dashboard = await loadDashboard(true);
        app.innerHTML = shell(route.name, dashboard);
        bindShell();
      } catch (err) {
        if (err.status === 404) {
          // Keep the anonymous session token: only the case reference is stale.
          setActiveCase(null);
          toast('info', 'That case is not available', 'Start a new case, or continue one saved in this browser.');
          const view = await renderWelcome({ navigate, reload: () => renderRoute(true), route });
          app.innerHTML = view.html;
          view.mount?.(app, { navigate, reload: () => renderRoute(true) });
          document.title = 'SHEild — Your safety. Your story. Your next step.';
          return;
        }
        throw err;
      }
    } else {
      app.innerHTML = shell(route.name, null);
      bindShell();
    }

    if (route.name === 'evidence' && !route.params.id && dashboard?.incidents?.length) {
      const preferred = dashboard.incidents.find((i) => i.reviewStatus !== 'REVIEWED') || dashboard.incidents[0];
      history.replaceState(null, '', `#/evidence/${preferred.id}`);
      route.params.id = String(preferred.id);
    }

    const main = document.getElementById('main');
    const ctx = {
      navigate,
      reload: () => renderRoute(true),
      dashboard,
      route
    };

    let view;
    if (route.name === 'report') view = await renderReport(ctx);
    else if (route.name === 'evidence') view = await renderEvidence(ctx);
    else if (route.name === 'dashboard') view = await renderDashboard(ctx);
    else if (route.name === 'action') view = await renderAction(ctx);
    else if (route.name === 'support') view = await renderSupport(ctx);
    else {
      throw new ApiError('That screen does not exist.', 404, null);
    }

    main.innerHTML = view.html;
    view.mount?.(main, ctx);
    const titles = {
      report: 'Report an incident', evidence: 'Evidence review', dashboard: 'My case',
      action: 'Take action', support: 'Emotional support'
    };
    document.title = `${titles[route.name] || 'SHEild'} — SHEild`;
  } catch (err) {
    if (err?.status === 401) {
      handleUnauthorised();
    } else {
      console.error(err);
      renderError(err);
    }
  } finally {
    rendering = false;
    setRouteProgress(false);
    if (pending) {
      pending = false;
      renderRoute(true);
    } else if (route.name !== 'welcome' && !route.query.get('focus')) {
      focusMainHeading();
    }
  }
}

export function navigate(path) {
  if (!path) return;
  const next = path.startsWith('#') ? path : `#${path}`;
  if (location.hash === next) {
    renderRoute(true);
  } else {
    location.hash = next;
  }
}

async function boot() {
  const bootEl = document.getElementById('boot');
  try {
    state.session = await ensureSession();
    bootEl?.classList.add('is-hidden');
    window.addEventListener('hashchange', () => renderRoute(true));
    window.addEventListener('sheild:unauthorized', handleUnauthorised);
    await renderRoute();
  } catch (err) {
    console.error(err);
    bootEl?.classList.add('is-hidden');
    app.innerHTML = `
      <div class="support-standalone">
        <div class="support-standalone-nav">${brand()}</div>
        <div class="error-page">
          <div class="empty-icon">${icon('alert')}</div>
          <h1>SHEild could not start</h1>
          <p>${escapeTitle(err.message || 'The server is not reachable.')}</p>
          <p class="small muted">Check that the Spring Boot application and MySQL are running, then try again.</p>
          <div class="row"><button type="button" class="btn btn-primary" id="boot-retry">Try again ${icon('refresh')}</button></div>
        </div>
      </div>`;
    app.querySelector('#boot-retry')?.addEventListener('click', () => location.reload());
  }
}

boot();
