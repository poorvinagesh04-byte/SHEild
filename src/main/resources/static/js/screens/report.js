import { api, uploadEvidence } from '../api.js';
import {
  clearContinue, continueSlot, escapeHtml, formatBytes, icon, queueContinue,
  setBusy, setFieldError, showContinue, toast, toLocalInputValue
} from '../ui.js';

const TYPES = [
  ['DEEPFAKE', 'Suspected deepfake or manipulated content', 'Altered images, video, or audio'],
  ['IMPERSONATION', 'Impersonation or fake profile', 'Someone pretending to be you'],
  ['HARASSMENT', 'Repeated online harassment', 'Persistent unwanted contact or posts'],
  ['THREATS', 'Online threats', 'Threats to your safety or wellbeing'],
  ['OTHER', 'Other', 'Something else that does not fit above']
];

const PLATFORMS = [
  ['INSTAGRAM', 'Instagram'],
  ['FACEBOOK', 'Facebook'],
  ['WHATSAPP', 'WhatsApp'],
  ['OTHER', 'Other']
];

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];
const MAX_BYTES = 10 * 1024 * 1024;

function localDraftKey(caseId, incidentId) {
  return `sheild.reportDraft.${caseId}.${incidentId || 'new'}`;
}

function readLocalDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeLocalDraft(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
  } catch { /* storage may be unavailable */ }
}

function buildUrls(incident) {
  if (!incident) return { profile: '', additional: [] };
  return {
    profile: incident.urls?.find((u) => u.kind === 'PROFILE')?.url || '',
    additional: (incident.urls || []).filter((u) => u.kind === 'ADDITIONAL').map((u) => u.url)
  };
}

function safeInitialAdditional(values) {
  const list = values.length ? values : [''];
  return list.map((value) => `
    <div class="url-row">
      <input class="input" type="url" name="additionalUrl" value="${escapeHtml(value)}" placeholder="https://another-link.example" inputmode="url" aria-label="Additional relevant link">
      <button type="button" class="btn btn-icon" data-remove-url aria-label="Remove this link">${icon('x')}</button>
    </div>`).join('');
}

