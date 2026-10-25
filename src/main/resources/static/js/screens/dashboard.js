import { api, downloadBlob } from '../api.js';
import { setActiveCase } from '../store.js';
import {
  continueSlot, escapeHtml, formatBytes, formatDate, formatDateTime, icon, confirmDialog,
  loadProtectedImage, mountContinue, openModal, queueContinue, reviewBadge, setBusy, takeContinue, timeAgo, toast
} from '../ui.js';

function safeUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch { return null; }
}

function hostOf(value) {
  try { return new URL(value).host; } catch { return 'link'; }
}

function connectionStatus(status) {
  if (status === 'CONFIRMED') return { label: 'Confirmed by you', cls: 'badge-success' };
  if (status === 'DISMISSED') return { label: 'Dismissed', cls: '' };
  return { label: 'Suggested', cls: 'badge-warn' };
}

function continueTarget(progress) {
  const route = progress?.nextStepRoute;
  return route && route !== '#/dashboard' ? route : '#/action';
}

function continueLabel(target) {
  return target === '#/dashboard' ? 'Continue to my case' : 'Continue to next step';
}

function ring(percent) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return `
    <div class="progress-ring" aria-label="${percent}% of this case's steps are complete" role="img">
      <svg width="106" height="106" viewBox="0 0 106 106" aria-hidden="true">
        <circle class="ring-bg" cx="53" cy="53" r="${radius}" fill="none" stroke-width="8"></circle>
        <circle class="ring-fg" cx="53" cy="53" r="${radius}" fill="none" stroke-width="8"
          stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>
      </svg>
      <div class="ring-label"><strong>${percent}%</strong><span>steps ready</span></div>
    </div>`;
}

function heroMenu(id) {
  return `
    <div class="hero-menu">
      <button type="button" class="btn btn-icon" id="${id}" aria-label="Case options" aria-haspopup="dialog">${icon('more')}</button>
    </div>`;
}

function emptyTimeline() {
  return `
    <div class="empty-mini" style="padding:28px 20px">
      <div class="empty-icon" style="width:48px;height:48px;border-radius:16px;background:var(--berry-soft);color:var(--berry);display:grid;place-items:center;margin:0 auto 12px">${icon('note')}</div>
      <strong style="display:block;font-size:13px;color:var(--ink)">No incidents documented yet</strong>
      <span style="display:block;margin-top:5px">Start with what you remember. A short description and the platform are enough to begin.</span>
      <a class="btn btn-primary btn-sm" href="#/report" style="margin-top:13px">Report an incident ${icon('arrow-right')}</a>
    </div>`;
}

function timelineItem(incident) {
  const dateLabel = incident.occurredAt ? formatDate(incident.occurredAt) : 'Date not provided';
  const summary = incident.confirmedSummary || incident.suggestedSummary || incident.description;
  return `
    <article class="timeline-item">
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-card">
        <div class="timeline-head">
          <div>
            <div class="timeline-date">${icon('calendar')} ${escapeHtml(dateLabel)}</div>
            <h3>${escapeHtml(incident.incidentTypeLabel)}</h3>
            <div class="timeline-meta">
              <span class="tag">${escapeHtml(incident.platformLabel)}</span>
              ${reviewBadge(incident.reviewStatus)}
              <span class="tag">${incident.evidenceCount} file${incident.evidenceCount === 1 ? '' : 's'}</span>
              <span class="tag">${(incident.urls || []).length} link${(incident.urls || []).length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
        ${summary ? `<p class="timeline-summary">${escapeHtml(summary)}</p>` : ''}
        <div class="timeline-foot">
          <span class="timeline-foot-meta">${icon('clock')} recorded ${escapeHtml(timeAgo(incident.createdAt))}</span>
          <a class="btn btn-ghost btn-xs" href="#/report?incident=${incident.id}">${icon('pencil')} Edit</a>
          <a class="btn btn-soft btn-xs" href="#/evidence/${incident.id}">
            ${incident.reviewStatus === 'REVIEWED' ? 'View review' : 'Review now'} ${icon('arrow-right')}
          </a>
        </div>
      </div>
    </article>`;
}

