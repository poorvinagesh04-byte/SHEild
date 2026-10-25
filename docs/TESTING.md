# SHEild — Testing Record

**Last verified:** 24 October 2026
**Verified by:** local build and browser runs during development

## Environment

| Component | Version / detail |
| --- | --- |
| OS | Windows (win32) |
| Java runtime | Java 27 (project target: Java 17) |
| Spring Boot | 3.5.16 |
| Hibernate | 6.6.53.Final |
| Maven | 3.9.9 via included Maven Wrapper |
| MySQL | 8.0.46 on `127.0.0.1:3307` |
| Application DB | `shield` |
| Test DB | `shield_test` |
| Browser | Google Chrome, headless via Playwright |
| Frontend test viewports | 1440 x 1000 desktop; 1180 x 1000 laptop; 1024 x 900 laptop; 768 x 1000 tablet; 390 x 844 mobile |

## Automated backend tests

Command:

```bash
./mvnw test
```

Result: **BUILD SUCCESS — 4 tests run, 0 failures, 0 errors, 0 skipped.**

The suite is `src/test/java/com/sheild/SheildApiIntegrationTest.java` and uses `src/test/resources/application-test.properties` with the separate `shield_test` database.

| Test | What it proves |
| --- | --- |
| `fullCaseWorkflowPersistsAcrossRequests` | Session → case → incident with two documented URLs → TXT upload → authenticated file download → rule-based review → confirmation → draft generation → draft edit → checklist update → dashboard aggregation → summary download. Asserts the summary contains the “not a report” disclosure, the draft remains unsubmitted, and persisted values survive subsequent requests. |
| `caseDataIsIsolatedBetweenAccessTokens` | A second valid anonymous token receives `404` for another person's case; missing and invalid tokens receive `401`; the second token sees an empty case list. |
| `invalidIncidentAndUnsafeUploadAreRejected` | Empty incident description returns a field-level `400`; an `.exe` upload is rejected; review generation still returns missing-detail information. |
| `supportIsLabelledAsGuidedAndOnlyStoredWhenOptedIn` | Support mode is `GUIDED_RULE_BASED`, the label explicitly says it is not AI or a counsellor, metadata is not stored by default, resources include `112`, the five guided actions are returned, and opt-in metadata works with a case. |

The test database was created once with:

```sql
CREATE DATABASE shield_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON shield_test.* TO 'shield'@'%';
FLUSH PRIVILEGES;
```

## Browser end-to-end test

Location: `tests/ui/e2e-check.js`
Command:

```powershell
cd tests/ui
npm install
$env:CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run e2e
```

Result: **E2E PASS — no console errors, no page errors, no HTTP 5xx responses.**

Verified flow on a completely fresh browser profile:

0. Support opened in standalone mode before any case existed.
1. New anonymous session and new case created from the welcome screen.
2. Partially written report text was restored after leaving for the dashboard and returning, with the restore banner visible.
3. Report form completed with an impersonation incident, WhatsApp platform, profile URL, date, description, and impact notes.
4. **Save draft** produced a “Draft saved to your case” Continue panel. The retained incident reference reopened the filled record from the database.
5. Submitting the report uploaded the synthetic text file and opened evidence review. The review draft included the platform and entered wording; one evidence item was present. The “Incident saved” Continue panel was shown.
6. A second evidence file was uploaded and produced an “Evidence stored privately” Continue panel after the screen reloaded. Deleting it produced an “Evidence item deleted” panel and returned the library to one item.
7. Confirmation checkbox enabled the confirm button. Confirmation stayed on the review screen, rendered the confirmed summary, and showed the “Summary confirmed” Continue panel. Clicking **Continue to my case** opened the dashboard with **1 incident / 1 evidence / 1 reviewed / 0-of-6 checklist**.
8. Renaming the case from the dashboard produced “Case title updated” after the save completed. The renamed title rendered, and its Continue action opened the next step.
9. Report draft generated, title and body edited, and saved. The “Draft saved to your case” Continue panel appeared and the “not submitted” badge remained visible.
10. Checklist item checked. The “Step marked complete” Continue panel appeared, and after a full page reload the checkbox was still checked.
10b. **See reporting resources** was activated. Take Action scrolled to the official-channels section, opened the first channel, and moved keyboard focus to its summary. Each external channel was clicked and opened in a separate tab at the expected official destination. The current case remained selected after every tab was closed. Phone links exposed `tel:112`, `tel:181`, and `tel:1930` without claiming SHEild placed the call.
11. Support companion opened, `Overwhelmed` selected, trusted-person plan rendered, and the no-storage metadata note shown.
12. Dashboard reloaded with the renamed case and saved records still present.
13. A second synthetic incident was saved, producing a suggested connection. Confirming it produced the “Connection noted” Continue panel and the confirmed connection card.

