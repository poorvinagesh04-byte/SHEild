import { api } from '../api.js';
import {
  clearContinue, continueSlot, copyText, downloadText, escapeHtml, formatDate, icon,
  setBusy, showContinue, toast, timeAgo
} from '../ui.js';

function draftKey(caseId, draftId) {
  return `sheild.actionDraft.${caseId}.${draftId}`;
}

function readLocalDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.content === 'string' ? parsed : null;
  } catch { return null; }
}

function writeLocalDraft(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
  } catch { /* storage may be unavailable */ }
}

function removeLocalDraft(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

function safeFilename(title) {
  return `${String(title || 'SHEild-draft').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'SHEild-draft'}.txt`;
}

function recommendationItem(item, index) {
  const isResourceJump = /(?:^#\/action\?|&)focus=resources(?:&|$)/.test(item.ctaRoute || '');
  return `
    <article class="rec-item">
      <span class="rec-num">${String(index + 1).padStart(2, '0')}</span>
      <div class="rec-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.detail)}</p>
        ${item.ctaLabel && item.ctaRoute ? `<a href="${escapeHtml(item.ctaRoute)}"${isResourceJump ? ' data-resource-jump' : ''}>${escapeHtml(item.ctaLabel)} ${icon('arrow-right')}</a>` : ''}
      </div>
    </article>`;
}

function resourceAccordion() {
  const resources = [
    {
      id: 'cybercrime',
      title: 'National Cyber Crime Reporting Portal',
      icon: 'globe',
      body: 'The official Government of India portal for reporting cyber crime, including some forms of online abuse. You choose whether to use it. For cyber-enabled financial fraud, the national Cyber Crime Helpline is 1930.',
      link: 'https://www.cybercrime.gov.in/',
      linkLabel: 'Open cybercrime.gov.in'
    },
    {
      id: 'instagram',
      title: 'Instagram Help Centre',
      icon: 'message',
      body: 'Official guidance and reporting forms for abusive content, impersonation, blocking, and privacy settings. Reporting outcomes are decided by Instagram, not SHEild.',
      link: 'https://help.instagram.com/2922067214679225',
      linkLabel: 'Open Instagram reporting guidance'
    },
    {
      id: 'facebook',
      title: 'Meta Safety Centre',
      icon: 'shield',
      body: 'Official safety tools and guidance for Facebook, Instagram, and other Meta services, including reporting and privacy controls.',
      link: 'https://www.meta.com/safety',
      linkLabel: 'Open the Meta Safety Centre'
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Security and Safety',
      icon: 'phone',
      body: 'Official guidance on blocking unwanted contacts, reporting messages, two-step verification, and privacy settings for WhatsApp.',
      link: 'https://www.whatsapp.com/security',
      linkLabel: 'Open WhatsApp security tools'
    },
    {
      id: 'urgent',
      title: 'Urgent support in India',
      icon: 'heart',
      body: 'If you or someone else is in immediate danger, call 112. The national Women’s Helpline is 181. For cyber-enabled financial fraud, call the Cyber Crime Helpline on 1930. These are official public services; SHEild does not contact them for you.',
      phone: '112',
      phoneLabel: 'Call emergency response · 112',
      phone2: '181',
      phone2Label: 'Call Women’s Helpline · 181',
      phone3: '1930',
      phone3Label: 'Call Cyber Crime Helpline · 1930'
    }
  ];
  return `<div class="resource-accordion">
    ${resources.map((item) => `
      <details class="resource-item" id="channel-${item.id}">
        <summary>
          <span class="res-icon">${icon(item.icon)}</span>
          <span>${escapeHtml(item.title)}</span>
          ${icon('chevron-down', 'chev')}
        </summary>
        <div class="resource-body">
          <p>${escapeHtml(item.body)}</p>
          ${item.link ? `<a class="resource-link" href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.linkLabel)} ${icon('external')}</a>
            <span class="resource-meta">${icon('external', 'icon-sm')} External website · opens in a new tab · SHEild sends nothing for you</span>` : ''}
          ${item.phone ? `<div class="phone-line">${icon('phone')} <a href="tel:${item.phone}">${escapeHtml(item.phoneLabel)}</a></div>` : ''}
          ${item.phone2 ? `<div class="phone-line">${icon('phone')} <a href="tel:${item.phone2}">${escapeHtml(item.phone2Label)}</a></div>` : ''}
          ${item.phone3 ? `<div class="phone-line">${icon('phone')} <a href="tel:${item.phone3}">${escapeHtml(item.phone3Label)}</a></div>` : ''}
          ${item.phone ? `<span class="resource-meta">${icon('phone', 'icon-sm')} Starts a call in your phone app when you choose it · SHEild does not place the call</span>` : ''}
        </div>
      </details>`).join('')}
  </div>`;
}

function noEligibleHtml(incidents) {
  const pending = incidents.filter((item) => item.reviewStatus !== 'REVIEWED');
  return `
    <div class="draft-empty">
      <div class="empty-icon">${icon('eye')}</div>
      <h3>Review comes before reporting</h3>
      <p>SHEild only prepares a report draft from an incident summary you have read and confirmed. This keeps generated wording from becoming a report you never checked.</p>
      ${pending.length
        ? `<a class="btn btn-primary" href="#/evidence/${pending[0].id}">Review an incident first ${icon('arrow-right')}</a>`
        : `<a class="btn btn-primary" href="#/report">Document an incident ${icon('arrow-right')}</a>`}
    </div>`;
}

export async function renderAction(ctx) {
  const { dashboard, route } = ctx;
  const info = dashboard.caseInfo;
  const caseId = info.id;
  const incidents = dashboard.incidents || [];
  const drafts = dashboard.drafts || [];
  const checklist = dashboard.checklist || [];
  const recommendations = dashboard.recommendations || [];
  const eligible = incidents.filter((item) => item.reviewStatus === 'REVIEWED' && item.confirmedSummary);
  const draftIds = new Set(drafts.map((draft) => draft.incidentId));
  const eligibleWithoutDraft = eligible.filter((item) => !draftIds.has(item.id));
  const requestedDraft = route?.query?.get('draft');
  const activeDraft = drafts.find((draft) => String(draft.id) === String(requestedDraft)) || drafts[0] || null;
  const doneCount = checklist.filter((item) => item.done).length;
  const progressPercent = checklist.length ? Math.round((doneCount / checklist.length) * 100) : info.progressPercent || 0;
  const key = activeDraft ? draftKey(caseId, activeDraft.id) : null;
  const local = key ? readLocalDraft(key) : null;
  const restored = Boolean(local && (local.content !== activeDraft.content || (local.title || '') !== (activeDraft.title || '')));

  const draftSelect = drafts.length > 1 ? `
    <div class="select-inline" style="margin-top:12px">
      <span class="field-label" style="margin:0">Draft</span>
      <div class="select-wrap">
        <select class="select" id="draft-switch" aria-label="Choose a report draft">
          ${drafts.map((draft) => `<option value="${draft.id}" ${draft.id === activeDraft.id ? 'selected' : ''}>${escapeHtml(draft.title)}</option>`).join('')}
        </select>
        ${icon('chevron-down')}
      </div>
    </div>` : '';

  const draftHtml = !activeDraft ? `
    ${eligible.length ? `
      <div class="draft-empty">
        <div class="empty-icon">${icon('note')}</div>
        <h3>Your reviewed details are ready</h3>
        <p>SHEild can arrange a confirmed incident into an editable draft. It will not be sent anywhere, and you can change every word.</p>
        <div class="select-inline" style="justify-content:center;margin-top:16px">
          <div class="select-wrap">
            <select class="select" id="draft-incident" aria-label="Choose an incident for the draft">
              ${eligible.map((item) => `<option value="${item.id}">${escapeHtml(item.incidentTypeLabel)} · ${escapeHtml(item.platformLabel)}</option>`).join('')}
            </select>
            ${icon('chevron-down')}
          </div>
          <button type="button" class="btn btn-primary" id="generate-draft">${icon('sparkle')} Generate editable draft</button>
        </div>
        <p class="tiny muted" style="margin-top:10px">Built only from the summary you confirmed. No external AI service is used.</p>
      </div>` : noEligibleHtml(incidents)}
  ` : `
    <div class="draft-head">
      <div class="row-between">
        <div>
          <span class="eyebrow"><span class="dot"></span> Report draft</span>
          <h2 class="card-title">${escapeHtml(activeDraft.title)}</h2>
          <p class="card-sub">${escapeHtml(activeDraft.incidentTypeLabel)} · last saved ${escapeHtml(timeAgo(activeDraft.updatedAt))}. You can edit every sentence.</p>
        </div>
        <span class="not-submitted">${icon('alert')} Draft — not submitted</span>
      </div>
      ${draftSelect}
    </div>
    ${restored ? `<div class="restore-banner" style="margin:16px 24px 0"><span>${icon('clock')}</span><span>Unsaved edits were restored from this browser. The server copy has not been changed.</span><button type="button" id="discard-draft-local">Discard edits</button></div>` : ''}
    <div class="draft-editor-wrap">
      <label class="field-label" for="draft-title">Draft title</label>
      <input class="input" id="draft-title" maxlength="200" value="${escapeHtml(restored ? (local.title || activeDraft.title) : activeDraft.title)}">
      <label class="field-label" for="draft-content" style="margin-top:14px">Draft content</label>
      <textarea class="draft-editor" id="draft-content" maxlength="30000" spellcheck="true">${escapeHtml(restored ? local.content : activeDraft.content)}</textarea>
      <div class="char-count" id="draft-count"></div>
    </div>
    <div class="draft-actions">
      <button type="button" class="btn btn-primary btn-sm" id="save-draft">${icon('check')} Save changes</button>
      <button type="button" class="btn btn-secondary btn-sm" id="copy-draft">${icon('copy')} Copy text</button>
      <button type="button" class="btn btn-ghost btn-sm" id="download-draft">${icon('download')} Download .txt</button>
      <span class="save-state" id="draft-state">${icon('lock')} Stored in your case</span>
    </div>
    <p class="action-note">${icon('alert')} This is a preparation tool, not a submission. SHEild does not send this draft, track it, or contact any platform. Send it yourself through the official channel only if you choose to.</p>
  `;

  const anotherDraft = activeDraft && eligibleWithoutDraft.length ? `
    <section class="card card-pad">
      <div class="card-head">
        <div>
          <h2 class="card-title">Another incident</h2>
          <p class="card-sub">You can prepare a separate draft for each confirmed incident.</p>
        </div>
      </div>
      <div class="select-inline">
        <div class="select-wrap" style="flex:1;min-width:0">
          <select class="select" id="draft-incident" aria-label="Choose another incident for a draft">
            ${eligibleWithoutDraft.map((item) => `<option value="${item.id}">${escapeHtml(item.incidentTypeLabel)} · ${escapeHtml(item.platformLabel)}</option>`).join('')}
          </select>
          ${icon('chevron-down')}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="generate-draft">Generate</button>
      </div>
    </section>` : '';

  const html = `
  <div class="page-head">
    <div>
      <div class="breadcrumb"><a href="#/dashboard">My case</a>${icon('chevron-down')}<span>Take action</span></div>
      <span class="eyebrow"><span class="dot"></span> Your next step</span>
      <h1>Choose what happens next. <span class="accent">In your time.</span></h1>
      <p class="page-lead">Prepare an editable report, check practical next steps, or use an official resource. SHEild will not submit anything, contact anyone, or decide for you.</p>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/dashboard">${icon('arrow-left')} Back to case</a>
    </div>
  </div>

  ${continueSlot()}

  <div class="action-layout">
    <div class="action-main">
      <section class="card">
        <div class="card-head">
          <div>
            <span class="eyebrow"><span class="dot"></span> Suggested actions</span>
            <h2 class="card-title">A few things that may help</h2>
            <p class="card-sub">Based only on what is currently saved in your case. These are suggestions, not instructions.</p>
          </div>
        </div>
        <div class="rec-list">
          ${recommendations.length ? recommendations.map(recommendationItem).join('') : `<div class="empty-mini">Suggestions will appear as your case takes shape.</div>`}
        </div>
      </section>

      <section class="card draft-card" id="draft-section">
        ${draftHtml}
      </section>

      ${anotherDraft}

      <section class="card" id="checklist-section">
        <div class="card-head row-between">
          <div>
            <span class="eyebrow"><span class="dot"></span> Your plan</span>
            <h2 class="card-title">Practical next steps</h2>
            <p class="card-sub">Tick what you have done. This checklist is saved to your case and is entirely for you.</p>
          </div>
          <span class="badge badge-berry" id="checklist-badge">${doneCount}/${checklist.length}</span>
        </div>
        <div class="progress-block" style="margin-top:14px">
          <div class="progress-block-head"><span>Checklist progress</span><strong id="checklist-percent">${progressPercent}%</strong></div>
          <div class="progress-track"><span id="checklist-bar" style="width:${progressPercent}%"></span></div>
        </div>
        <div class="checklist-full">
          ${checklist.map((item) => `
            <div class="checklist-item ${item.done ? 'done' : ''}" data-item-row="${item.id}">
              <input type="checkbox" id="check-${item.id}" data-checklist="${item.id}" ${item.done ? 'checked' : ''}>
              <label for="check-${item.id}">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.description || '')}</span>
              </label>
            </div>`).join('')}
        </div>
        <p class="action-note" style="padding:16px 0 0">${icon('lock')} Changing this checklist does not contact any service or change any external account.</p>
      </section>

      <section class="card" id="official-channels" tabindex="-1">
        <div class="card-head">
          <div>
            <span class="eyebrow"><span class="dot"></span> Official channels</span>
            <h2 class="card-title">Reporting resources</h2>
            <p class="card-sub">These links go to official platform and government pages. SHEild is not affiliated with them, and outcomes are decided by those services.</p>
          </div>
        </div>
        ${resourceAccordion()}
        <p class="action-note" style="padding:16px 0 0">${icon('alert')} Reporting is always your choice. If you are in immediate danger, call 112.</p>
      </section>
    </div>

    <aside class="action-side">
      <section class="card card-pad">
        <div class="card-head">
          <h2 class="card-title">Where your case stands</h2>
        </div>
        <div class="progress-block" style="margin-bottom:14px">
          <div class="progress-block-head"><span>Overall progress</span><strong id="overall-percent">${info.progressPercent}%</strong></div>
          <div class="progress-track"><span id="overall-bar" style="width:${info.progressPercent}%"></span></div>
        </div>
        <div class="detail-list">
          <div class="detail-row"><span>Confirmed reviews</span><span>${info.reviewedIncidentCount} of ${incidents.length}</span></div>
          <div class="detail-row"><span>Evidence items</span><span>${info.evidenceCount}</span></div>
          <div class="detail-row"><span>Report drafts</span><span>${drafts.length}</span></div>
          <div class="detail-row"><span>Checklist</span><span>${doneCount} of ${checklist.length}</span></div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm btn-block" id="download-checklist" style="margin-top:14px">${icon('download')} Download case summary</button>
        <p class="side-note">${icon('file')} The summary is a text file generated from this case. It is not a report.</p>
      </section>

      <div class="emergency-card">
        <h3>${icon('alert')} If you are in immediate danger</h3>
        <p>Call 112. The national Women’s Helpline is 181. SHEild cannot monitor emergencies or contact services for you.</p>
        <a href="tel:112">${icon('phone')} Call 112</a>
      </div>

      <div class="guidance-card">
        <div class="guidance-icon">${icon('heart')}</div>
        <h3>You can do one small thing.</h3>
        <p>You do not have to report today, or ever. Saving a draft, ticking one box, or closing this screen are all valid choices.</p>
        <a class="btn btn-secondary btn-sm" href="#/support" style="margin-top:12px">${icon('heart')} Talk it through</a>
      </div>

      <section class="card card-pad">
        <div class="card-head">
          <h2 class="card-title">What SHEild will not do</h2>
        </div>
        <div class="guidance-list" style="margin-top:0">
          <span>${icon('check')} Submit a report to any platform or authority.</span>
          <span>${icon('check')} Contact a person you have documented.</span>
          <span>${icon('check')} Claim that content is fake or identify anyone.</span>
          <span>${icon('check')} Send your evidence anywhere outside this application.</span>
        </div>
      </section>
    </aside>
  </div>`;

  return {
    html,
    mount(root) {
      const content = root.querySelector('#draft-content');
      const title = root.querySelector('#draft-title');
      const stateLabel = root.querySelector('#draft-state');
      const count = root.querySelector('#draft-count');
      let dirty = false;

      function revealOfficialChannels() {
        const section = root.querySelector('#official-channels');
        if (!section) return;
        const first = section.querySelector('.resource-item');
        if (first) first.open = true;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        section.focus({ preventScroll: true });
        first?.querySelector('summary')?.focus({ preventScroll: true });
      }

      root.querySelectorAll('[data-resource-jump]').forEach((link) => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          revealOfficialChannels();
        });
      });
      if (route?.query?.get('focus') === 'resources') {
        requestAnimationFrame(revealOfficialChannels);
      }

      function updateCount() {
        if (!content || !count) return;
        count.textContent = `${content.value.length.toLocaleString('en-IN')} / 30,000`;
        count.classList.toggle('over', content.value.length > 30000);
      }

      function markDirty() {
        dirty = true;
        clearContinue(root);
        if (stateLabel) stateLabel.innerHTML = `${icon('clock')} Unsaved changes in this browser`;
        if (key) {
          writeLocalDraft(key, { title: title?.value || '', content: content?.value || '' });
        }
        updateCount();
      }

      content?.addEventListener('input', markDirty);
      title?.addEventListener('input', markDirty);
      updateCount();

      root.querySelector('#discard-draft-local')?.addEventListener('click', (event) => {
        if (!activeDraft) return;
        removeLocalDraft(key);
        title.value = activeDraft.title;
        content.value = activeDraft.content;
        event.currentTarget.closest('.restore-banner')?.remove();
        dirty = false;
        if (stateLabel) stateLabel.innerHTML = `${icon('lock')} Stored in your case`;
        updateCount();
        toast('info', 'Browser edits discarded', 'The last saved version from your case is shown.');
      });

      root.querySelector('#draft-switch')?.addEventListener('change', (event) => {
        ctx.navigate(`#/action?draft=${event.target.value}`);
      });

      async function generateDraft(button) {
        const select = root.querySelector('#draft-incident');
        if (!select?.value) return;
        setBusy(button, true, 'Preparing…');
        try {
          const created = await api(`/api/incidents/${select.value}/report-drafts`, { method: 'POST' });
          toast('success', 'Editable draft ready', 'Review and edit every word before using it.');
          ctx.navigate(`#/action?draft=${created.id}`);
        } catch (err) {
          toast('danger', 'Could not prepare the draft', err.message);
          setBusy(button, false);
        }
      }

      root.querySelector('#generate-draft')?.addEventListener('click', (event) => generateDraft(event.currentTarget));

      root.querySelector('#save-draft')?.addEventListener('click', async (event) => {
        if (!activeDraft) return;
        const button = event.currentTarget;
        const text = content.value.trim();
        if (!text) {
          toast('danger', 'The draft cannot be empty', 'Keep at least one sentence, or generate a new draft from a confirmed incident.');
          content.focus();
          return;
        }
        if (text.length > 30000) {
          toast('danger', 'This draft is too long', 'Keep the content under 30,000 characters.');
          return;
        }
        clearContinue(root);
        setBusy(button, true, 'Saving…');
        try {
          const updated = await api(`/api/report-drafts/${activeDraft.id}`, {
            method: 'PUT',
            body: { title: title.value.trim() || activeDraft.title, content: text }
          });
          activeDraft.title = updated.title;
          activeDraft.content = updated.content;
          activeDraft.updatedAt = updated.updatedAt;
          dirty = false;
          removeLocalDraft(key);
          root.querySelector('#discard-draft-local')?.closest('.restore-banner')?.remove();
          if (stateLabel) stateLabel.innerHTML = `${icon('check')} Saved just now`;
          updateCount();
          showContinue(root, {
            title: 'Draft saved to your case',
            message: 'This draft is still unsubmitted. Nothing has been sent.',
            label: 'Continue to my case',
            href: '#/dashboard'
          });
          toast('success', 'Draft saved', 'This draft is still unsubmitted. Nothing has been sent.');
          setBusy(button, false);
        } catch (err) {
          toast('danger', 'Could not save the draft', err.message);
          setBusy(button, false);
        }
      });

      root.querySelector('#copy-draft')?.addEventListener('click', async () => {
        if (!activeDraft) return;
        const ok = await copyText(`${title.value}\n\n${content.value}`);
        toast(ok ? 'success' : 'danger', ok ? 'Draft copied' : 'Could not copy the draft', ok ? 'Paste it wherever you choose. Nothing has been sent.' : 'Select the text and copy it manually.');
      });

      root.querySelector('#download-draft')?.addEventListener('click', () => {
        if (!activeDraft) return;
        downloadText(`${title.value}\n\n${content.value}`, safeFilename(title.value));
        toast('success', 'Draft download started', 'The text file is saved by your browser. Nothing has been submitted.');
      });

      root.querySelector('#download-checklist')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        setBusy(button, true, 'Preparing…');
        try {
          const { downloadBlob } = await import('../api.js');
          await downloadBlob(`/api/cases/${caseId}/summary`, `SHEild-case-${info.reference}.txt`);
          toast('success', 'Case summary downloaded', 'This is a private record, not a report.');
        } catch (err) {
          toast('danger', 'Could not download the summary', err.message);
        } finally {
          setBusy(button, false);
        }
      });

      // ---------- Persistent checklist ----------
      root.querySelectorAll('[data-checklist]').forEach((checkbox) => {
        checkbox.addEventListener('change', async () => {
          const itemId = checkbox.dataset.checklist;
          const row = root.querySelector(`[data-item-row="${itemId}"]`);
          const done = checkbox.checked;
          checkbox.disabled = true;
          row?.classList.toggle('done', done);
          try {
            await api(`/api/checklist/${itemId}`, { method: 'PUT', body: { done } });
            const item = checklist.find((entry) => String(entry.id) === String(itemId));
            if (item) item.done = done;
            const countDone = checklist.filter((entry) => entry.done).length;
            const percent = checklist.length ? Math.round((countDone / checklist.length) * 100) : 0;
            const badge = root.querySelector('#checklist-badge');
            const percentLabel = root.querySelector('#checklist-percent');
            const bar = root.querySelector('#checklist-bar');
            const overallLabel = root.querySelector('#overall-percent');
            const overallBar = root.querySelector('#overall-bar');
            if (badge) badge.textContent = `${countDone}/${checklist.length}`;
            if (percentLabel) percentLabel.textContent = `${percent}%`;
            if (bar) bar.style.width = `${percent}%`;
            if (overallLabel) overallLabel.textContent = `${percent}%`;
            if (overallBar) overallBar.style.width = `${percent}%`;
            showContinue(root, {
              title: done ? 'Step marked complete' : 'Step reopened',
              message: 'Your checklist is saved to this case.',
              label: 'Continue to my case',
              href: '#/dashboard'
            });
            toast('success', done ? 'Step marked complete' : 'Step reopened', 'Your checklist is saved to this case.');
          } catch (err) {
            checkbox.checked = !done;
            row?.classList.toggle('done', !done);
            toast('danger', 'Could not update the checklist', err.message);
          } finally {
            checkbox.disabled = false;
          }
        });
      });

      if (dirty && stateLabel) {
        stateLabel.innerHTML = `${icon('clock')} Unsaved changes in this browser`;
      }
    }
  };
}