function connectionCard(connection) {
  const state = connectionStatus(connection.status);
  return `
    <div class="connection-card ${connection.status === 'CONFIRMED' ? 'confirmed' : ''}" data-connection="${connection.id}">
      <div class="connection-top">
        <span class="connection-basis">${escapeHtml(connection.basisLabel)}</span>
        <span class="badge ${state.cls}">${escapeHtml(state.label)}</span>
      </div>
      <p>${escapeHtml(connection.reason)}</p>
      ${connection.status === 'SUGGESTED' ? `
        <div class="connection-actions">
          <button type="button" class="btn btn-primary" data-connection-confirm="${connection.id}">${icon('check')} This is relevant</button>
          <button type="button" class="btn btn-secondary" data-connection-dismiss="${connection.id}">Dismiss</button>
        </div>` : `
        <div class="connection-actions">
          <span class="tiny muted">${connection.status === 'CONFIRMED' ? 'You marked this as relevant. It is still not proof of identity.' : 'You chose not to use this suggestion.'}</span>
          ${connection.status === 'CONFIRMED'
            ? `<button type="button" class="btn btn-ghost" data-connection-dismiss="${connection.id}">Undo</button>`
            : `<button type="button" class="btn btn-ghost" data-connection-confirm="${connection.id}">Mark relevant</button>`}
        </div>`}
    </div>`;
}

