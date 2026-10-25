import { api } from '../api.js';
import { state } from '../store.js';
import { brand, escapeHtml, icon, toast } from '../ui.js';

const FEELINGS = [
  ['SCARED', 'Scared'],
  ['OVERWHELMED', 'Overwhelmed'],
  ['ANGRY', 'Angry'],
  ['CONFUSED', 'Confused'],
  ['UNSURE', 'Unsure'],
  ['LISTEN', 'I just need someone to listen']
];

const FALLBACK_OPTIONS = [
  { id: 'grounding', label: 'Try a grounding exercise', action: 'GROUNDING' },
  { id: 'trusted', label: 'Plan a message to someone I trust', action: 'TRUSTED_PERSON' },
  { id: 'resources', label: 'Show support resources', action: 'RESOURCES' },
  { id: 'listen', label: 'Just stay with me for a moment', action: 'LISTEN' },
  { id: 'case', label: 'Return to my case', action: 'RETURN_TO_CASE' }
];

const FALLBACK_RESOURCES = [
  { label: 'Emergency response — India', description: 'If you or someone else is in immediate danger, call 112.', phone: '112', url: null },
  { label: "Women's Helpline — India", description: 'A national helpline for women in distress, available 24/7.', phone: '181', url: null },
  { label: 'National Cyber Crime Reporting Portal', description: 'The official Government of India portal for reporting cyber crime. You choose whether to use it.', url: 'https://www.cybercrime.gov.in/', phone: null },
  { label: 'Instagram Help Centre', description: 'Official reporting and safety guidance from Instagram.', url: 'https://help.instagram.com/2922067214679225', phone: null },
  { label: 'Meta Safety Centre', description: 'Official safety tools for Facebook, Instagram, and other Meta services.', url: 'https://www.meta.com/safety', phone: null },
  { label: 'WhatsApp Security and Safety', description: 'Official guidance on blocking, reporting, and privacy settings.', url: 'https://www.whatsapp.com/security', phone: null }
];

const OPTION_ICONS = {
  grounding: 'wind',
  trusted: 'message',
  resources: 'book',
  listen: 'heart',
  case: 'arrow-right'
};

function textBlock(value) {
  return escapeHtml(value || '').replace(/\n/g, '<br>');
}

function feelingsHtml(selected, disabled = false) {
  return FEELINGS.map(([value, label]) => `
    <button type="button" class="feeling ${selected === value ? 'active' : ''}"
      data-feeling="${value}" aria-pressed="${selected === value ? 'true' : 'false'}"
      ${value === 'LISTEN' ? 'style="grid-column:1/-1"' : ''} ${disabled ? 'disabled' : ''}>
      <span class="feeling-dot" aria-hidden="true"></span>
      <span>${escapeHtml(label)}</span>
    </button>`).join('');
}