export async function renderReport(ctx) {
  const { dashboard, route } = ctx;
  const caseId = dashboard.caseInfo.id;
  const incidentId = route.query.get('incident');
  const incident = incidentId ? dashboard.incidents.find((i) => String(i.id) === String(incidentId)) : null;
  const editing = Boolean(incident);
  const urls = buildUrls(incident);
  const activeType = incident?.incidentType || '';
  const activePlatform = incident?.platform || '';
  const draftKey = localDraftKey(caseId, incident?.id);
  const isReviewed = incident?.reviewStatus === 'REVIEWED';

  const html = `
  <div class="page-head">
    <div>
      <div class="breadcrumb"><a href="#/dashboard">My case</a>${icon('chevron-down')}<span>Report an incident</span></div>
      <span class="eyebrow"><span class="dot"></span> ${editing ? 'Edit your record' : 'Action Centre'}</span>
      <h1>${editing ? 'Edit what you <span class="accent">remember.</span>' : 'Tell us what <span class="accent">happened.</span>'}</h1>
      <p class="page-lead">Use your own words. You can leave anything blank if you do not know it, and you can save a draft at any point. Nothing is sent to a platform or authority.</p>
    </div>
    <div class="page-actions">
      <button type="button" class="btn btn-ghost" id="cancel-report">${icon('arrow-left')} Back to case</button>
    </div>
  </div>

  ${continueSlot()}

  ${isReviewed ? `<div class="alert alert-warn" style="margin-bottom:18px">${icon('alert')}<span>This incident has already been reviewed and confirmed. Saving a material change will clear the confirmation so you can review the updated facts again.</span></div>` : ''}
  <div class="restore-banner hidden" id="restore-banner" role="status">
    ${icon('clock')}
    <span>Unsaved changes were restored from this browser. The server copy has not been changed.</span>
    <button type="button" id="discard-restore">Discard restored changes</button>
  </div>

  <div class="report-layout">
    <form class="card" id="incident-form" novalidate>
      <section class="form-section">
        <div class="form-section-head">
          <span class="section-num">1</span>
          <div><h2>What kind of incident was this?</h2><p>Choose the closest description. It does not need to be perfect.</p></div>
        </div>
        <div class="field">
          <div class="choice-grid" id="incidentType" role="radiogroup" aria-label="Incident type">
            ${TYPES.map(([value, label, hint], index) => `
              <label class="choice ${index === TYPES.length - 1 ? 'choice-wide' : ''}">
                <input type="radio" name="incidentType" value="${value}" ${activeType === value ? 'checked' : ''}>
                <span class="choice-indicator" aria-hidden="true"></span>
                <span class="choice-text"><strong>${label}</strong><span>${hint}</span></span>
              </label>`).join('')}
          </div>
          <div class="field-error" data-error-for="incidentType" id="err-incidentType"></div>
        </div>
      </section>

      <section class="form-section">
        <div class="form-section-head">
          <span class="section-num">2</span>
          <div><h2>Where did it happen?</h2><p>Add any links you already have. A missing link will not block your record.</p></div>
        </div>
        <div class="field">
          <span class="field-label">Platform <span class="req">*</span></span>
          <div class="segmented" id="platform" role="radiogroup" aria-label="Platform">
            ${PLATFORMS.map(([value, label]) => `
              <label class="choice">
                <input type="radio" name="platform" value="${value}" ${activePlatform === value ? 'checked' : ''}>
                <span class="choice-text"><strong>${label}</strong></span>
              </label>`).join('')}
          </div>
          <div class="field-error" data-error-for="platform" id="err-platform"></div>
        </div>

        <div class="field">
          <label class="field-label" for="profileUrl">Profile or account URL <span class="muted tiny" style="font-weight:500">(optional)</span></label>
          <div class="input-icon-wrap">
            ${icon('link')}
            <input class="input" id="profileUrl" name="profileUrl" type="url" inputmode="url" value="${escapeHtml(urls.profile)}" placeholder="https://instagram.com/account-name" autocomplete="off">
          </div>
          <p class="field-help">Only add a link if you already have it. You do not need to search for the account again.</p>
          <div class="field-error" data-error-for="profileUrl" id="err-profileUrl"></div>
        </div>

        <div class="field">
          <span class="field-label">Other relevant links <span class="muted tiny" style="font-weight:500">(optional)</span></span>
          <div class="url-list" id="additional-urls">${safeInitialAdditional(urls.additional)}</div>
          <button type="button" class="add-link" id="add-url">${icon('plus')} Add another link</button>
          <div class="field-help">For example, a public post, a screenshot archive, or another profile connected to the same situation.</div>
          <div class="field-error" data-error-for="additionalUrls" id="err-additionalUrls"></div>
        </div>

        <div class="field">
          <label class="field-label" for="occurredAt">Approximate date and time <span class="muted tiny" style="font-weight:500">(optional)</span></label>
          <div class="input-icon-wrap">
            ${icon('calendar')}
            <input class="input" id="occurredAt" name="occurredAt" type="datetime-local" value="${incident?.occurredAt ? toLocalInputValue(incident.occurredAt) : ''}">
          </div>
          <p class="field-help">If you are unsure, leave this blank. You can note the uncertainty in your description.</p>
          <div class="field-error" data-error-for="occurredAt" id="err-occurredAt"></div>
        </div>
      </section>

      <section class="form-section">
        <div class="form-section-head">
          <span class="section-num">3</span>
          <div><h2>In your own words</h2><p>Write only what you are comfortable putting into your own case record.</p></div>
        </div>
        <div class="field">
          <label class="field-label" for="description">What happened? <span class="req">*</span></label>
          <textarea class="textarea" id="description" name="description" maxlength="20000" placeholder="For example: A profile using my name and photos messaged people I know. I did not create it, and the messages stopped for a while before starting again from a different account.">${escapeHtml(incident?.description || '')}</textarea>
          <div class="char-count" id="description-count">0 / 20,000</div>
          <div class="field-error" data-error-for="description" id="err-description"></div>
        </div>
        <div class="field">
          <label class="field-label" for="impactNotes">Anything about repetition or impact? <span class="muted tiny" style="font-weight:500">(optional)</span></label>
          <textarea class="textarea" id="impactNotes" name="impactNotes" maxlength="5000" style="min-height:100px" placeholder="For example: This has happened three times this month. I feel anxious opening messages and have made my account private.">${escapeHtml(incident?.impactNotes || '')}</textarea>
          <div class="char-count" id="impact-count">0 / 5,000</div>
          <div class="field-error" data-error-for="impactNotes" id="err-impactNotes"></div>
        </div>
      </section>

      <section class="form-section">
        <div class="form-section-head">
          <span class="section-num">4</span>
          <div><h2>Evidence you already have</h2><p>Optional. You can add files now or later during evidence review.</p></div>
        </div>
        <div class="field">
          <label class="dropzone" id="dropzone">
            <input type="file" id="evidence-files" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain">
            <span class="dropzone-icon">${icon('upload')}</span>
            <strong>Choose files or drop them here</strong>
            <span>JPG, PNG, WebP, PDF, or TXT · up to 10 MB each</span>
          </label>
          <div class="file-queue" id="file-queue"></div>
          <p class="field-help">Files are uploaded after you save the incident. Original files are never edited. Please do not upload explicit material unless it is necessary — a description or link may be safer to keep.</p>
        </div>
      </section>

      <div class="form-footer">
        <span class="form-footer-note">${icon('lock')} Saved only to your private SHEild case. No external submission.</span>
        <div class="form-footer-actions">
          <button type="button" class="btn btn-secondary" id="save-draft">Save draft</button>
          <button type="submit" class="btn btn-primary" id="submit-incident">
            ${editing ? 'Save and review' : 'Continue to evidence review'} ${icon('arrow-right')}
          </button>
        </div>
      </div>
    </form>

    <aside class="report-aside">
      <div class="steps-card card">
        <h3>Your path through SHEild</h3>
        <ol class="step-list">
          <li class="active"><span class="step-dot">1</span><span class="step-body"><strong>Document the incident</strong><span>What you remember is enough.</span></span></li>
          <li><span class="step-dot">2</span><span class="step-body"><strong>Review the information</strong><span>Correct the draft summary.</span></span></li>
          <li><span class="step-dot">3</span><span class="step-body"><strong>Choose your next step</strong><span>Report, preserve, or seek support.</span></span></li>
        </ol>
      </div>
      <div class="guidance-card">
        <div class="guidance-icon">${icon('leaf')}</div>
        <h3>A gentle reminder</h3>
        <p>You are not on trial here. You do not have to prove what happened to use this space, and you can stop at any point.</p>
        <div class="guidance-list">
          <span>${icon('check')} “I don’t know” is a complete answer.</span>
          <span>${icon('check')} A partial date is still useful.</span>
          <span>${icon('check')} You can save and return later.</span>
        </div>
      </div>
      <div class="card card-pad" style="padding:20px">
        <div class="row" style="align-items:flex-start">
          <span class="card-icon" style="width:36px;height:36px;border-radius:11px">${icon('heart', 'icon-sm')}</span>
          <div>
            <h3 style="font-size:13px">Need a moment first?</h3>
            <p class="tiny muted" style="margin-top:4px">You do not have to fill this in right now.</p>
            <a class="text-link tiny" href="#/support" style="display:inline-block;margin-top:8px">Open emotional support</a>
          </div>
        </div>
      </div>
    </aside>
  </div>`;

  return {
    html,
    mount(root) {
      const form = root.querySelector('#incident-form');
      const fileInput = root.querySelector('#evidence-files');
      const queue = root.querySelector('#file-queue');
      const addUrlBtn = root.querySelector('#add-url');
      const description = root.querySelector('#description');
      const impact = root.querySelector('#impactNotes');
      const restoreBanner = root.querySelector('#restore-banner');
      let queuedFiles = [];
      let savedIncidentId = incident?.id || null;
      let currentKey = localDraftKey(caseId, savedIncidentId);
      let submitting = false;

      const initialValues = {
        incidentType: activeType,
        platform: activePlatform,
        profileUrl: urls.profile,
        additionalUrls: urls.additional,
        occurredAt: incident?.occurredAt ? toLocalInputValue(incident.occurredAt) : '',
        description: incident?.description || '',
        impactNotes: incident?.impactNotes || ''
      };

      function setRadio(name, value) {
        form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
          input.checked = input.value === value;
        });
      }

      function renderAdditionalUrls(values) {
        const list = values.length ? values : [''];
        root.querySelector('#additional-urls').innerHTML = list.map((value) => `
          <div class="url-row">
            <input class="input" type="url" name="additionalUrl" value="${escapeHtml(value)}" placeholder="https://another-link.example" inputmode="url" aria-label="Additional relevant link">
            <button type="button" class="btn btn-icon" data-remove-url aria-label="Remove this link">${icon('x')}</button>
          </div>`).join('');
        bindRemoveButtons();
        updateAddButton();
      }

      function bindRemoveButtons() {
        root.querySelectorAll('[data-remove-url]').forEach((btn) => {
          btn.onclick = () => {
            const rows = root.querySelectorAll('#additional-urls .url-row');
            if (rows.length === 1) {
              rows[0].querySelector('input').value = '';
            } else {
              btn.closest('.url-row').remove();
            }
            updateAddButton();
            persist();
          };
        });
      }

      function updateAddButton() {
        const rows = root.querySelectorAll('#additional-urls .url-row').length;
        addUrlBtn.style.display = rows >= 10 ? 'none' : 'inline-flex';
      }

      function applyValues(values) {
        setRadio('incidentType', values.incidentType);
        setRadio('platform', values.platform);
        root.querySelector('#profileUrl').value = values.profileUrl || '';
        renderAdditionalUrls(values.additionalUrls || []);
        root.querySelector('#occurredAt').value = values.occurredAt || '';
        description.value = values.description || '';
        impact.value = values.impactNotes || '';
        updateCounts();
      }

      function collect() {
        const type = form.querySelector('input[name="incidentType"]:checked')?.value || '';
        const platform = form.querySelector('input[name="platform"]:checked')?.value || '';
        const additional = [...root.querySelectorAll('input[name="additionalUrl"]')]
          .map((input) => input.value.trim()).filter(Boolean);
        return {
          incidentType: type || null,
          platform: platform || null,
          profileUrl: root.querySelector('#profileUrl').value.trim() || null,
          additionalUrls: additional,
          occurredAt: root.querySelector('#occurredAt').value || '',
          description: description.value.trim(),
          impactNotes: impact.value.trim()
        };
      }

      function persist() {
        writeLocalDraft(currentKey, collect());
      }

      function updateCounts() {
        root.querySelector('#description-count').textContent = `${description.value.length.toLocaleString('en-IN')} / 20,000`;
        root.querySelector('#description-count').classList.toggle('over', description.value.length > 20000);
        root.querySelector('#impact-count').textContent = `${impact.value.length.toLocaleString('en-IN')} / 5,000`;
        root.querySelector('#impact-count').classList.toggle('over', impact.value.length > 5000);
      }

      function validateUrl(value) {
        if (!value) return true;
        let candidate = value.trim();
        if (!candidate.includes('://')) candidate = `https://${candidate}`;
        try {
          const parsed = new URL(candidate);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch { return false; }
      }

      function showError(key, message) {
        const el = root.querySelector(`#err-${key}`);
        const field = root.querySelector(`#${key}`);
        if (el) {
          el.textContent = message;
          el.classList.add('is-visible');
        }
        if (field) field.setAttribute('aria-invalid', 'true');
      }

      function clearErrors() {
        root.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; el.classList.remove('is-visible'); });
        root.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
      }

      function validate(data) {
        clearErrors();
        let first = null;
        if (!data.incidentType) { showError('incidentType', 'Choose the closest type of incident.'); first ||= root.querySelector('#incidentType input'); }
        if (!data.platform) { showError('platform', 'Choose where this happened.'); first ||= root.querySelector('#platform input'); }
        if (!data.description) { showError('description', 'Describe what happened so your case record is useful.'); first ||= description; }
        else if (data.description.length > 20000) { showError('description', 'Keep the description under 20,000 characters.'); first ||= description; }
        if (data.profileUrl && !validateUrl(data.profileUrl)) { showError('profileUrl', 'Enter a valid http or https link, or leave it blank.'); first ||= root.querySelector('#profileUrl'); }
        const additionalInputs = [...root.querySelectorAll('input[name="additionalUrl"]')];
        const badAdditional = additionalInputs.find((input) => input.value.trim() && !validateUrl(input.value));
        if (badAdditional) { showError('additionalUrls', 'One of the additional links is not valid.'); first ||= badAdditional; }
        if (data.additionalUrls.length > 10) { showError('additionalUrls', 'Add no more than 10 additional links.'); }
        if (data.occurredAt) {
          const when = new Date(data.occurredAt);
          if (Number.isNaN(when.getTime())) { showError('occurredAt', 'That date could not be understood.'); first ||= root.querySelector('#occurredAt'); }
          else if (when.getTime() > Date.now() + 86400000) { showError('occurredAt', 'The incident date cannot be in the future.'); first ||= root.querySelector('#occurredAt'); }
        }
        if (data.impactNotes.length > 5000) { showError('impactNotes', 'Keep the impact notes under 5,000 characters.'); first ||= impact; }
        if (first) {
          first.focus({ preventScroll: true });
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast('danger', 'A few details need attention', 'Check the highlighted fields, then try again.');
          return false;
        }
        return true;
      }

      function payloadFrom(data, draft) {
        return {
          incidentType: data.incidentType,
          platform: data.platform,
          profileUrl: data.profileUrl,
          additionalUrls: data.additionalUrls,
          occurredAt: data.occurredAt ? new Date(data.occurredAt).toISOString() : null,
          description: data.description,
          impactNotes: data.impactNotes || null,
          draft
        };
      }

      function renderQueue() {
        queue.innerHTML = queuedFiles.map((file, index) => `
          <div class="file-chip">
            ${icon('file')}
            <span class="file-name">${escapeHtml(file.name)}</span>
            <span class="file-size">${formatBytes(file.size)}</span>
            <button type="button" data-remove-file="${index}" aria-label="Remove ${escapeHtml(file.name)}">${icon('x')}</button>
          </div>`).join('');
        queue.querySelectorAll('[data-remove-file]').forEach((btn) => {
          btn.addEventListener('click', () => {
            queuedFiles.splice(Number(btn.dataset.removeFile), 1);
            renderQueue();
          });
        });
      }

      function addFiles(fileList) {
        const rejected = [];
        [...fileList].forEach((file) => {
          if (!ALLOWED.includes(file.type)) {
            rejected.push(`${file.name}: unsupported type`);
            return;
          }
          if (file.size > MAX_BYTES) {
            rejected.push(`${file.name}: over 10 MB`);
            return;
          }
          if (queuedFiles.some((f) => f.name === file.name && f.size === file.size)) return;
          queuedFiles.push(file);
        });
        renderQueue();
        if (rejected.length) {
          toast('danger', 'Some files were not added', rejected[0] + (rejected.length > 1 ? ` (+${rejected.length - 1} more)` : ''));
        }
      }

      function renderUploadProgress(files) {
        const host = document.createElement('div');
        host.className = 'file-queue';
        host.style.marginTop = '14px';
        host.id = 'upload-progress';
        host.innerHTML = files.map((file, index) => `
          <div class="upload-row" data-upload="${index}">
            <div class="upload-top"><span>${escapeHtml(file.name)}</span><span data-upload-label>Waiting…</span></div>
            <div class="upload-bar"><span></span></div>
          </div>`).join('');
        form.querySelector('.form-footer').before(host);
        return host;
      }

      async function uploadQueue(incidentId) {
        if (!queuedFiles.length) return [];
        const host = renderUploadProgress(queuedFiles);
        const failures = [];
        for (let i = 0; i < queuedFiles.length; i++) {
          const row = host.querySelector(`[data-upload="${i}"]`);
          const bar = row.querySelector('.upload-bar span');
          const label = row.querySelector('[data-upload-label]');
          label.textContent = 'Uploading…';
          try {
            await uploadEvidence(incidentId, queuedFiles[i], '', (percent) => {
              bar.style.width = `${percent}%`;
              label.textContent = `${percent}%`;
            });
            label.textContent = 'Stored privately';
            bar.style.width = '100%';
          } catch (err) {
            failures.push({ file: queuedFiles[i], message: err.message });
            label.textContent = 'Not uploaded';
            row.style.borderColor = '#ecc7c4';
          }
        }
        return failures;
      }

      async function save(draft) {
        if (submitting) return;
        const data = collect();
        if (!draft && !validate(data)) return;
        if (draft) {
          clearErrors();
          if (data.description.length > 20000 || data.impactNotes.length > 5000) {
            toast('danger', 'A field is too long', 'Shorten the description or impact notes before saving.');
            return;
          }
        }
        submitting = true;
        clearContinue(root);
        const submitButton = root.querySelector('#submit-incident');
        const draftButton = root.querySelector('#save-draft');
        const activeButton = draft ? draftButton : submitButton;
        setBusy(activeButton, true, draft ? 'Saving draft…' : 'Saving incident…');
        submitButton.disabled = true;
        draftButton.disabled = true;

        try {
          const payload = payloadFrom(data, draft);
          let response;
          if (savedIncidentId) {
            response = await api(`/api/incidents/${savedIncidentId}`, { method: 'PUT', body: payload });
          } else {
            response = await api(`/api/cases/${caseId}/incidents`, { method: 'POST', body: payload });
          }
          savedIncidentId = response.id;
          const oldKey = currentKey;
          currentKey = localDraftKey(caseId, savedIncidentId);
          try { localStorage.removeItem(oldKey); } catch { /* ignore */ }
          try { localStorage.removeItem(currentKey); } catch { /* ignore */ }

          if (draft) {
            history.replaceState(null, '', `#/report?incident=${savedIncidentId}`);
            document.querySelector('#restore-banner')?.classList.add('hidden');
            showContinue(root, {
              title: 'Draft saved to your case',
              message: 'Your wording is stored. You can pick this up whenever you are ready.',
              label: 'Continue to my case',
              href: '#/dashboard'
            });
            toast('success', 'Draft saved to your case', 'You can leave this screen and pick up where you left off.');
            setBusy(activeButton, false);
            submitButton.disabled = false;
            draftButton.disabled = false;
            setBusy(activeButton, false);
            submitting = false;
            return;
          }

          const failures = await uploadQueue(savedIncidentId);
          if (failures.length) {
            toast('danger', 'Incident saved, but some files did not upload', failures[0].message);
          } else if (queuedFiles.length) {
            toast('success', 'Incident and evidence saved', 'Your files are stored privately in this case.');
          } else {
            toast('success', 'Incident saved', 'Next, review the draft summary before confirming it.');
          }
          queueContinue({
            title: 'Incident saved',
            message: failures.length
              ? 'Your record is saved. At least one file did not upload; you can retry from evidence review.'
              : 'Your record is saved privately. Next, review the drafted summary before confirming it.',
            label: 'Continue to review',
            href: `#/evidence/${savedIncidentId}`,
            scrollTarget: 'review-panel'
          });
          ctx.navigate(`#/evidence/${savedIncidentId}`);
        } catch (err) {
          if (err.fieldErrors) {
            Object.entries(err.fieldErrors).forEach(([key, message]) => showError(key, message));
            const firstError = root.querySelector('.field-error.is-visible');
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          toast('danger', 'Could not save this incident', err.message);
          setBusy(activeButton, false);
          submitButton.disabled = false;
          draftButton.disabled = false;
          submitting = false;
        }
      }

      // Restore browser-local draft if it is newer than the server copy.
      const local = readLocalDraft(draftKey);
      if (local) {
        const serverTime = incident?.updatedAt ? new Date(incident.updatedAt).getTime() : 0;
        const localTime = local.savedAt ? new Date(local.savedAt).getTime() : Date.now();
        if (localTime > serverTime) {
          applyValues(local);
          restoreBanner.classList.remove('hidden');
        }
      }

      root.querySelector('#discard-restore').addEventListener('click', () => {
        try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
        applyValues(initialValues);
        restoreBanner.classList.add('hidden');
        toast('info', 'Restored changes discarded', 'The saved incident details are shown again.');
      });

      form.addEventListener('input', () => {
        updateCounts();
        persist();
        restoreBanner.classList.add('hidden');
        clearContinue(root);
      });

      fileInput.addEventListener('change', (event) => {
        addFiles(event.target.files);
        event.target.value = '';
      });
      const dropzone = root.querySelector('#dropzone');
      ['dragenter', 'dragover'].forEach((evt) => dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add('is-drag');
      }));
      ['dragleave', 'drop'].forEach((evt) => dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-drag');
      }));
      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
      });

      addUrlBtn.addEventListener('click', () => {
        const rows = root.querySelectorAll('#additional-urls .url-row').length;
        if (rows >= 10) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'url-row';
        wrapper.innerHTML = `<input class="input" type="url" name="additionalUrl" placeholder="https://another-link.example" inputmode="url" aria-label="Additional relevant link">
          <button type="button" class="btn btn-icon" data-remove-url aria-label="Remove this link">${icon('x')}</button>`;
        root.querySelector('#additional-urls').appendChild(wrapper);
        bindRemoveButtons();
        updateAddButton();
        wrapper.querySelector('input').focus();
      });

      root.querySelector('#cancel-report').addEventListener('click', () => ctx.navigate('#/dashboard'));
      root.querySelector('#save-draft').addEventListener('click', () => save(true));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        save(false);
      });

      // Clear error as the person edits.
      form.querySelectorAll('input, textarea').forEach((input) => {
        input.addEventListener('input', () => {
          const key = input.name === 'additionalUrl' ? 'additionalUrls' : input.name;
          const err = root.querySelector(`#err-${key}`);
          if (err) { err.textContent = ''; err.classList.remove('is-visible'); }
          input.removeAttribute('aria-invalid');
        });
      });

      bindRemoveButtons();
      updateAddButton();
      updateCounts();
      persist();
    }
  };
}
