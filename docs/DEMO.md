# SHEild — Five-Minute Demo Plan

## Goal

Show one coherent journey — **document → review → confirm → act → support** — while making the privacy boundaries visible. Do not rush through every field. The story is control, not feature count.

## Before the demo (10 minutes prior)

- [ ] Start MySQL and the app (`docker compose up --build` or `./scripts/run-local.ps1`).
- [ ] Open <http://localhost:8080/api/health> and confirm `database: ok`.
- [ ] Use a clean browser profile or clear site data for `localhost:8080`.
- [ ] Prepare one small synthetic text file named `synthetic-message.txt`.
- [ ] Keep `docs/screenshots/` open in a second window as a fallback.
- [ ] Do not use real personal data, real account handles, or sensitive images.
- [ ] Close notifications and unrelated tabs.
- [ ] Set browser zoom to 100% and a 1440 × 900 window.

## Five-minute script

### 0:00–0:35 — Welcome

- Open the welcome screen.
- Point to the tagline: **“Your safety. Your story. Your next step.”**
- Say: “SHEild is for the moment after something happens online, when the advice is scattered and you are not sure what to keep or what to do.”
- Point to the three promises: your pace, your evidence, your support.
- Click **Report a New Incident**.

### 0:35–1:40 — Document the incident

- Choose **Impersonation or fake profile**.
- Choose **Instagram**.
- Add a synthetic profile URL.
- Leave the date or set an approximate date. Say: “A partial answer is enough.”
- Enter a short synthetic description.
- Add an impact note about repetition.
- Attach `synthetic-message.txt`.
- Say: “Files are optional, originals are never edited, and nothing is uploaded until I save.”
- Click **Continue to evidence review**.

### 1:40–2:35 — Review and confirm

- Point to **“Human review required”** and the rule-based draft.
- Read one sentence aloud, then change a word to show the person can correct it.
- Point to the provenance notes: no external AI, no OCR.
- Tick **“I have read and corrected this summary”**.
- Click **Confirm summary**.
- Say: “This is the trust boundary: the app drafts, the person confirms.”
- Point to the **Summary confirmed** panel. Click **Continue to my case** to open the dashboard; the button appears only after the save succeeds.

### 2:35–3:20 — Case dashboard

- Show the aggregate counts: incidents, evidence, reviewed, checklist.
- Point to the timeline and the evidence library.
- Mention that possible connections are exact-link suggestions, not conclusions.
- Click **Download summary** and show the disclaimer in the text file.
- Click **Take action**.

### 3:20–4:10 — Prepare, do not submit

- Show the suggested actions and the “not submitted” draft badge.
- If a draft already exists, open it; otherwise choose the confirmed incident and click **Generate editable draft**.
- Edit the title or one sentence.
- Click **Save changes**.
- Point to the “Draft saved to your case” panel and its single **Continue to my case** action. The draft is still marked “not submitted”.
- Tick one checklist item. The success panel updates to “Step marked complete”. Reload to show persistence, then use any visible case-navigation link to return to the dashboard.
- Point to the note: SHEild does not send, track, or contact anyone.

### 4:10–4:50 — Emotional support

- Open **Emotional support** from the sidebar.
- Choose **Overwhelmed**.
- Click **Plan a message to someone I trust**.
- Show the message the person could adapt.
- Point to the label: “Guided support — not AI or a counsellor.”
- Point to the metadata note: nothing is saved unless the person opts in.
- If time allows, open the grounding exercise.

### 4:50–5:00 — Close

- Return to the dashboard.
- Say: “SHEild does not file the report or make the decision. It keeps the story intact, keeps the person in control, and makes the next step smaller.”
- Invite questions.

## If something fails

| Problem | Recovery |
| --- | --- |
| App will not start | Show the checked screenshots in `docs/screenshots/`; explain the backend and tests from the README. |
| Database unavailable | Do not improvise data. Switch to the screenshots and the test record. |
| Upload fails | Continue without the file; the review still works and missing evidence is listed as a missing detail. This is a feature to point out. |
| Draft already exists | Use it, edit one sentence, and save. |
| Session appears empty | Start a new case; do not reuse a token from another browser profile. |
| Live demo overruns | Skip the checklist reload and go straight to support; the support screen is the emotional close. |

## Do not claim

- That an AI model analysed the evidence.
- That OCR reads images or PDFs.
- That a report was filed with a platform or authority.
- That the storage is encrypted or production-grade.
- That the case can be recovered after clearing browser data.

## Optional 30-second technical aside

“The frontend is vanilla JavaScript over a Spring Boot API. Cases, incidents, evidence metadata, drafts, and checklist state are in MySQL through JPA, with Flyway managing the schema. Evidence files sit outside the public web root and are streamed only after an ownership check. The automated suite covers the workflow, access isolation, validation, and support labels; the browser suite covers the actual clicks.”