function resourceCards(resources) {
  return (resources || []).map((resource) => {
    const inner = `
      <span class="res-icon">${icon(resource.phone ? 'phone' : 'globe')}</span>
      <span>
        <strong>${escapeHtml(resource.label)}</strong>
        <span>${escapeHtml(resource.description || '')}</span>
      </span>`;
    if (resource.phone) {
      return `<a class="resource-card" href="tel:${escapeHtml(resource.phone)}">${inner}</a>`;
    }
    if (resource.url) {
      return `<a class="resource-card" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
    }
    return `<div class="resource-card">${inner}</div>`;
  }).join('');
}

function exerciseHtml(response, action) {
  if (!response?.exerciseTitle) return '';
  const isGrounding = action === 'GROUNDING' || /grounding/i.test(response.exerciseTitle);
  return `
    <div class="support-breath">
      <h3>${escapeHtml(response.exerciseTitle)}</h3>
      ${isGrounding ? `<div class="breath-circle" aria-hidden="true">breathe</div>` : ''}
      ${response.exerciseSteps?.length ? `<ol>${response.exerciseSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : ''}
    </div>`;
}

function responseResourcesHtml(response, action) {
  if (!response?.resources?.length) return '';
  if (action !== 'RESOURCES') return '';
  return `<div class="resource-cards">${resourceCards(response.resources)}</div>`;
}

function companionBubble(response, action) {
  return `
    <div class="companion-msg">
      <div class="companion-avatar" aria-hidden="true">
        <svg class="brand-mark" viewBox="0 0 48 54"><path d="M24 2.5 45 11v15.5c0 11.8-8.8 20.6-21 25C11.8 47.1 3 38.3 3 26.5V11L24 2.5Z" fill="currentColor"/><path d="M23.5 15c-6 0-9.2 3.3-9.2 7.1 0 4.5 5.8 4.8 9.1 5.7 3.3.9 6.3 1.8 6.3 5.1 0 3.5-3.8 5.4-7.5 5.4-3.6 0-6.8-1.5-8.4-3.9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>
      </div>
      <div class="companion-bubble">
        <span class="mode-tag">${icon(response.mode === 'GUIDED_RULE_BASED' ? 'shield' : 'sparkle')} ${escapeHtml(response.modeLabel || 'Guided support — not AI or a counsellor')}</span>
        <p>${textBlock(response.message)}</p>
        ${exerciseHtml(response, action)}
        ${responseResourcesHtml(response, action)}
        ${response.metadataStored ? `<p class="tiny muted" style="margin-top:10px">${icon('check', 'icon-sm')} ${escapeHtml(response.metadataNote)}</p>` : ''}
      </div>
    </div>`;
}

function threadHtml() {
  if (!state.support.entries.length) {
    return `
      <div class="companion-msg">
        <div class="companion-avatar" aria-hidden="true">
          <svg class="brand-mark" viewBox="0 0 48 54"><path d="M24 2.5 45 11v15.5c0 11.8-8.8 20.6-21 25C11.8 47.1 3 38.3 3 26.5V11L24 2.5Z" fill="currentColor"/><path d="M23.5 15c-6 0-9.2 3.3-9.2 7.1 0 4.5 5.8 4.8 9.1 5.7 3.3.9 6.3 1.8 6.3 5.1 0 3.5-3.8 5.4-7.5 5.4-3.6 0-6.8-1.5-8.4-3.9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>
        </div>
        <div class="companion-bubble">
          <span class="mode-tag">${icon('shield')} Guided support — not AI or a counsellor</span>
          <p>You do not have to explain everything, or anything. Choose a word for how you are arriving, and we can take it from there.</p>
          <p style="margin-top:8px">This space offers short, pre-written grounding and support prompts. It does not assess risk, diagnose, or contact anyone.</p>
        </div>
      </div>`;
  }
  return state.support.entries.map((entry) => {
    if (entry.role === 'user') {
      return `<div class="thread-user">${escapeHtml(entry.text)}</div>`;
    }
    return companionBubble(entry.response, entry.action);
  }).join('');
}

function optionsHtml() {
  const selected = state.support.feeling;
  if (!selected) {
    return `<span class="tiny muted">${icon('heart', 'icon-sm')} Choose how you are feeling above, then pick a support step if you want one.</span>`;
  }
  const options = state.support.response?.options?.length ? state.support.response.options : FALLBACK_OPTIONS;
  return options.map((option) => `
    <button type="button" class="option-chip" data-action="${option.action}" data-label="${escapeHtml(option.label)}">
      ${icon(OPTION_ICONS[option.id] || 'arrow-right')} ${escapeHtml(option.label)}
    </button>`).join('');
}

function resourcesHtml() {
  const resources = state.support.response?.resources?.length ? state.support.response.resources : FALLBACK_RESOURCES;
  return resourceCards(resources);
}

function supportBody(ctx, standalone) {
  const hasCase = Boolean(state.caseId);
  const entries = state.support.entries;
  const metadataNote = state.support.response?.metadataStored
    ? state.support.response.metadataNote
    : 'Nothing from a check-in is saved unless you choose to attach it to your case.';

  return `
  <div class="support-shell">
    ${standalone ? `<div class="support-standalone-nav">${brand({ tagline: true })}<div class="row"><a class="btn btn-ghost btn-sm" href="#/">Back to welcome</a><a class="btn btn-secondary btn-sm" href="#/report">Report an incident</a></div></div>` : ''}
    <div class="support-page">
      <div class="support-head">
        <span class="eyebrow"><span class="dot"></span> Emotional support companion</span>
        <h1>You don’t have to <span class="accent">hold this alone.</span></h1>
        <p>No explanation required. This is a quiet, guided space for grounding, deciding what you need, and finding an official resource if you want one.</p>
      </div>

      <div class="support-emergency">
        ${icon('alert')}
        <span><strong>If you are in immediate danger, call 112.</strong> For women in distress in India, the national Women’s Helpline is 181. SHEild is not a crisis service and cannot contact anyone for you.</span>
        <a href="tel:112">Call 112</a>
      </div>

      <div class="support-main-card">
        <div class="support-question">
          <h2>How are you arriving right now?</h2>
          <p>Choose the closest word. You can change it, choose another, or stop at any point.</p>
          <div class="feeling-grid" id="feeling-grid">${feelingsHtml(state.support.feeling)}</div>
        </div>
        <div class="support-thread" id="support-thread" aria-live="polite">${threadHtml()}</div>
        <div class="option-row" id="support-options">${optionsHtml()}</div>
        <div class="support-optin">
          <label class="switch" aria-label="Attach check-in metadata to my case">
            <input type="checkbox" id="associate-case" ${state.support.associate ? 'checked' : ''} ${hasCase ? '' : 'disabled'}>
            <span class="switch-track"></span>
          </label>
          <div class="optin-text">
            <strong>Attach check-in metadata to my case</strong>
            <span>${hasCase
              ? 'If on, SHEild stores only the feeling you chose, the type of support step, and the time. Your words are never recorded. You can leave this off.'
              : 'No case is open in this browser, so nothing from this conversation will be saved.'}</span>
          </div>
        </div>
        <div class="support-metadata" id="support-metadata">
          ${icon('lock')} <span>${escapeHtml(metadataNote)}</span>
        </div>
      </div>

      <div class="support-side-grid">
        <section class="support-side-card">
          <h3>${icon('wind')} A gentle pause</h3>
          <p>You can use this even if you do not choose a feeling. It is not a treatment or a risk assessment.</p>
          <div class="support-breath" style="margin-top:13px">
            <div class="breath-circle" aria-hidden="true">breathe</div>
            <ol>
              <li>Breathe in for four counts, and out for six. Repeat three times.</li>
              <li>Name five things you can see, without judging them.</li>
              <li>Notice three sounds, near or far.</li>
              <li>Press your feet into the floor and unclench your hands.</li>
            </ol>
          </div>
        </section>

        <section class="support-side-card">
          <h3>${icon('book')} Official resources</h3>
          <p>These links leave SHEild and go to official services. Using them is your choice. SHEild does not submit anything on your behalf.</p>
          <div class="resource-cards" id="support-resources">${resourcesHtml()}</div>
        </section>
      </div>

      <p class="support-disclaimer">
        Guided support is pre-written and rule-based. It is not AI, a counsellor, a diagnosis, or an emergency service.
        SHEild cannot detect risk, monitor you, or contact anyone. Nothing here is legal or medical advice.
        If you are in immediate danger, call 112. You can return to this screen at any time.
      </p>
    </div>
  </div>`;
}

function mountSupport(root, ctx, standalone) {
  const thread = root.querySelector('#support-thread');
  const options = root.querySelector('#support-options');
  const feelings = root.querySelector('#feeling-grid');
  const metadata = root.querySelector('#support-metadata');
  const resources = root.querySelector('#support-resources');
  let sending = false;

  function paint() {
    feelings.innerHTML = feelingsHtml(state.support.feeling, sending);
    thread.innerHTML = threadHtml();
    options.innerHTML = optionsHtml();
    if (resources) resources.innerHTML = resourcesHtml();
    const note = state.support.response?.metadataStored
      ? state.support.response.metadataNote
      : (state.caseId
        ? 'Nothing from a check-in is saved unless you choose to attach it to your case.'
        : 'No case is open in this browser, so nothing from this conversation will be saved.');
    metadata.innerHTML = `${icon('lock')} <span>${escapeHtml(note)}</span>`;
    if (sending) {
      options.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    }
    bindOptions();
  }

  async function send(action, label) {
    if (sending) return;
    if (!state.support.feeling) {
      toast('info', 'Choose a feeling first', 'You can choose “I just need someone to listen” if a word does not fit.');
      return;
    }
    sending = true;
    const previousFeeling = state.support.feeling;
    state.support.entries.push({ role: 'user', text: label });
    paint();
    try {
      const response = await api('/api/support/respond', {
        method: 'POST',
        body: {
          feeling: previousFeeling,
          action,
          caseId: state.caseId || null,
          associateWithCase: Boolean(state.caseId && state.support.associate)
        }
      });
      state.support.response = response;
      state.support.entries.push({ role: 'support', response, action });
      sending = false;
      paint();
      if (action === 'RETURN_TO_CASE' && state.caseId) {
        setTimeout(() => ctx.navigate('#/dashboard'), 900);
      }
    } catch (err) {
      state.support.entries.pop();
      sending = false;
      paint();
      toast('danger', 'That support step could not be loaded', err.message);
    }
  }

  function bindOptions() {
    options.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => send(button.dataset.action, button.dataset.label));
    });
  }

  // Delegation keeps feeling buttons working after each repaint.
  feelings.addEventListener('click', (event) => {
    const button = event.target.closest('[data-feeling]');
    if (!button || sending) return;
    const value = button.dataset.feeling;
    state.support.feeling = value;
    const label = FEELINGS.find(([key]) => key === value)?.[1] || 'I am not sure how I feel';
    send('OPENING', label);
  });

  root.querySelector('#associate-case')?.addEventListener('change', (event) => {
    state.support.associate = event.target.checked;
    toast('info', event.target.checked ? 'Check-in metadata will be attached' : 'Check-ins will not be saved',
      event.target.checked
        ? 'Only the feeling, support step, and time are stored. Your words are not.'
        : 'SHEild will not attach this check-in to your case.');
  });

  bindOptions();

  if (standalone) {
    document.title = 'Emotional support — SHEild';
  }
}

export async function renderSupport(ctx) {
  return {
    html: supportBody(ctx, false),
    mount(root) {
      mountSupport(root, ctx, false);
    }
  };
}

export async function renderSupportStandalone(ctx) {
  return {
    html: supportBody(ctx, true),
    mount(root) {
      mountSupport(root, ctx, true);
    }
  };
}
