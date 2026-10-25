# SHEild — Presentation Outline

**Tagline:** Your safety. Your story. Your next step.
**Format:** 8–10 slides, roughly 5 minutes plus questions.

## Slide 1 — The moment before the next step

**Headline:** When something happens online, the hardest part is often knowing what to do first.

- Harassment, impersonation, and image-based abuse arrive as scattered screenshots, links, messages, and fear.
- Existing advice is fragmented across platforms and authorities.
- People are asked to retell the same story, often before they feel ready.
- Many tools imply certainty — “AI detected”, “report filed” — when nothing has actually been verified or submitted.

**Speaker note:** Start with empathy, not features. This is a product about restoring a sense of control.

## Slide 2 — What SHEild is

**Headline:** One private place to document, review, prepare, and breathe.

- Six connected screens: Welcome, Report, Evidence Review, Case Dashboard, Take Action, Emotional Support.
- Documents what the person already has — no pressure to find more.
- Keeps original evidence separate from interpretation.
- Prepares editable reports without sending anything.
- Offers support that does not require a case or an explanation.

**Visual:** The welcome screen, or the six-screen montage.

## Slide 3 — The product promise

**Headline:** The person remains the author.

- Rule-based summaries only restate saved details.
- Every summary stays a draft until the person reads, edits, and confirms it.
- “Draft — not submitted” is visible wherever a report draft appears.
- The app never contacts a platform, police, or authority.
- Limits are written into the interface, not buried in a policy.

**Speaker note:** This is the ethical differentiator. We chose not to overclaim AI.

## Slide 4 — The journey (live demo cue)

**Headline:** From a difficult moment to a clearer next step.

1. Start a private case.
2. Document the incident in everyday language.
3. Upload a file or add a link.
4. Review the generated draft; correct and confirm it.
5. See the case come together on the dashboard.
6. Generate an editable report draft and use the checklist.
7. Open the support companion at any point.

**Speaker note:** Switch to the live demo here or play the recorded fallback.

## Slide 5 — Evidence review without false certainty

**Headline:** Keep the original. Question the summary.

- Files stored privately and served only through the access-token check.
- Original files are never edited.
- Automatic OCR is not configured; images stay images.
- The summary is built from saved fields and clearly labelled `RULE_BASED`.
- Missing details are surfaced, not invented.
- Confirmation is explicit and removes the draft state.

**Visual:** Evidence screen showing the “Human review required” panel.

## Slide 6 — Action without automation

**Headline:** Prepare. Decide. Send it yourself, only if you choose.

- Editable report draft generated from a confirmed incident.
- Copy or download the text; SHEild does not transmit it.
- Six-step checklist persists across sessions.
- Every successful save, upload, confirmation, rename, or checklist change produces one clear Continue action; it never appears before the operation succeeds.
- Official resources open in a separate context with a clear exit notice.
- The interface states what SHEild will not do.

**Visual:** Take Action screen showing the draft and “not submitted” badge.

## Slide 7 — Support that is available before the case

**Headline:** You do not have to do this alone.

- Guided check-in: scared, overwhelmed, angry, confused, unsure, or “I just need someone to listen”.
- Grounding exercise, trusted-person message planning, and official resources.
- Label: “Guided support — not AI or a counsellor.”
- Check-in content is not stored by default. Only feeling, action type, and time can be attached to a case, and only with opt-in.
- Standalone mode works without a case.

**Visual:** Support screen with the grounding / trusted-person thread.

## Slide 8 — Architecture and real persistence

**Headline:** A small system, built end to end.

- Vanilla SPA served by Spring Boot static resources.
- Fetch API with a bearer token.
- Layered backend: controller → service → repository → MySQL.
- Flyway migration; Hibernate validates the schema.
- Evidence files stored outside the public web root and streamed through an authenticated endpoint.
- Case-level ownership checks on every request.
- Consistent JSON errors and server-side validation.

**Visual:** Architecture diagram from the README.

## Slide 9 — What we tested

**Headline:** Claim only what we ran.

- 4 Spring Boot/MockMvc integration tests against MySQL: full workflow, isolation, validation, support.
- Playwright desktop and mobile checks with no console errors or horizontal overflow.
- A full browser end-to-end run: new case → report → upload → review → confirm → draft → checklist → support.
- Tested evidence download, summary download, and reload persistence.

**Speaker note:** Mention one real bug found and fixed: a 404 route handler was clearing a valid session token; it now clears only the stale case reference.

## Slide 10 — Limits and next steps

**Headline:** A trustworthy prototype starts by naming its edges.

**Limits today**
- Anonymous browser token, not full authentication or recovery.
- No encryption at rest or end-to-end encryption.
- No AI provider, OCR, or media analysis.
- No automatic reporting or authority integration.
- No production backup, retention, malware scanning, or audit logging.

**Next steps**
- Real accounts with recovery and device management.
- Encryption at rest and audited access.
- Optional, consent-based local OCR with confidence labels.
- Human-reviewed content moderation / safety escalation design.
- Trauma-informed usability research and accessibility audit.
- Retention controls, export packages, and secure deletion verification.

**Close:** “SHEild does not promise to fix everything. It helps someone keep their story intact and choose their next step.”

## Likely questions and concise answers

**Is this really AI?**
No. This build uses deterministic rule-based summaries and support content. No external AI model or OCR is configured, and the UI says so. The architecture leaves room for a consent-based provider later.

**Does it report to police or platforms?**
No. It prepares text and links to official channels. The person submits anything themselves.

**How is evidence protected?**
Private directory, generated filenames, authenticated download endpoint, no-store headers, type/size validation, and ownership checks. It is not encrypted at rest.

**What happens if someone clears their browser?**
The anonymous token is gone and the case cannot be recovered in this build. That limitation is shown in the privacy notice and README.

**What is the strongest part?**
The honesty layer: drafts are plainly drafts, support is plainly guided, and the product refuses to act behind the person's back.
