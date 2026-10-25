import { ApiError } from '../api.js';
import { createCase, listCases, setActiveCase, state } from '../store.js';
import {
  brand, formatDate, icon, openModal, openPrivacyModal, setBusy, toast
} from '../ui.js';

function casePicker(cases, navigate) {
  const body = cases.length === 0
    ? `<div class="empty-state" style="padding:28px 10px">
        <div class="empty-icon">${icon('lock')}</div>
        <h2 style="font-size:19px">No cases in this browser yet</h2>
        <p>SHEild links a case to the private access token saved in this browser. If you used another device or cleared your browser data, the case cannot be retrieved here.</p>
      </div>`
    : `<div class="modal-list">
        ${cases.map((c) => `
          <button type="button" class="case-pick" data-case="${c.id}">
            <span class="case-pick-icon">${icon('file')}</span>
            <span class="case-pick-body">
              <strong>${escape(c.title)}</strong>
              <span>${c.reference} · ${c.incidentCount} incident${c.incidentCount === 1 ? '' : 's'} · updated ${formatDate(c.updatedAt)}</span>
            </span>
            ${icon('arrow-right')}
          </button>`).join('')}
      </div>`;

  openModal({
    title: cases.length > 1 ? 'Choose a case' : 'Continue your case',
    subtitle: cases.length > 1
      ? 'These are the cases saved under this browser’s access token.'
      : 'Only cases available to this browser are shown.',
    body,
    footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
      <button type="button" class="btn btn-primary" id="picker-new">Start a new case</button>`,
    onMount(host, close) {
      host.querySelectorAll('[data-case]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const caseId = Number(btn.dataset.case);
          setActiveCase(caseId);
          close();
          navigate('#/dashboard');
        });
      });
      host.querySelector('#picker-new').addEventListener('click', () => {
        close();
        startNew(host.ownerDocument.querySelector('#start-new-case'), navigate);
      });
    }
  });
}

async function startNew(button, navigate) {
  if (button?.disabled) return;
  setBusy(button, true, 'Creating your space…');
  try {
    await createCase('My safety case');
    toast('success', 'Your private case is ready', 'Nothing has been sent anywhere. Start with what you remember.');
    navigate('#/report');
  } catch (err) {
    toast('danger', 'Could not start a case', err.message);
  } finally {
    setBusy(button, false);
  }
}

function escape(value) {
  return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export async function renderWelcome({ navigate }) {
  const html = `
  <div class="landing">
    <div class="landing-nav-wrap">
      <header class="landing-nav">
        ${brand({ tagline: true })}
        <nav class="landing-links" aria-label="Landing page navigation">
          <button type="button" class="nav-text" data-scroll="how-it-works">How it works</button>
          <a href="#/support">Support</a>
          <button type="button" class="nav-text" data-scroll="privacy">Privacy</button>
        </nav>
        <div class="landing-nav-actions">
          <button type="button" class="btn btn-secondary" id="continue-case-top">Continue a case</button>
          <button type="button" class="btn btn-primary" id="report-top">Report an incident ${icon('arrow-right')}</button>
        </div>
      </header>
    </div>

    <main id="main">
      <section class="hero" aria-labelledby="hero-heading">
        <div class="hero-copy">
          <span class="hero-badge">${icon('shield')} A private place to begin</span>
          <h1 class="hero-title" id="hero-heading" aria-label="Your safety. Your story. Your next step.">
            <span>Your safety.</span>
            <span>Your story.</span>
            <span class="accent">Your next step.</span>
          </h1>
          <p class="hero-lead">
            When something happens online, it can be hard to know what to keep, what to say, or where to turn.
            SHEild helps you document it carefully, review what you have, and choose a next step — at your pace.
          </p>
          <div class="hero-actions">
            <button type="button" class="btn btn-primary btn-lg" id="start-new-case">
              Report a New Incident ${icon('arrow-right')}
            </button>
            <button type="button" class="btn btn-secondary btn-lg" id="continue-case">
              ${icon('file')} Continue an Existing Case
            </button>
          </div>
          <p class="hero-privacy">
            ${icon('lock')}
            <span>Private by design in this build. No report is sent to a platform or authority. <button type="button" data-privacy-link>How your data works</button></span>
          </p>
        </div>

        <div class="hero-stage" aria-hidden="true">
          <div class="hero-glow"></div>
          <div class="phone">
            <div class="phone-screen">
              <div class="phone-top">
                <span class="phone-time">09:41</span>
                <span class="phone-safe">${icon('lock')} Private space</span>
              </div>
              <div class="phone-head">${brand({ tagline: true })}</div>
              <div class="phone-body">
                <div class="phone-case">
                  <div class="phone-case-ref">Case SH-2026-7K4M2A</div>
                  <h3>Your story, held carefully.</h3>
                  <p>Review what happened, in your own words.</p>
                  <div class="phone-progress"><span></span></div>
                  <div class="phone-progress-label"><span>Case progress</span><span>3 of 6 steps</span></div>
                </div>
                <div class="phone-steps">
                  <div class="phone-step">
                    <span class="phone-step-icon">${icon('check')}</span>
                    <span><strong>Incident documented</strong><span>Impersonation · Instagram</span></span>
                    <span class="badge badge-success">Saved</span>
                  </div>
                  <div class="phone-step">
                    <span class="phone-step-icon">${icon('file')}</span>
                    <span><strong>Evidence reviewed</strong><span>2 items kept privately</span></span>
                    <span class="badge badge-success">Reviewed</span>
                  </div>
                  <div class="phone-step">
                    <span class="phone-step-icon">${icon('note')}</span>
                    <span><strong>Prepare a report</strong><span>Only when you are ready</span></span>
                    <span class="badge">Draft</span>
                  </div>
                </div>
              </div>
              <div class="phone-nav">
                <span class="active">${icon('grid')}</span>
                <span>${icon('plus')}</span>
                <span>${icon('file')}</span>
                <span>${icon('heart')}</span>
              </div>
            </div>
          </div>
          <div class="float-card float-you">
            <span class="float-icon">${icon('user')}</span>
            <span><strong>You stay in control</strong><span>Nothing is submitted for you</span></span>
          </div>
          <div class="float-card float-evidence">
            <span class="float-icon">${icon('shield')}</span>
            <span><strong>Evidence kept private</strong><span>Behind your access token</span></span>
          </div>
          <div class="float-card float-support">
            <span class="float-icon">${icon('heart')}</span>
            <span><strong>Support, whenever</strong><span>No explanation required</span></span>
          </div>
        </div>
      </section>

      <section class="trust-strip" aria-label="What SHEild promises">
        <div class="trust-item">${icon('shield')}<span><strong>Your pace</strong><span>Report, pause, or simply document.</span></span></div>
        <div class="trust-item">${icon('lock')}<span><strong>Your evidence</strong><span>Original files stay unchanged and private.</span></span></div>
        <div class="trust-item">${icon('heart')}<span><strong>Your support</strong><span>Compassionate guidance on every screen.</span></span></div>
      </section>

      <section class="section" id="how-it-works" aria-labelledby="how-heading">
        <div class="section-head">
          <span class="eyebrow"><span class="dot"></span> One connected journey</span>
          <h2 id="how-heading">From a difficult moment to a <span class="accent">clearer next step.</span></h2>
          <p class="section-lead">You do not have to relive everything to make it manageable. SHEild keeps the pieces together and shows you what is already in your hands.</p>
        </div>
        <div class="how-grid">
          <article class="how-card">
            <span class="how-num">01</span>
            <div class="how-icon">${icon('note')}</div>
            <h3>Document it your way</h3>
            <p>Record what happened in everyday language. Add only the details you have — a link, a rough date, a short description. “I don’t know” is allowed.</p>
            <span class="text-link">Report a New Incident ${icon('arrow-right', 'icon-sm')}</span>
          </article>
          <article class="how-card">
            <span class="how-num">02</span>
            <div class="how-icon">${icon('eye')}</div>
            <h3>Review before you trust</h3>
            <p>See a draft summary built only from your own words. Correct it, remove what is wrong, and confirm only what feels accurate. Generated text is never treated as fact.</p>
            <span class="text-link">Nothing is auto-confirmed ${icon('check', 'icon-sm')}</span>
          </article>
          <article class="how-card">
            <span class="how-num">03</span>
            <div class="how-icon">${icon('arrow-right')}</div>
            <h3>Choose what comes next</h3>
            <p>Prepare an editable report draft, follow official resource links, or spend a quiet moment with the support companion. SHEild never contacts anyone for you.</p>
            <span class="text-link">You make the final call ${icon('lock', 'icon-sm')}</span>
          </article>
        </div>
      </section>

      <section class="section" id="privacy" style="padding-top:0" aria-labelledby="privacy-heading">
        <div class="privacy-panel">
          <div>
            <span class="eyebrow" style="color:#f3b8d6"><span class="dot" style="background:#f3b8d6"></span> Privacy, without the fine-print theatre</span>
            <h2 id="privacy-heading">Your story stays yours. <span class="accent">Until you decide otherwise.</span></h2>
            <p>SHEild is a place to think and prepare — not a system that acts behind your back. The boundaries are part of the product, not a setting you have to find.</p>
            <ul class="privacy-list">
              <li>${icon('check')} No report is submitted to a platform, police, or authority by SHEild.</li>
              <li>${icon('lock')} Evidence files are served only through your private access token.</li>
              <li>${icon('eye')} Generated summaries stay drafts until you review and confirm them.</li>
              <li>${icon('heart')} Support interactions are not stored unless you choose to attach check-in metadata.</li>
            </ul>
          </div>
          <aside class="privacy-aside">
            <span class="badge">${icon('shield', 'icon-sm')} Honest by default</span>
            <h3>What this build can and cannot promise</h3>
            <p>This is a hackathon prototype. It uses anonymous browser-based access, not full accounts. Files are stored privately on the application server but are not end-to-end encrypted. Clearing this browser’s data removes your route back to the case.</p>
            <button type="button" class="btn btn-sm" data-privacy-link>Read the privacy notice ${icon('arrow-right')}</button>
          </aside>
        </div>
      </section>

      <section class="support-band" aria-labelledby="support-heading">
        <div class="support-band-inner">
          ${icon('heart', 'heart-float')}
          <div>
            <span class="eyebrow"><span class="dot"></span> Emotional support companion</span>
            <h2 id="support-heading">Feeling everything at once? <span class="accent">You don’t have to sort it alone.</span></h2>
            <p>A calm, non-judgemental space with grounding exercises, trusted-person planning, and official resources. You do not need a case to use it, and you never have to explain more than you want to.</p>
          </div>
          <div class="support-band-actions">
            <a class="btn btn-primary" href="#/support">Open support ${icon('heart')}</a>
            <a class="btn btn-secondary" href="#/support">See resources</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            ${brand({ tagline: true })}
            <p>Your safety. Your story. Your next step. A private place to document online abuse, organise what you have, and choose what happens next.</p>
          </div>
          <div class="footer-cols">
            <div class="footer-col">
              <h4>Official support</h4>
              <a href="https://www.cybercrime.gov.in/" target="_blank" rel="noopener noreferrer">National Cyber Crime Portal ${icon('external', 'icon-sm')}</a>
              <a href="tel:112">Emergency response · 112</a>
              <a href="tel:181">Women’s Helpline · 181</a>
            </div>
            <div class="footer-col">
              <h4>Platform help</h4>
              <a href="https://help.instagram.com/" target="_blank" rel="noopener noreferrer">Instagram Help Centre ${icon('external', 'icon-sm')}</a>
              <a href="https://www.facebook.com/safety" target="_blank" rel="noopener noreferrer">Facebook Safety Centre ${icon('external', 'icon-sm')}</a>
              <a href="https://www.whatsapp.com/safety" target="_blank" rel="noopener noreferrer">WhatsApp Safety ${icon('external', 'icon-sm')}</a>
            </div>
            <div class="footer-col">
              <h4>About SHEild</h4>
              <span>Digital safety prototype</span>
              <span>Built for a hackathon</span>
              <button type="button" class="text-link" data-privacy-link style="background:none;border:0;padding:0;text-align:left">Privacy & limitations</button>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>SHEild does not provide legal, medical, or emergency advice. If you are in immediate danger, call 112.</span>
          <span>Prototype build · Not end-to-end encrypted · No automatic reporting</span>
        </div>
      </div>
    </footer>
  </div>`;

  return {
    html,
    mount(root) {
      const startButtons = [root.querySelector('#start-new-case'), root.querySelector('#report-top')];
      startButtons.forEach((btn) => btn?.addEventListener('click', () => startNew(btn, navigate)));

      const continueHandler = async (button) => {
        setBusy(button, true, 'Looking for cases…');
        try {
          const cases = await listCases();
          setBusy(button, false);
          if (state.caseId) {
            // Keep the currently stored case in the picker as well.
            if (!cases.some((c) => c.id === state.caseId)) cases.unshift({ id: state.caseId });
          }
          if (cases.length === 0) {
            casePicker([], navigate);
          } else if (cases.length === 1) {
            const only = cases[0];
            setActiveCase(only.id);
            navigate('#/dashboard');
          } else {
            casePicker(cases, navigate);
          }
        } catch (err) {
          setBusy(button, false);
          toast('danger', 'Could not load cases', err.message);
        }
      };
      root.querySelector('#continue-case')?.addEventListener('click', (e) => continueHandler(e.currentTarget));
      root.querySelector('#continue-case-top')?.addEventListener('click', (e) => continueHandler(e.currentTarget));

      root.querySelectorAll('[data-privacy-link]').forEach((btn) => {
        btn.addEventListener('click', openPrivacyModal);
      });
      root.querySelectorAll('[data-scroll]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = document.getElementById(btn.dataset.scroll);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  };
}
