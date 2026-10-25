const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });
const evidenceFile = path.join(os.tmpdir(), 'sheild-e2e-evidence.txt');
fs.writeFileSync(evidenceFile, 'Synthetic end-to-end evidence created by the Playwright test. Not a real message.');

const launchOptions = process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH }
  : { channel: 'chrome' };

(async () => {
  const browser = await chromium.launch({ ...launchOptions, headless: true });
  const issues = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') issues.push('console: ' + msg.text()); });
  page.on('pageerror', (err) => issues.push('pageerror: ' + err.message));
  page.on('response', (res) => { if (res.status() >= 500) issues.push(`HTTP ${res.status()}: ${res.url()}`); });

  // 0. Support is usable before any case exists.
  await page.goto(`${BASE}/#/support`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.feeling-grid');
  const standalone = await page.locator('.support-standalone-nav').count();
  console.log('STANDALONE SUPPORT', standalone === 1);
  if (standalone !== 1) throw new Error('Support did not open in standalone mode without a case');

  // 1. Fresh browser: start a brand-new case from the welcome screen.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#start-new-case');
  await page.click('#start-new-case');
  await page.waitForSelector('#incident-form', { timeout: 15000 });
  await page.waitForFunction(() => location.hash.startsWith('#/report'));
  const caseId = await page.evaluate(() => localStorage.getItem('sheild.caseId'));
  console.log('NEW CASE ID', caseId);

  // 2. Unsaved form wording survives leaving and returning to the screen.
  await page.fill('#description', 'Unsaved wording that should be restored when I return to this form.');
  await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.case-hero h1');
  await page.goto(`${BASE}/#/report`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#incident-form');
  const restoredText = await page.inputValue('#description');
  const restoreBanner = await page.locator('#restore-banner:not(.hidden)').count();
  console.log('UNSAVED FORM RESTORED', {
    textMatches: restoredText.includes('Unsaved wording'),
    bannerVisible: restoreBanner === 1
  });
  if (!restoredText.includes('Unsaved wording')) throw new Error('Unsaved report wording was not restored');
  if (restoreBanner !== 1) throw new Error('Restore banner was not shown');

  // 3. Fill the report form and attach a real text file.
  await page.check('input[name="incidentType"][value="IMPERSONATION"]');
  await page.check('input[name="platform"][value="WHATSAPP"]');
  await page.fill('#profileUrl', 'https://example.com/synthetic-profile');
  await page.fill('#occurredAt', '2026-10-20T14:30');
  await page.fill('#description', 'A synthetic profile copied my name and photograph and messaged two contacts asking for money. I did not create the profile and asked the contacts to block it.');
  await page.fill('#impactNotes', 'The profile reappeared twice this week. I feel anxious opening messages and have changed my privacy settings.');
  await page.setInputFiles('#evidence-files', evidenceFile);
  await page.waitForSelector('.file-chip');

  // 2b. Saving a draft shows a Continue panel and keeps the case selected.
  await page.click('#save-draft');
  await page.waitForSelector('#continue-slot .continue-panel', { timeout: 15000 });
  const reportDraftPanel = (await page.textContent('#continue-slot .continue-panel')).trim();
  const draftHash = await page.evaluate(() => location.hash);
  console.log('REPORT DRAFT CONTINUE', {
    shown: reportDraftPanel.includes('Draft saved'),
    hash: draftHash
  });
  if (!reportDraftPanel.includes('Draft saved')) throw new Error('Report draft Continue panel was not shown');
  if (!draftHash.startsWith('#/report?incident=')) throw new Error('Report draft did not keep the incident reference');
  await page.click('#continue-slot .continue-action');
  await page.waitForSelector('.case-hero h1');
  await page.goto(`${BASE}/${draftHash}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#incident-form');
  await page.setInputFiles('#evidence-files', evidenceFile);
  await page.waitForSelector('.file-chip');

  // 3. Submit the report and show the incident Continue panel on review.
  await page.click('#submit-incident');
  await page.waitForSelector('#review-text', { timeout: 20000 });
  await page.waitForSelector('#continue-slot .continue-panel', { timeout: 10000 });
  await page.waitForTimeout(600);
  const reviewText = await page.inputValue('#review-text');
  const evidenceCount = await page.locator('.evidence-item').count();
  const incidentPanel = (await page.textContent('#continue-slot .continue-panel')).trim();
  console.log('REVIEW GENERATED', {
    chars: reviewText.length,
    mentionsPlatform: reviewText.includes('WhatsApp'),
    evidenceCount,
    continueShown: incidentPanel.includes('Incident saved')
  });
  if (!reviewText.includes('synthetic')) throw new Error('Review did not use the entered description');
  if (evidenceCount !== 1) throw new Error('Expected one uploaded evidence item');
  if (!incidentPanel.includes('Incident saved')) throw new Error('Incident Continue panel was not shown');

  // 3b. Uploading and deleting evidence each show a Continue panel after reload.
  await page.setInputFiles('#evidence-file', evidenceFile);
  await page.fill('#evidence-note', 'Synthetic continuation-test upload.');
  await page.click('#upload-evidence');
  await page.waitForFunction(() => document.querySelector('#continue-slot .continue-panel')?.textContent.includes('Evidence stored privately'), null, { timeout: 20000 });
  const afterUploadCount = await page.locator('.evidence-item').count();
  await page.locator('[data-delete]').last().click();
  await page.waitForSelector('[data-confirm]');
  await page.click('[data-confirm]');
  await page.waitForFunction(() => document.querySelector('#continue-slot .continue-panel')?.textContent.includes('Evidence item deleted'), null, { timeout: 20000 });
  const afterDeleteCount = await page.locator('.evidence-item').count();
  console.log('EVIDENCE CONTINUE', { afterUploadCount, afterDeleteCount });
  if (afterUploadCount !== 2) throw new Error('Evidence upload did not add a second item');
  if (afterDeleteCount !== 1) throw new Error('Evidence delete did not remove the uploaded item');

  // 4. Confirm the reviewed summary, then use Continue to reach the dashboard.
  await page.check('#confirm-check');
  if (!(await page.isEnabled('#confirm-summary'))) {
    throw new Error('Confirm button stayed disabled after checking the box');
  }
  await page.click('#confirm-summary');
  await page.waitForFunction(() => document.querySelector('#continue-slot .continue-panel')?.textContent.includes('Summary confirmed'), null, { timeout: 15000 });
  const confirmPanel = (await page.textContent('#continue-slot .continue-panel')).trim();
  console.log('CONFIRM CONTINUE', {
    shown: confirmPanel.includes('Summary confirmed'),
    stillOnReview: (await page.locator('#review-panel').count()) === 1
  });
  if (!confirmPanel.includes('Summary confirmed')) throw new Error('Confirm Continue panel was not shown');
  if ((await page.locator('#confirmed-view').count()) !== 1) throw new Error('Confirmed summary was not rendered');
  await page.click('#continue-slot .continue-action');
  await page.waitForSelector('.case-hero h1', { timeout: 15000 });
  await page.waitForFunction(() => location.hash === '#/dashboard');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const stats = await page.$$eval('.hero-stat strong', (els) => els.map((e) => e.textContent.trim()));
  console.log('DASHBOARD AFTER CONFIRM', { stats });
  if (stats[0] !== '1' || stats[1] !== '1' || stats[2] !== '1') {
    throw new Error('Dashboard counts were not 1/1/1: ' + stats.join('/'));
  }
  await page.screenshot({ path: path.join(OUT, 'e2e-dashboard.png'), fullPage: true });

  // 5. Rename from the dashboard, then use the resulting Continue action.
  await page.click('#rename-case');
  await page.waitForSelector('#case-title-input');
  await page.fill('#case-title-input', 'E2E renamed safety case');
  await page.click('#save-rename');
  await page.waitForFunction(() => document.querySelector('#continue-slot .continue-panel')?.textContent.includes('Case title updated'), null, { timeout: 10000 });
  const renamePanel = (await page.textContent('#continue-slot .continue-panel')).trim();
  const renamedTitle = (await page.textContent('.case-hero h1')).trim();
  console.log('DASHBOARD RENAME CONTINUE', {
    shown: renamePanel.includes('Case title updated'),
    renamed: renamedTitle === 'E2E renamed safety case'
  });
  if (!renamePanel.includes('Case title updated')) throw new Error('Rename Continue panel was not shown');
  if (renamedTitle !== 'E2E renamed safety case') throw new Error('Renamed case title did not render');
  await page.click('#continue-slot .continue-action');
  await page.waitForFunction(() => location.hash.startsWith('#/action'));

  // 6. Generate and edit a report draft.
  await page.waitForSelector('#generate-draft', { timeout: 15000 });
  await page.click('#generate-draft');
  await page.waitForSelector('#draft-content', { timeout: 15000 });
  const draftBefore = await page.inputValue('#draft-content');
  await page.fill('#draft-title', 'E2E draft — synthetic impersonation');
  await page.fill('#draft-content', draftBefore + '\n\nEdited during the end-to-end UI test.');
  await page.click('#save-draft');
  await page.waitForFunction(() => document.querySelector('#draft-state')?.textContent.includes('Saved'), null, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#continue-slot .continue-panel')?.textContent.includes('Draft saved'), null, { timeout: 10000 });
  const draftPanel = (await page.textContent('#continue-slot .continue-panel')).trim();
  const savedBody = await page.inputValue('#draft-content');
  console.log('DRAFT SAVED', {
    title: await page.inputValue('#draft-title'),
    hasEdit: savedBody.includes('Edited during the end-to-end UI test'),
    notSubmitted: await page.locator('.not-submitted').count(),
    continueShown: draftPanel.includes('Draft saved')
  });
  if (!savedBody.includes('Edited during the end-to-end UI test')) throw new Error('Draft edit did not persist');
  if (!draftPanel.includes('Draft saved')) throw new Error('Draft Continue panel was not shown');

  // 7. Checklist persists after reload.
  const check = page.locator('[data-checklist]').first();
  const checklistId = await check.getAttribute('data-checklist');
  await check.check();
  await page.waitForFunction(() => document.querySelector('#continue-slot .continue-panel')?.textContent.includes('Step marked complete'), null, { timeout: 10000 });
  const checklistPanel = (await page.textContent('#continue-slot .continue-panel')).trim();
  console.log('CHECKLIST CONTINUE', { shown: checklistPanel.includes('Step marked complete') });
  if (!checklistPanel.includes('Step marked complete')) throw new Error('Checklist Continue panel was not shown');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#draft-content');
  const persisted = await page.isChecked(`[data-checklist="${checklistId}"]`);
  console.log('CHECKLIST PERSISTS', persisted);
  if (!persisted) throw new Error('Checklist item did not persist');

  // 7b. The official-channels recommendation reveals working, correctly-labelled resources.
  const resourceJump = page.locator('[data-resource-jump]').first();
  const resourceJumpHref = await resourceJump.getAttribute('href');
  if (resourceJumpHref !== '#/action?focus=resources') {
    throw new Error('Official-channels recommendation has the wrong target: ' + resourceJumpHref);
  }
  await resourceJump.click();
  await page.waitForFunction(() => document.querySelector('#channel-cybercrime')?.open === true, null, { timeout: 10000 });
  await page.waitForTimeout(900);
  const revealed = await page.evaluate(() => {
    const section = document.querySelector('#official-channels');
    const firstSummary = section?.querySelector('summary');
    return {
      top: Math.round(section.getBoundingClientRect().top),
      focused: document.activeElement === firstSummary,
      externalNotes: [...section.querySelectorAll('.resource-meta')].map((el) => el.textContent.trim())
    };
  });
  console.log('OFFICIAL CHANNELS REVEALED', revealed);
  if (revealed.top < 0 || revealed.top > 450) throw new Error('Official channels did not scroll into view');
  if (!revealed.focused) throw new Error('First official-channel summary did not receive keyboard focus');
  if (!revealed.externalNotes.some((note) => note.includes('opens in a new tab'))) {
    throw new Error('External-link disclosure was not shown');
  }

  const expectedChannels = {
    cybercrime: 'www.cybercrime.gov.in',
    instagram: 'help.instagram.com',
    facebook: 'www.meta.com',
    whatsapp: 'www.whatsapp.com'
  };
  const openedChannels = [];
  for (const [channelId, expectedHost] of Object.entries(expectedChannels)) {
    const details = page.locator(`#channel-${channelId}`);
    if (!(await details.evaluate((el) => el.open))) await details.locator('summary').click();
    const link = details.locator('a.resource-link');
    const href = await link.getAttribute('href');
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 15000 }),
      link.click()
    ]);
    const popupUrl = popup.url();
    openedChannels.push({ channelId, href, popupUrl });
    if (!href || !href.startsWith('https://')) throw new Error(`Channel ${channelId} does not use HTTPS`);
    if (!popupUrl.includes(expectedHost)) throw new Error(`Channel ${channelId} opened ${popupUrl}, expected ${expectedHost}`);
    await popup.close();
    const storedCase = await page.evaluate(() => localStorage.getItem('sheild.caseId'));
    if (!storedCase) throw new Error('Case was lost after opening ' + channelId);
  }
  console.log('OFFICIAL DESTINATIONS', openedChannels);

  const urgent = page.locator('#channel-urgent');
  if (!(await urgent.evaluate((el) => el.open))) await urgent.locator('summary').click();
  const phoneActions = await urgent.locator('.phone-line a').evaluateAll((links) => links.map((link) => ({
    href: link.getAttribute('href'),
    text: link.textContent.trim()
  })));
  const phoneDisclosure = (await urgent.locator('.resource-meta').textContent()).trim();
  console.log('OFFICIAL PHONE ACTIONS', { phoneActions, phoneDisclosure });
  if (phoneActions.map((item) => item.href).join(',') !== 'tel:112,tel:181,tel:1930') {
    throw new Error('Official phone actions are incorrect');
  }
  if (!phoneDisclosure.includes('SHEild does not place the call')) {
    throw new Error('Phone-call disclosure is missing');
  }
  // Headless Chrome hands tel: links to the operating system, so verify the
  // dial target and disclosure rather than firing an external call handler.
  await page.screenshot({ path: path.join(OUT, 'e2e-official-channels.png'), fullPage: true });

  // 7. Use the support companion with the new case open.
  await page.goto(`${BASE}/#/support`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.feeling-grid');
  await page.click('[data-feeling="OVERWHELMED"]');
  await page.waitForSelector('.companion-bubble');
  await page.waitForSelector('#support-options [data-action]');
  await page.click('[data-action="TRUSTED_PERSON"]');
  await page.waitForFunction(() => document.querySelector('#support-thread')?.textContent.includes('A short message you could adapt'), null, { timeout: 10000 });
  const metadata = await page.textContent('#support-metadata');
  console.log('SUPPORT', { metadata: metadata.trim() });
  if (!metadata.includes('unless you choose to attach it')) throw new Error('Support opt-in message was not shown');
  await page.screenshot({ path: path.join(OUT, 'e2e-support.png') });

  // 8. Reload the case and confirm the new record survived.
  await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.case-hero h1');
  console.log('PERSISTED TITLE', (await page.textContent('.case-hero h1')).trim());

  // 9. A second saved incident produces a connection update with its own Continue panel.
  const secondIncident = await page.evaluate(async () => {
    const token = localStorage.getItem('sheild.accessToken');
    const caseId = localStorage.getItem('sheild.caseId');
    const res = await fetch(`/api/cases/${caseId}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        incidentType: 'IMPERSONATION',
        platform: 'WHATSAPP',
        profileUrl: null,
        additionalUrls: [],
        description: 'A second synthetic impersonation incident on WhatsApp, created by the continuation E2E check.',
        occurredAt: null,
        impactNotes: null,
        draft: false
      })
    });
    return res.ok ? res.json() : { error: await res.text(), status: res.status };
  });
  if (secondIncident.error) throw new Error('Could not create the second incident: ' + secondIncident.error);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-connection-confirm]', { timeout: 15000 });
  await page.locator('[data-connection-confirm]').first().click();
  await page.waitForFunction(() => document.querySelector('#continue-slot .continue-panel')?.textContent.includes('Connection noted'), null, { timeout: 15000 });
  const connectionPanel = (await page.textContent('#continue-slot .continue-panel')).trim();
  const confirmedConnections = await page.locator('.connection-card.confirmed').count();
  console.log('CONNECTION CONTINUE', {
    shown: connectionPanel.includes('Connection noted'),
    confirmedConnections
  });
  if (!connectionPanel.includes('Connection noted')) throw new Error('Connection Continue panel was not shown');
  if (confirmedConnections < 1) throw new Error('Confirmed connection was not rendered');

  console.log('ISSUES', issues);
  if (issues.length) throw new Error('Browser issues: ' + issues.join(' | '));
  await browser.close();
  console.log('E2E PASS');
})().catch((err) => { console.error(err); process.exit(1); });
