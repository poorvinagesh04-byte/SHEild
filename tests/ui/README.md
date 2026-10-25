# Browser end-to-end check

This Playwright script drives a real browser against a running SHEild instance. It creates a new anonymous session, documents an incident, uploads a text file, confirms the generated review, saves an edited report draft, checks checklist persistence, and uses the support companion.

## Requirements

- SHEild running at `http://localhost:8080` (override with `BASE_URL`).
- Node.js 18+.
- Google Chrome installed. Set `CHROME_PATH` if it is not in a standard location.

## Run

```bash
cd tests/ui
npm install
npm run e2e
```

If Chrome is at a custom path:

```powershell
$env:CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run e2e
```

The script writes screenshots to `tests/ui/output/`. It uses only synthetic content and never prints the access token. It is intentionally separate from the Maven test lifecycle because it needs a running application and browser.

The Spring Boot integration suite is the authoritative backend check:

```bash
./mvnw test
```
