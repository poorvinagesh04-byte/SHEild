import { api, downloadBlob, fetchBlob, uploadEvidence } from '../api.js';
import {
  continueSlot, escapeHtml, formatBytes, formatDate, formatDateTime, icon, confirmDialog,
  loadProtectedImage, mountContinue, openModal, queueContinue, reviewBadge, setBusy,
  showContinue, takeContinue, toast, trackObjectUrl
} from '../ui.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];
const MAX_BYTES = 10 * 1024 * 1024;

function reviewKey(caseId, incidentId) {
  return `sheild.reviewDraft.${caseId}.${incidentId}`;
}

function readLocalReview(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.text === 'string' ? parsed : null;
  } catch { return null; }
}

function writeLocalReview(key, text) {
  try {
    localStorage.setItem(key, JSON.stringify({ text, savedAt: new Date().toISOString() }));
  } catch { /* storage may be unavailable */ }
}

function removeLocalReview(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

function hostLabel(url) {
  try { return new URL(url).host; } catch { return 'link'; }
}

function evidenceIcon(item) {
  if (item.image) return 'eye';
  if (item.pdf) return 'file';
  if (item.text) return 'note';
  return 'file';
}



function linkRow(url) {
  const safe = /^https?:\/\//i.test(url.url) ? url.url : null;
  const content = `
    <span class="url-favicon">${icon('link')}</span>
    <span class="url-info">
      <strong>${escapeHtml(url.label || 'Documented link')}</strong>
      <span>${escapeHtml(hostLabel(url.url))} · ${escapeHtml(url.platformLabel || '')}</span>
    </span>
    ${safe ? icon('external') : icon('lock')}`;
  return safe
    ? `<a class="url-compact" href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${content}</a>`
    : `<div class="url-compact">${content}</div>`;
}

function emptyIncidentView(ctx) {
  return {
    html: `
      <div class="page-head">
        <div>
          <div class="breadcrumb"><a href="#/dashboard">My case</a>${icon('chevron-down')}<span>Evidence review</span></div>
          <h1>Nothing to review <span class="accent">yet.</span></h1>
          <p class="page-lead">Evidence review opens after you have documented at least one incident. You can start with a short description and add files later.</p>
        </div>
      </div>
      <div class="card empty-state">
        <div class="empty-icon">${icon('file')}</div>
        <h2>Document what happened first</h2>
        <p>There is no incident in this case yet. SHEild will not create or invent a record for you.</p>
        <a class="btn btn-primary" href="#/report">Report an incident ${icon('arrow-right')}</a>
      </div>`,
    mount() { /* no interactions */ }
  };
}

export async function renderEvidence(ctx) {
  const { dashboard, route } = ctx;
  const caseId = dashboard.caseInfo.id;
  const incidents = dashboard.incidents || [];
  const continueFlash = takeContinue();

  if (!incidents.length) return emptyIncidentView(ctx);

  const incident = incidents.find((item) => String(item.id) === String(route.params.id)) || incidents[0];
  const evidence = incident.evidence || [];
  let confirmed = Boolean(incident.confirmedSummary);
  const key = reviewKey(caseId, incident.id);
  const localReview = readLocalReview(key);

  if (String(route.params.id) !== String(incident.id)) {
    history.replaceState(null, '', `#/evidence/${incident.id}`);
  }

  const switcher = incidents.length > 1 ? `
    <div class="select-inline" style="margin-top:14px">
      <span class="field-label" style="margin:0">Incident</span>
      <div class="select-wrap">
        <select class="select" id="incident-switch" aria-label="Choose an incident to review">
          ${incidents.map((item) => `<option value="${item.id}" ${item.id === incident.id ? 'selected' : ''}>${escapeHtml(item.incidentTypeLabel)} · ${escapeHtml(item.platformLabel)}</option>`).join('')}
        </select>
        ${icon('chevron-down')}
      </div>
    </div>` : '';

  const evidenceHtml = evidence.length ? evidence.map((item) => `
    <article class="evidence-item" data-evidence="${item.id}">
      <div class="evidence-thumb" data-thumb="${item.id}">
        ${item.image ? '<span class="thumb-loading" aria-hidden="true"></span>' : icon(evidenceIcon(item))}
      </div>
      <div class="evidence-body">
        <div class="evidence-name" title="${escapeHtml(item.originalFilename)}">${escapeHtml(item.originalFilename)}</div>
        <div class="evidence-meta">
          <span>${formatBytes(item.fileSize)}</span>
          <span>${formatDateTime(item.uploadedAt)}</span>
          <span>${escapeHtml(item.mimeType)}</span>
        </div>
        <div class="evidence-status">${reviewBadge(item.reviewStatus)}</div>
        ${item.userNote ? `<div class="evidence-note">${escapeHtml(item.userNote)}</div>` : ''}
        ${item.extractedText ? `<div class="text-extract" title="Text read from your uploaded plain-text file">${escapeHtml(item.extractedText.slice(0, 900))}${item.extractedText.length > 900 ? '…' : ''}</div>` : ''}
        <div class="evidence-actions">
          ${item.previewable ? `<button type="button" class="btn btn-soft btn-xs" data-view="${item.id}">${icon('eye')} View</button>` : ''}
          <button type="button" class="btn btn-ghost btn-xs" data-download="${item.id}">${icon('download')} Download</button>
          <button type="button" class="btn btn-ghost btn-xs" data-delete="${item.id}">${icon('trash')} Delete</button>
        </div>
      </div>
    </article>`).join('') : `
    <div class="empty-evidence">
      <div class="empty-icon">${icon('shield')}</div>
      <h3>No files attached to this incident</h3>
      <p>That is allowed. A written record and a link can still be useful. Add a file only if you already have one and feel comfortable storing it.</p>
    </div>`;

  const html = `
  <div class="page-head">
    <div>
      <div class="breadcrumb"><a href="#/dashboard">My case</a>${icon('chevron-down')}<span>Evidence review</span></div>
      <span class="eyebrow"><span class="dot"></span> Evidence review</span>
      <h1>Review what you have. <span class="accent">Keep what matters.</span></h1>
      <p class="page-lead">Check the drafted summary against your own words, correct anything that is inaccurate, and confirm only what you want carried forward. Nothing is sent to a platform or authority.</p>
      ${switcher}
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/report?incident=${incident.id}">${icon('pencil')} Edit incident</a>
      <a class="btn btn-ghost" href="#/dashboard">${icon('arrow-left')} Back to case</a>
    </div>
  </div>

  ${continueSlot(continueFlash)}

  <div class="evidence-layout">
    <div class="stack" style="gap:18px">
      <section class="card">
        <div class="card-head row-between">
          <div>
            <span class="eyebrow"><span class="dot"></span> Private files</span>
            <h2 class="card-title">Evidence library</h2>
            <p class="card-sub">Original files are kept unchanged. They are served only through your browser access token.</p>
          </div>
          <span class="badge badge-berry">${evidence.length} item${evidence.length === 1 ? '' : 's'}</span>
        </div>

        <div class="upload-panel" id="upload-panel">
          <div class="row-between">
            <div>
              <h3>Add a file to this incident</h3>
              <p>JPG, PNG, WebP, PDF, or TXT · up to 10 MB. Uploading does not share it with anyone.</p>
            </div>
            <span class="badge badge-outline">${icon('lock', 'icon-sm')} Private</span>
          </div>
          <div class="upload-controls">
            <label class="btn btn-secondary btn-sm file-label">
              ${icon('upload')} Choose file
              <input type="file" id="evidence-file" accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain">
            </label>
            <input class="input" id="evidence-note" maxlength="500" placeholder="Optional note (for example: first message, 12 Aug)" aria-label="Optional note about this file">
            <button type="button" class="btn btn-primary btn-sm" id="upload-evidence" disabled>Upload privately</button>
          </div>
          <div class="file-queue" id="selected-file"></div>
          <div class="file-queue hidden" id="upload-progress">
            <div class="upload-row">
              <div class="upload-top"><span id="upload-name">File</span><span id="upload-percent">Waiting…</span></div>
              <div class="upload-bar"><span id="upload-bar"></span></div>
            </div>
          </div>
          <p class="field-help" style="margin-top:10px">Automatic OCR is not configured. Images stay as originals, so you remain the person who reads and interprets them.</p>
        </div>

        <div class="evidence-list">${evidenceHtml}</div>
        <p class="side-note">${icon('eye')} Automatic OCR is not configured. Images and PDFs stay as originals, and plain-text files are stored with their text. You remain the person who interprets them.</p>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Your original account</h2>
            <p class="card-sub">This is the wording you entered. It stays separate from any generated summary.</p>
          </div>
        </div>
        <div class="review-summary" style="max-height:none">${escapeHtml(incident.description || 'No description was saved.')}</div>
        ${incident.impactNotes ? `<div class="missing-box" style="background:var(--lavender);border-color:var(--line)"><h4>${icon('heart')} Impact and repetition notes</h4><p class="small" style="margin-top:6px;color:var(--ink-soft);line-height:1.6">${escapeHtml(incident.impactNotes)}</p></div>` : ''}
      </section>
    </div>

    <aside class="stack" style="gap:18px">
      <section class="card card-pad review-panel" id="review-panel">
        <div class="card-head">
          <div>
            <span class="eyebrow"><span class="dot"></span> Human review required</span>
            <h2 class="card-title">The summary</h2>
            <p class="card-sub">Built only from your saved details. You are the person who decides what is accurate.</p>
          </div>
        </div>
        <div id="review-body">
          <div class="page-loader" role="status" style="min-height:180px"><div class="spinner"></div><span>Preparing a careful draft…</span></div>
        </div>
      </section>

      <section class="card card-pad">
        <div class="card-head">
          <h2 class="card-title">Incident details</h2>
        </div>
        <div class="detail-list">
          <div class="detail-row"><span>Type</span><span>${escapeHtml(incident.incidentTypeLabel)}</span></div>
          <div class="detail-row"><span>Platform</span><span>${escapeHtml(incident.platformLabel)}</span></div>
          <div class="detail-row"><span>When</span><span>${incident.occurredAt ? escapeHtml(formatDateTime(incident.occurredAt)) : 'Not provided'}</span></div>
          <div class="detail-row"><span>Links</span><span>${(incident.urls || []).length}</span></div>
          <div class="detail-row"><span>Files</span><span>${evidence.length}</span></div>
          <div class="detail-row"><span>Review</span><span>${reviewBadge(incident.reviewStatus)}</span></div>
        </div>
        ${(incident.urls || []).length ? `<div class="url-list-compact" style="margin-top:12px">${incident.urls.map(linkRow).join('')}</div>` : ''}
        <p class="side-note">${icon('lock')} Only this browser's access token can open these files in this build.</p>
      </section>
    </aside>
  </div>`;

  return {
    html,
    mount(root) {
      mountContinue(root, continueFlash);
      const uploadInput = root.querySelector('#evidence-file');
      const noteInput = root.querySelector('#evidence-note');
      const uploadButton = root.querySelector('#upload-evidence');
      const selectedHost = root.querySelector('#selected-file');
      const progressHost = root.querySelector('#upload-progress');
      const reviewHost = root.querySelector('#review-body');
      let selectedFile = null;
      let reviewData = null;

      // ---------- Evidence previews and actions ----------
      evidence.forEach((item) => {
        if (!item.image) return;
        const thumb = root.querySelector(`[data-thumb="${item.id}"]`);
        if (!thumb) return;
        const img = document.createElement('img');
        img.alt = `Preview of ${item.originalFilename}`;
        img.className = 'hidden';
        thumb.appendChild(img);
        loadProtectedImage(item.fileUrl, img);
      });

      function openPreview(item) {
        openModal({
          title: item.originalFilename,
          subtitle: `${formatBytes(item.fileSize)} · ${item.mimeType} · stored privately`,
          wide: true,
          body: `<div id="preview-body" style="min-height:220px;display:grid;place-items:center"><div class="spinner"></div></div>`,
          footer: `<button type="button" class="btn btn-secondary" data-modal-close>Close</button>
            <button type="button" class="btn btn-primary" id="preview-download">${icon('download')} Download a copy</button>`,
          onMount(host, close) {
            const body = host.querySelector('#preview-body');
            host.querySelector('#preview-download').addEventListener('click', async () => {
              try { await downloadBlob(item.fileUrl, item.originalFilename); }
              catch (err) { toast('danger', 'Could not download that file', err.message); }
            });
            (async () => {
              try {
                const blob = await fetchBlob(item.fileUrl);
                if (item.text) {
                  const text = await blob.text();
                  body.style.display = 'block';
                  body.innerHTML = `<pre class="text-extract" style="max-height:55vh">${escapeHtml(text)}</pre>`;
                } else {
                  const url = URL.createObjectURL(blob);
                  trackObjectUrl(url);
                  body.style.display = 'block';
                  if (item.image) {
                    body.innerHTML = `<img src="${url}" alt="Preview of ${escapeHtml(item.originalFilename)}" style="max-width:100%;max-height:60vh;border-radius:14px;display:block;margin:0 auto">`;
                  } else {
                    body.innerHTML = `<iframe src="${url}" title="Preview of ${escapeHtml(item.originalFilename)}" style="width:100%;height:60vh;border:0;border-radius:12px;background:#fff"></iframe>`;
                  }
                }
              } catch (err) {
                body.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-icon">${icon('alert')}</div><p>${escapeHtml(err.message)}</p></div>`;
              }
            })();
          }
        });
      }

      root.querySelectorAll('[data-view]').forEach((button) => {
        button.addEventListener('click', () => {
          const item = evidence.find((entry) => String(entry.id) === button.dataset.view);
          if (item) openPreview(item);
        });
      });

      root.querySelectorAll('[data-download]').forEach((button) => {
        button.addEventListener('click', async () => {
          const item = evidence.find((entry) => String(entry.id) === button.dataset.download);
          if (!item) return;
          setBusy(button, true);
          try {
            await downloadBlob(item.fileUrl, item.originalFilename);
            toast('success', 'Download started', 'A copy is being saved by your browser.');
          } catch (err) {
            toast('danger', 'Could not download that file', err.message);
          } finally {
            setBusy(button, false);
          }
        });
      });

      root.querySelectorAll('[data-delete]').forEach((button) => {
        button.addEventListener('click', () => {
          const item = evidence.find((entry) => String(entry.id) === button.dataset.delete);
          if (!item) return;
          confirmDialog({
            title: 'Delete this evidence item?',
            message: `“${item.originalFilename}” will be removed from this incident and deleted from SHEild's private storage. This cannot be undone.`,
            confirmLabel: 'Delete permanently',
            danger: true,
            onConfirm: async () => {
              await api(`/api/evidence/${item.id}`, { method: 'DELETE' });
              removeLocalReview(key);
              queueContinue({
                title: 'Evidence item deleted',
                message: 'The file was removed from SHEild storage.',
                label: 'Continue to review',
                href: `#/evidence/${incident.id}`,
                scrollTarget: 'review-panel'
              });
              toast('success', 'Evidence item deleted', 'The file was removed from SHEild storage.');
              ctx.reload();
            }
          });
        });
      });

      // ---------- Upload ----------
      function clearSelected() {
        selectedFile = null;
        selectedHost.innerHTML = '';
        uploadButton.disabled = true;
        uploadInput.value = '';
      }

      uploadInput.addEventListener('change', () => {
        const file = uploadInput.files?.[0];
        if (!file) return;
        if (!ALLOWED.includes(file.type)) {
          toast('danger', 'That file type is not supported', 'Use JPG, PNG, WebP, PDF, or TXT.');
          clearSelected();
          return;
        }
        if (file.size > MAX_BYTES) {
          toast('danger', 'That file is too large', 'Choose a file under 10 MB, or add a note describing what it shows.');
          clearSelected();
          return;
        }
        selectedFile = file;
        selectedHost.innerHTML = `
          <div class="file-chip">${icon('file')}<span class="file-name">${escapeHtml(file.name)}</span><span class="file-size">${formatBytes(file.size)}</span>
            <button type="button" id="remove-selected" aria-label="Remove selected file">${icon('x')}</button></div>`;
        selectedHost.querySelector('#remove-selected').addEventListener('click', clearSelected);
        uploadButton.disabled = false;
      });

      uploadButton.addEventListener('click', async () => {
        if (!selectedFile) return;
        setBusy(uploadButton, true, 'Uploading…');
        progressHost.classList.remove('hidden');
        root.querySelector('#upload-name').textContent = selectedFile.name;
        const bar = root.querySelector('#upload-bar');
        const percent = root.querySelector('#upload-percent');
        try {
          await uploadEvidence(incident.id, selectedFile, noteInput.value.trim(), (value) => {
            bar.style.width = `${value}%`;
            percent.textContent = `${value}%`;
          });
          toast('success', 'Evidence stored privately', 'The original file has been added to this incident.');
          removeLocalReview(key);
          queueContinue({
            title: 'Evidence stored privately',
            message: 'The original file has been added to this incident. Nothing was shared.',
            label: 'Continue to review',
            href: `#/evidence/${incident.id}`,
            scrollTarget: 'review-panel'
          });
          ctx.reload();
        } catch (err) {
          toast('danger', 'The file was not uploaded', err.message);
          percent.textContent = 'Not uploaded';
          setBusy(uploadButton, false);
          uploadButton.disabled = !selectedFile;
        }
      });

      // ---------- Review panel ----------
      function provenanceHtml(review) {
        if (!review?.provenanceNotes?.length) return '';
        return `<div class="provenance">
          <h4>How this draft was made</h4>
          ${review.provenanceNotes.map((note) => `<p>${escapeHtml(note)}</p>`).join('')}
        </div>`;
      }

      function missingHtml(review) {
        if (!review?.missingDetails?.length) return '';
        return `<div class="missing-box">
          <h4>${icon('alert')} Details you may want to add</h4>
          <ul>${review.missingDetails.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          <p class="tiny" style="color:#7b5b00;margin-top:8px">These gaps do not block you. They are simply things a reader may ask about later.</p>
        </div>`;
      }

      function confirmedPanel() {
        return `
          <div class="confirmed-box">${icon('check-circle')}<span><strong>Summary confirmed on ${escapeHtml(formatDate(incident.summaryConfirmedAt))}.</strong><br>This wording is what SHEild uses in your case summary and report drafts.</span></div>
          <div id="confirmed-view">
            <div class="review-summary" style="max-height:320px">${escapeHtml(incident.confirmedSummary)}</div>
            <div class="row" style="margin-top:14px;flex-wrap:wrap">
              <a class="btn btn-primary btn-sm" href="#/dashboard">Continue to my case ${icon('arrow-right')}</a>
              <a class="btn btn-soft btn-sm" href="#/action">${icon('note')} Prepare a report draft</a>
              <button type="button" class="btn btn-secondary btn-sm" id="edit-confirmed">${icon('pencil')} Edit confirmed wording</button>
            </div>
            <p class="confirm-note">${icon('lock')} Confirming is not reporting. It only finalises the wording inside your own case.</p>
          </div>
          <form id="edit-confirmed-form" class="hidden" style="margin-top:14px" novalidate>
            <div class="review-banner">${icon('alert')}<span>Changing this wording updates your case summary. Evidence files stay attached, and nothing is sent anywhere.</span></div>
            <label class="field-label" for="confirmed-text">Confirmed wording</label>
            <textarea class="textarea review-textarea" id="confirmed-text" maxlength="20000">${escapeHtml(incident.confirmedSummary)}</textarea>
            <div class="row" style="margin-top:10px;justify-content:flex-end;flex-wrap:wrap">
              <button type="button" class="btn btn-secondary btn-sm" id="cancel-confirmed-edit">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm" id="save-confirmed">Save confirmed wording</button>
            </div>
          </form>`;
      }

      function draftPanel(review, text, restored) {
        return `
          <div class="review-banner">${icon('sparkle')}<span><strong>Draft, not fact.</strong> This wording was assembled from the details you entered. No external AI or OCR was used. Read every sentence, correct what is wrong, and confirm only when it feels accurate.</span></div>
          ${restored ? `<div class="restore-banner" style="margin-bottom:12px"><span>${icon('clock')}</span><span>Your unsaved edits were restored from this browser.</span><button type="button" id="discard-review-local">Discard edits</button></div>` : ''}
          <form id="review-form" novalidate>
            <label class="field-label" for="review-text">Editable summary</label>
            <textarea class="textarea review-textarea" id="review-text" maxlength="20000" aria-describedby="review-save-note">${escapeHtml(text)}</textarea>
            <div class="char-count" id="review-count"></div>
            <div class="field-error" data-error-for="review-text" id="err-review-text"></div>
            <p class="small muted" id="review-save-note" style="margin-top:8px">${icon('lock')} Edits are kept in this browser until you confirm or discard them.</p>
            ${missingHtml(review)}
            ${provenanceHtml(review)}
            <label class="checkbox-row confirm-check">
              <input type="checkbox" id="confirm-check">
              <span>I have read this summary, corrected anything inaccurate, and I choose to confirm it as my account. I understand this does not report it to anyone.</span>
            </label>
            <button type="submit" class="btn btn-primary btn-block" id="confirm-summary" style="margin-top:12px" disabled>
              ${icon('check-circle')} Confirm this summary
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-block" id="regenerate-summary" style="margin-top:6px">${icon('refresh')} Regenerate from my saved details</button>
          </form>`;
      }

      function bindConfirmedPanel() {
        const edit = root.querySelector('#edit-confirmed');
        const view = root.querySelector('#confirmed-view');
        const form = root.querySelector('#edit-confirmed-form');
        edit?.addEventListener('click', () => {
          view.classList.add('hidden');
          form.classList.remove('hidden');
          root.querySelector('#confirmed-text').focus();
        });
        root.querySelector('#cancel-confirmed-edit')?.addEventListener('click', () => {
          form.classList.add('hidden');
          view.classList.remove('hidden');
        });
        form?.addEventListener('submit', async (event) => {
          event.preventDefault();
          const text = root.querySelector('#confirmed-text').value.trim();
          if (!text) { toast('danger', 'The summary cannot be empty', 'Write at least one sentence you can stand behind.'); return; }
          const button = root.querySelector('#save-confirmed');
          setBusy(button, true, 'Saving…');
          try {
            await api(`/api/incidents/${incident.id}/confirmed-summary`, { method: 'PUT', body: { summary: text } });
            removeLocalReview(key);
            queueContinue({
              title: 'Confirmed wording updated',
              message: 'Your case summary will use this version.',
              label: 'Continue to my case',
              href: '#/dashboard'
            });
            toast('success', 'Confirmed wording updated', 'Your case summary will use this version.');
            ctx.reload();
          } catch (err) {
            toast('danger', 'Could not update the summary', err.message);
            setBusy(button, false);
          }
        });
      }

      function bindDraftPanel(review) {
        const form = root.querySelector('#review-form');
        const textarea = root.querySelector('#review-text');
        const checkbox = root.querySelector('#confirm-check');
        const confirmButton = root.querySelector('#confirm-summary');
        const count = root.querySelector('#review-count');
        const error = root.querySelector('#err-review-text');

        function updateState() {
          const text = textarea.value;
          count.textContent = `${text.length.toLocaleString('en-IN')} / 20,000`;
          count.classList.toggle('over', text.length > 20000);
          confirmButton.disabled = !checkbox.checked || !text.trim() || text.length > 20000;
          if (text.trim() && text.length <= 20000) {
            error.textContent = '';
            error.classList.remove('is-visible');
            textarea.removeAttribute('aria-invalid');
          }
        }

        textarea.addEventListener('input', () => {
          writeLocalReview(key, textarea.value);
          updateState();
        });
        checkbox.addEventListener('change', updateState);
        updateState();

        root.querySelector('#discard-review-local')?.addEventListener('click', (event) => {
          removeLocalReview(key);
          textarea.value = review?.draftSummary || '';
          event.currentTarget.closest('.restore-banner')?.remove();
          updateState();
          toast('info', 'Browser edits discarded', 'The most recent generated draft is shown again.');
        });

        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const text = textarea.value.trim();
          if (!text) {
            error.textContent = 'Write or keep a summary before confirming it.';
            error.classList.add('is-visible');
            textarea.setAttribute('aria-invalid', 'true');
            textarea.focus();
            return;
          }
          if (!checkbox.checked) {
            toast('info', 'One more check', 'Tick the confirmation box to show you have read the summary.');
            return;
          }
          setBusy(confirmButton, true, 'Confirming…');
          try {
            await api(`/api/incidents/${incident.id}/confirmed-summary`, { method: 'PUT', body: { summary: text } });
            removeLocalReview(key);
            confirmed = true;
            incident.confirmedSummary = text;
            incident.summaryConfirmedAt = new Date().toISOString();
            incident.reviewStatus = 'REVIEWED';
            reviewHost.innerHTML = confirmedPanel();
            bindConfirmedPanel();
            showContinue(root, {
              title: 'Summary confirmed',
              message: 'Your reviewed account is saved. You can now prepare a report draft if you choose.',
              label: 'Continue to my case',
              href: '#/dashboard'
            });
            toast('success', 'Summary confirmed', 'Your reviewed account is saved. You can now prepare a report draft if you choose.');
          } catch (err) {
            toast('danger', 'Could not confirm the summary', err.message);
            setBusy(confirmButton, false);
            updateState();
          }
        });

        root.querySelector('#regenerate-summary')?.addEventListener('click', () => {
          confirmDialog({
            title: 'Regenerate the draft?',
            message: 'SHEild will rebuild the summary from your saved incident details. Any wording you edited in this browser will be replaced. Your confirmed summary, if you had one, would not be changed.',
            confirmLabel: 'Regenerate draft',
            onConfirm: async () => {
              const response = await api(`/api/incidents/${incident.id}/review`, { method: 'POST' });
              reviewData = response;
              removeLocalReview(key);
              reviewHost.innerHTML = draftPanel(response, response.draftSummary || '', false);
              bindDraftPanel(response);
              toast('info', 'Draft regenerated from your details', 'Check it again before confirming.');
            }
          });
        });
      }

      async function prepareReview() {
        if (confirmed) {
          reviewHost.innerHTML = confirmedPanel();
          bindConfirmedPanel();
          return;
        }
        try {
          const review = await api(`/api/incidents/${incident.id}/review`, { method: 'POST' });
          reviewData = review;
          const local = readLocalReview(key);
          const restored = Boolean(local && local.text && local.text.trim() !== (review.draftSummary || '').trim());
          const text = local && local.text ? local.text : (review.draftSummary || '');
          reviewHost.innerHTML = draftPanel(review, text, restored);
          bindDraftPanel(review);
        } catch (err) {
          reviewHost.innerHTML = `
            <div class="empty-state" style="padding:24px 6px">
              <div class="empty-icon">${icon('alert')}</div>
              <h2 style="font-size:18px">The draft could not be prepared</h2>
              <p>${escapeHtml(err.message)}</p>
              <button type="button" class="btn btn-primary btn-sm" id="retry-review">Try again ${icon('refresh')}</button>
            </div>`;
          reviewHost.querySelector('#retry-review').addEventListener('click', prepareReview);
        }
      }

      // ---------- Incident switcher ----------
      root.querySelector('#incident-switch')?.addEventListener('change', (event) => {
        ctx.navigate(`#/evidence/${event.target.value}`);
      });

      prepareReview();
    }
  };
}