export async function renderDashboard(ctx) {
  const { dashboard } = ctx;
  const continueFlash = takeContinue();
  const info = dashboard.caseInfo;
  const incidents = dashboard.incidents || [];
  const evidence = dashboard.evidence || [];
  const urls = dashboard.urls || [];
  const connections = dashboard.connections || [];
  const checklist = dashboard.checklist || [];
  const drafts = dashboard.drafts || [];
  const progress = dashboard.progress || {};
  const percent = info.progressPercent || 0;
  const evidenceIncident = incidents.find((item) => item.reviewStatus !== 'REVIEWED') || incidents[0];
  const evidenceRoute = evidenceIncident ? `#/evidence/${evidenceIncident.id}` : '#/report';
  const suggested = connections.filter((item) => item.status === 'SUGGESTED');
  const confirmedConnections = connections.filter((item) => item.status === 'CONFIRMED');
  const dismissed = connections.filter((item) => item.status === 'DISMISSED');
  const latestDraft = drafts[0];
  const doneCount = checklist.filter((item) => item.done).length;

  const html = `
  <div class="dashboard-page">
  <div class="case-hero">
    ${heroMenu('case-menu')}
    <div class="case-hero-main">
      <span class="case-hero-ref">${icon('file', 'icon-sm')} Case ${escapeHtml(info.reference)}</span>
      <h1>${escapeHtml(info.title)}</h1>
      <div class="case-hero-sub">
        <span class="badge">${escapeHtml(info.statusLabel)}</span>
        <span>Created ${escapeHtml(formatDate(info.createdAt))}</span>
        <span class="dot-sep" aria-hidden="true"></span>
        <span>Updated ${escapeHtml(timeAgo(info.updatedAt))}</span>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><strong>${incidents.length}</strong><span>Incident${incidents.length === 1 ? '' : 's'}</span></div>
        <div class="hero-stat"><strong>${evidence.length}</strong><span>Evidence item${evidence.length === 1 ? '' : 's'}</span></div>
        <div class="hero-stat"><strong>${info.reviewedIncidentCount}</strong><span>Reviewed</span></div>
        <div class="hero-stat"><strong>${doneCount}/${checklist.length}</strong><span>Steps done</span></div>
      </div>
    </div>
    <div class="case-hero-side">
      ${ring(percent)}
      <div class="hero-next">
        <span class="eyebrow">Suggested next step</span>
        <h3>${escapeHtml(progress.nextStep || 'Keep going at your pace')}</h3>
        <p>SHEild suggests — you decide. Nothing happens without you.</p>
        <a class="btn" href="${escapeHtml(progress.nextStepRoute || '#/dashboard')}">Continue ${icon('arrow-right')}</a>
      </div>
    </div>
  </div>

  <div class="quick-actions" aria-label="Quick actions">
    <a class="quick-action" href="#/report">${icon('plus')} <span>Report new incident</span></a>
    <a class="quick-action" href="${evidenceRoute}">${icon('upload')} <span>Add evidence</span></a>
    <a class="quick-action" href="#/action">${icon('note')} <span>Prepare a report</span></a>
    <a class="quick-action" href="#/support">${icon('heart')} <span>Open support</span></a>
    <button type="button" class="quick-action" id="download-summary">${icon('download')} <span>Download summary</span></button>
  </div>

  ${continueSlot(continueFlash)}

  <div class="dash-grid">
    <div class="dash-main">
      <section class="card">
        <div class="card-head row-between">
          <div>
            <span class="eyebrow"><span class="dot"></span> The record so far</span>
            <h2 class="card-title">Your timeline</h2>
            <p class="card-sub">Every incident you have documented, in the order it was saved.</p>
          </div>
          <a class="btn btn-secondary btn-sm" href="#/report">${icon('plus')} Add another</a>
        </div>
        ${incidents.length ? `<div class="timeline">${incidents.map(timelineItem).join('')}</div>` : emptyTimeline()}
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <span class="eyebrow"><span class="dot"></span> Possible patterns</span>
            <h2 class="card-title">Connections between incidents</h2>
            <p class="card-sub">These are similarities found in the links and details you documented. They are suggestions, not conclusions, and never identify a person.</p>
          </div>
        </div>
        ${suggested.length ? suggested.map(connectionCard).join('') : ''}
        ${!suggested.length ? `
          <div class="empty-mini">
            ${incidents.length < 2
              ? 'Connections become available when you have documented at least two incidents.'
              : 'No new similarities were found in the details currently saved. You can still review your records and add more context.'}
          </div>` : ''}
        ${confirmedConnections.length ? `
          <h4 class="tiny muted" style="text-transform:uppercase;letter-spacing:.08em;margin:18px 0 8px">Confirmed by you</h4>
          ${confirmedConnections.map(connectionCard).join('')}` : ''}
        ${dismissed.length ? `
          <details style="margin-top:14px">
            <summary class="text-link tiny" style="cursor:pointer">${dismissed.length} dismissed suggestion${dismissed.length === 1 ? '' : 's'}</summary>
            <div style="margin-top:9px">${dismissed.map(connectionCard).join('')}</div>
          </details>` : ''}
      </section>

      <section class="card">
        <div class="card-head row-between">
          <div>
            <span class="eyebrow"><span class="dot"></span> Original files</span>
            <h2 class="card-title">Evidence library</h2>
            <p class="card-sub">${evidence.length ? `${evidence.length} item${evidence.length === 1 ? '' : 's'} kept privately.` : 'No files stored yet.'} Originals are never edited by SHEild.</p>
          </div>
          <a class="btn btn-ghost btn-sm" href="${evidenceRoute}">Open review ${icon('arrow-right')}</a>
        </div>
        ${evidence.length ? `
          <div class="evidence-mini-grid">
            ${evidence.slice(0, 4).map((item) => `
              <a class="evidence-mini" href="#/evidence/${item.incidentId}">
                <div class="evidence-mini-thumb" data-mini-thumb="${item.id}">
                  ${item.image ? '<span class="thumb-loading"></span>' : icon(item.text ? 'note' : 'file')}
                </div>
                <div class="evidence-mini-info">
                  <strong>${escapeHtml(item.originalFilename)}</strong>
                  <span>${formatBytes(item.fileSize)} · ${escapeHtml(item.processingLabel)}</span>
                </div>
              </a>`).join('')}
          </div>
          ${evidence.length > 4 ? `<p class="side-note">${icon('file')} Showing 4 of ${evidence.length}. Open evidence review for the full library.</p>` : ''}` : `
          <div class="empty-mini">Screenshots, PDFs, and text files can be kept with each incident. You can also leave evidence out entirely — that is your choice.</div>`}
      </section>
    </div>

    <aside class="dash-side">
      <section class="card card-pad">
        <div class="row-between">
          <h2 class="card-title">Next steps</h2>
          <span class="badge">${doneCount}/${checklist.length}</span>
        </div>
        <div class="mini-progress">
          <div class="mini-progress-head"><span>Your action checklist</span><span>${percent}%</span></div>
          <div class="progress-track"><span style="width:${percent}%"></span></div>
        </div>
        <div class="checklist-mini">
          ${checklist.map((item) => `
            <a class="checklist-mini-row ${item.done ? 'done' : ''}" href="#/action" style="text-decoration:none">
              <span class="mini-check ${item.done ? 'done' : ''}">${item.done ? icon('check') : ''}</span>
              <span>${escapeHtml(item.label)}</span>
            </a>`).join('')}
        </div>
        <a class="btn btn-secondary btn-sm btn-block" href="#/action" style="margin-top:14px">Open take action ${icon('arrow-right')}</a>
      </section>

      <section class="card card-pad">
        <div class="card-head">
          <div>
            <h2 class="card-title">Report draft</h2>
            <p class="card-sub">Editable, unsubmitted, and entirely in your control.</p>
          </div>
        </div>
        ${latestDraft ? `
          <div class="next-step-box" style="margin-top:0">
            <span class="tiny">Latest draft · not submitted</span>
            <p>${escapeHtml(latestDraft.title)}</p>
            <span class="tiny muted" style="text-transform:none;letter-spacing:0;color:var(--muted);font-weight:500">Saved ${escapeHtml(timeAgo(latestDraft.updatedAt))}</span>
            <a href="#/action">Open draft ${icon('arrow-right')}</a>
          </div>` : `
          <div class="empty-mini">${info.reviewedIncidentCount > 0
            ? 'Your reviewed details are ready to be arranged into an editable draft.'
            : 'Confirm an incident summary first. SHEild will only prepare a draft from wording you have reviewed.'}</div>
          <a class="btn btn-primary btn-sm btn-block" href="#/action" style="margin-top:12px">${info.reviewedIncidentCount > 0 ? 'Prepare a draft' : 'See what is needed'} ${icon('arrow-right')}</a>`}
      </section>

      <section class="card card-pad">
        <div class="card-head row-between">
          <h2 class="card-title">Documented links</h2>
          <span class="badge">${urls.length}</span>
        </div>
        ${urls.length ? `<div class="url-list-compact">
          ${urls.slice(0, 5).map((url) => {
            const safe = safeUrl(url.url);
            const body = `
              <span class="url-favicon">${icon('link')}</span>
              <span class="url-info"><strong>${escapeHtml(url.label || 'Documented link')}</strong><span>${escapeHtml(hostOf(url.url))} · ${escapeHtml(url.platformLabel || '')}</span></span>
              ${safe ? icon('external') : icon('lock')}`;
            return safe
              ? `<a class="url-compact" href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${body}</a>`
              : `<div class="url-compact">${body}</div>`;
          }).join('')}
        </div>` : `<div class="empty-mini">Links you add to an incident will appear here. SHEild never opens or contacts them for you.</div>`}
        <p class="side-note">${icon('lock')} Opening a link leaves SHEild. Only do so if it feels safe.</p>
      </section>

      <section class="card card-pad">
        <div class="card-head">
          <h2 class="card-title">Case actions</h2>
        </div>
        <div class="stack" style="gap:8px">
          <button type="button" class="btn btn-secondary btn-sm btn-block" id="download-summary-2">${icon('download')} Download case summary</button>
          <button type="button" class="btn btn-secondary btn-sm btn-block" id="rename-case">${icon('pencil')} Rename this case</button>
          <button type="button" class="btn btn-outline-danger btn-sm btn-block" id="delete-case">${icon('trash')} Delete this case</button>
        </div>
        <p class="side-note">${icon('alert')} Deleting a case removes its incidents, evidence files, links, drafts, and checklist. It cannot be undone.</p>
      </section>

      <div class="guidance-card">
        <div class="guidance-icon">${icon('heart')}</div>
        <h3>You are allowed to pause.</h3>
        <p>Looking at a record of what happened can bring a lot back. Close this screen, breathe, or use the support companion whenever you need to.</p>
        <a class="btn btn-secondary btn-sm" href="#/support" style="margin-top:12px">${icon('heart')} Open support</a>
      </div>
    </aside>
  </div>
  </div>`;

  return {
    html,
    mount(root) {
      mountContinue(root, continueFlash);
      evidence.forEach((item) => {
        if (!item.image) return;
        const thumb = root.querySelector(`[data-mini-thumb="${item.id}"]`);
        if (!thumb) return;
        const img = document.createElement('img');
        img.alt = `Preview of ${item.originalFilename}`;
        img.className = 'hidden';
        thumb.appendChild(img);
        loadProtectedImage(item.fileUrl, img);
      });

      async function downloadSummary(button) {
        setBusy(button, true, 'Preparing…');
        try {
          await downloadBlob(`/api/cases/${info.id}/summary`, `SHEild-case-${info.reference}.txt`);
          toast('success', 'Summary downloaded', 'The text file was generated from your saved case.');
        } catch (err) {
          toast('danger', 'Could not download the summary', err.message);
        } finally {
          setBusy(button, false);
        }
      }

      root.querySelector('#download-summary')?.addEventListener('click', (event) => downloadSummary(event.currentTarget));
      root.querySelector('#download-summary-2')?.addEventListener('click', (event) => downloadSummary(event.currentTarget));

      function openCaseMenu() {
        openModal({
          title: 'Case options',
          subtitle: `${info.reference} · ${info.title}`,
          body: `<div class="stack">
            <p class="small muted">These actions affect this case only. SHEild never sends your case anywhere.</p>
            <button type="button" class="btn btn-secondary btn-block" id="menu-download">${icon('download')} Download case summary</button>
            <button type="button" class="btn btn-secondary btn-block" id="menu-rename">${icon('pencil')} Rename this case</button>
            <button type="button" class="btn btn-outline-danger btn-block" id="menu-delete">${icon('trash')} Delete this case</button>
          </div>`,
          footer: `<button type="button" class="btn btn-ghost" data-modal-close>Close</button>`,
          onMount(host, close) {
            host.querySelector('#menu-download').addEventListener('click', async () => {
              close();
              await downloadSummary(root.querySelector('#download-summary'));
            });
            host.querySelector('#menu-rename').addEventListener('click', () => {
              close();
              openRename();
            });
            host.querySelector('#menu-delete').addEventListener('click', () => {
              close();
              openDelete();
            });
          }
        });
      }

      function openRename() {
        openModal({
          title: 'Rename this case',
          subtitle: 'Use a label that helps you recognise it. You can use a short, neutral title.',
          body: `<form id="rename-form">
            <label class="field-label" for="case-title-input">Case title</label>
            <input class="input" id="case-title-input" maxlength="160" value="${escapeHtml(info.title)}" required>
            <div class="field-error" id="rename-error"></div>
          </form>`,
          footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
            <button type="button" class="btn btn-primary" id="save-rename">Save title</button>`,
          onMount(host, close) {
            const input = host.querySelector('#case-title-input');
            input.focus();
            input.select();
            const save = async () => {
              const value = input.value.trim();
              if (!value) {
                const error = host.querySelector('#rename-error');
                error.textContent = 'Please enter a title.';
                error.classList.add('is-visible');
                input.focus();
                return;
              }
              const button = host.querySelector('#save-rename');
              if (button.disabled) return;
              setBusy(button, true, 'Saving…');
              try {
                await api(`/api/cases/${info.id}`, { method: 'PUT', body: { title: value } });
                const target = continueTarget(progress);
                queueContinue({
                  title: 'Case title updated',
                  message: 'The new title is saved to your case.',
                  label: continueLabel(target),
                  href: target
                });
                close();
                toast('success', 'Case title updated', 'The new title is saved to your case.');
                ctx.reload();
              } catch (err) {
                toast('danger', 'Could not rename the case', err.message);
                setBusy(button, false);
              }
            };
            host.querySelector('#save-rename').addEventListener('click', save);
            input.addEventListener('keydown', (event) => {
              if (event.key === 'Enter') { event.preventDefault(); save(); }
            });
          }
        });
      }

      function openDelete() {
        confirmDialog({
          title: 'Delete this entire case?',
          message: 'This permanently removes the case, all incidents, evidence files, links, report drafts, checklist progress, and confirmed summaries from SHEild. It cannot be undone. Nothing has been sent to any platform or authority.',
          confirmLabel: 'Delete case permanently',
          danger: true,
          onConfirm: async () => {
            await api(`/api/cases/${info.id}`, { method: 'DELETE' });
            setActiveCase(null);
            toast('success', 'Case deleted', 'SHEild has removed the case and its private files.');
          }
        }).then((deleted) => {
          if (deleted) ctx.navigate('#/');
        });
      }

      root.querySelector('#case-menu')?.addEventListener('click', openCaseMenu);
      root.querySelector('#rename-case')?.addEventListener('click', openRename);
      root.querySelector('#delete-case')?.addEventListener('click', openDelete);

      root.querySelectorAll('[data-connection-confirm]').forEach((button) => {
        button.addEventListener('click', async () => {
          setBusy(button, true);
          try {
            await api(`/api/connections/${button.dataset.connectionConfirm}`, { method: 'PUT', body: { status: 'CONFIRMED' } });
            const target = continueTarget(progress);
            queueContinue({
              title: 'Connection noted',
              message: 'You marked this similarity as relevant. It is still not proof of identity.',
              label: continueLabel(target),
              href: target
            });
            toast('success', 'Connection noted', 'You marked this similarity as relevant. It is still not proof of identity.');
            ctx.reload();
          } catch (err) {
            toast('danger', 'Could not update the suggestion', err.message);
            setBusy(button, false);
          }
        });
      });

      root.querySelectorAll('[data-connection-dismiss]').forEach((button) => {
        button.addEventListener('click', async () => {
          setBusy(button, true);
          try {
            await api(`/api/connections/${button.dataset.connectionDismiss}`, { method: 'PUT', body: { status: 'DISMISSED' } });
            const target = continueTarget(progress);
            queueContinue({
              title: 'Suggestion dismissed',
              message: 'You can still change your mind later.',
              label: continueLabel(target),
              href: target
            });
            toast('info', 'Suggestion dismissed', 'You can still change your mind later.');
            ctx.reload();
          } catch (err) {
            toast('danger', 'Could not update the suggestion', err.message);
            setBusy(button, false);
          }
        });
      });
    }
  };
}