The script creates synthetic files only and does not print the access token.

### Continue workflow assertions

The latest run reported:

```text
REPORT DRAFT CONTINUE { shown: true }
REVIEW GENERATED { continueShown: true }
EVIDENCE CONTINUE { afterUploadCount: 2, afterDeleteCount: 1 }
CONFIRM CONTINUE { shown: true, stillOnReview: true }
DASHBOARD RENAME CONTINUE { shown: true, renamed: true }
DRAFT SAVED { continueShown: true, notSubmitted: 1 }
CHECKLIST CONTINUE { shown: true }
OFFICIAL CHANNELS REVEALED { focused: true }
OFFICIAL DESTINATIONS [ cybercrime, instagram, facebook, whatsapp ]
OFFICIAL PHONE ACTIONS [ tel:112, tel:181, tel:1930 ]
SUPPORT { metadata: 'Nothing from a check-in is saved unless you choose to attach it to your case.' }
CONNECTION CONTINUE { shown: true, confirmedConnections: 1 }
ISSUES []
E2E PASS
```

### Official-channel destinations verified

The browser was allowed to navigate to each destination rather than only checking the `href`. The popup host matched in every case:

| Channel | Destination opened | Result |
| --- | --- | --- |
| National Cyber Crime Reporting Portal | `https://www.cybercrime.gov.in/` | Official Government of India portal |
| Instagram Help Centre | `https://help.instagram.com/2922067214679225` | Official Instagram reporting guidance |
| Meta Safety Centre | `https://www.meta.com/safety` (redirects to Meta Safety Centre) | Official Meta safety pages |
| WhatsApp Security and Safety | `https://www.whatsapp.com/security` | Official WhatsApp security and safety tools |
| Emergency / Women's / Cyber Crime Helpline | `tel:112`, `tel:181`, `tel:1930` | Dial targets only; headless Chrome cannot place a call |

Every external control is labelled **External website · opens in a new tab · SHEild sends nothing for you**. Phone controls state **Starts a call in your phone app when you choose it · SHEild does not place the call**. No incident details, case reference, or token are appended to any external URL.

> One automated popup of `cybercrime.gov.in` received the portal's bot-protection page with the title “Access Denied”. A separate direct browser check returned HTTP 200 with the title “Cybercrime Portal”. The destination itself is correct; no human-verification bypass was attempted.

### Six-screen responsive sweep

A Playwright sweep loaded every screen with a populated case at five widths and checked document width, element bounds, card padding, and page-level overflow:

| Viewport | Dashboard | Report | Evidence | Action | Support | Welcome | Page overflow |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 px | pass | pass | pass | pass | pass | pass | 0 px |
| 1180 px | pass | pass | pass | pass | pass | pass | 0 px |
| 1024 px | pass | pass | pass | pass | pass | pass | 0 px |
| 768 px | pass | pass | pass | pass | pass | pass | 0 px |
| 390 px | pass | pass | pass | pass | pass | pass | 0 px |

At 390 px, one long draft-title `<input>` has a wider internal text scroll width than its box, which is normal input behaviour; it does not widen the page. No interactive control, card, or navigation item was off-screen. The sweep reported **ISSUES []** for console errors, page errors, and HTTP 5xx responses.

Screenshots were regenerated from this build: desktop screens 01-06, mobile screens, and `09-official-channels.png`.

## Earlier desktop/mobile UI sweep

A separate Playwright sweep checked the seeded case (2 incidents, 1 evidence item, 2 confirmed reviews, 3/6 checklist, 1 draft, 1 connection):

- Dashboard title and counts rendered correctly (`2`, `1`, `2`, `3/6`).
- Case summary downloaded as a real `.txt` file containing the case reference and the “not a report” disclosure.
- Protected text evidence preview loaded through the authenticated endpoint.
- Action screen showed 3 suggestions, 5 official resources, 6 checklist items, and the unsubmitted draft.
- Draft save showed the saved state; checklist change persisted after reload.
- Support reply and grounding exercise rendered; metadata note shown.
- Report screen loaded an existing incident with its saved description.
- Desktop and mobile screens had **no horizontal overflow**.
- Console issues: **none**.

Screenshots from this verified build are in `docs/screenshots/`.

## Bugs found and fixed during verification

| Issue | Fix |
| --- | --- |
| The SPA 404 handler cleared the entire session token, not just the stale case reference, after a deleted/unknown case. | `app.js` now calls `setActiveCase(null)` and keeps the valid anonymous token. |
| A shared privacy modal helper was imported from a screen module, creating a fragile dependency. | Moved `openPrivacyModal` to `ui.js`. |
| Programmatically focused route headings showed a pink focus ring in screenshots and could look like a broken input. | Added `[tabindex="-1"]:focus { outline: none; }` while retaining focus-visible outlines for interactive controls. |
| Report draft titles and a confirmation separator contained inconsistent dash characters. | Standardised user-facing copy with em dashes. |
| Support reply rendering could be counted incorrectly by tests because the intro bubble is replaced after the first response. | Tests now wait for the user bubble + companion bubble sequence. |
| A confirmation test read the previous evidence-delete banner before the asynchronous confirm response replaced it. | The browser test now waits for the new “Summary confirmed” text instead of only for the panel element. |
| The dashboard cards lacked a consistent internal gutter and some card-header actions could wrap unevenly. | Added dashboard-scoped card padding, grid wrapping, long-text wrapping, and consistent compact button heights; responsive width checks now assert zero overflow. |
| Take Action and Evidence Review main cards had **0 px padding**, unlike the 24 px dashboard cards, so headings and content sat against the card border. | Added scoped card padding for both layout stacks and preserved the full-bleed draft editor with an explicit zero-padding override. |
| The report file picker was `display: inline`, so its dashed top and bottom borders disappeared and its box behaved like an inline fragment. | Set the dropzone to `display: block`; it now renders as a complete rounded drop target. |
| Support content was capped at 880-980 px and centred while every other screen started at the shared 24 px card gutter, producing a different left edge and card width. | Removed the standalone max-width caps so the support hero, emergency note, main card, resources, and disclaimer use the same content container as the other screens. |
| At tablet width the dashboard's last side card sat alone at half width; the report aside's third card also left an empty column. | Made the final odd card span both columns and let the third report-aside card span the full row. |
| The desktop sidebar disappeared only below 1080 px, leaving 1180 px laptops with a cramped 902 px main column. | Moved the shell breakpoint to 1180 px; laptop widths now use the compact top bar and full-width content. |
| **See reporting resources** linked to `#/action`. From Take Action it re-rendered the same route without scrolling to or expanding the resource list, so the official-channel feature appeared inert. | The recommendation now links to `#/action?focus=resources`; a same-page click handler opens the first channel, scrolls the section into view, and focuses the summary. |
| Some official links pointed at generic or outdated redirects (WhatsApp `/safety` landed on the privacy page; Facebook `/safety` redirected to Meta). | Replaced them with verified reporting/security destinations and added an official external-link disclosure plus phone-call disclosure. |

## Not tested / not verified

- **Docker Compose path** was not executed because Docker is not installed in the verification environment. The `Dockerfile` and `docker-compose.yml` are provided for portability but should be smoke-tested in a Docker-capable environment before a live demo.
- No load, penetration, accessibility-audit, malware-scanning, or backup/restore testing was performed.
- No mobile physical-device test was performed; responsive behaviour was checked in Chrome at 390 × 844.
- No external AI provider, OCR service, platform API, or authority integration exists to test.
- Email/SMS notifications, multi-user sharing, and account recovery are not implemented.

## How to reproduce the key checks

```bash
# 1. Backend integration tests (requires shield_test database)
./mvnw test

# 2. Package the application
./mvnw -DskipTests package

# 3. Run it against local MySQL
./scripts/run-local.ps1

# 4. Health
curl http://localhost:8080/api/health

# 5. Browser end-to-end check
cd tests/ui && npm install && npm run e2e
```
