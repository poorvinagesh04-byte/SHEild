# SHEild — Your Safety. Your Story. Your Next Step.

SHEild is a cyber-safety companion designed to help people navigate online harassment, impersonation, cyberbullying, and image-based abuse. It brings incident documentation, evidence management, case summaries, report preparation, practical next steps, and emotional support together in one place.

The idea behind SHEild is simple: help people organize what happened, understand their options, and decide what to do next without taking control away from them.

**Live Demo:** [https://sheild-2.onrender.com/](https://sheild-2.onrender.com/)

> **Important:** SHEild is a hackathon prototype, not a replacement for professional advice or emergency services. Please use fictional, non-sensitive information when exploring the application.

## The Problem

When someone experiences online abuse, figuring out what to do next can be overwhelming. Evidence may be scattered across screenshots, messages, links, and notes. Finding reliable reporting channels takes time, and repeatedly explaining the same incident can make an already difficult situation even harder.

SHEild aims to bring these steps together in one organized, accessible, and supportive space.

## Our Approach

SHEild is built around three important principles:

- **You stay in control:** Users can review and edit their information before deciding how to use it.
- **Evidence stays separate from interpretation:** The application helps organize evidence and prepare draft summaries without treating automated interpretations as verified facts.
- **Nothing is reported automatically:** SHEild does not independently contact the police, notify authorities, or submit reports to online platforms.

Along with documentation tools, the application provides practical guidance and emotional-support exercises so users can explore their options at their own pace.

## Key Features

### 1. Welcome and Safety

Introduces SHEild, explains its limitations, and helps users start a new case or return to a case saved in the same browser.

### 2. Incident Reporting

Allows users to document incidents with descriptions, platform information, links, approximate times, and personal impact notes. Supporting evidence can also be attached.

### 3. Evidence Review

Organizes uploaded evidence and provides options to preview, download, or delete files. Users can review, edit, and confirm rule-based summary drafts.

### 4. Case Dashboard

Brings together incidents, evidence, saved summaries, report drafts, possible connections, and checklist progress. Users can also download a plain-text case summary.

### 5. Take Action

Provides practical next-step suggestions, editable report drafts, a progress checklist, and links to official support and reporting resources.

### 6. Emotional Support

Offers guided check-ins, grounding exercises, trusted-person planning, and support resources. Users can choose whether to associate check-in details with a case.

## Screenshots

The following screenshots illustrate the main screens of SHEild. They are expected to be available in the `docs/screenshots/` directory.

### Welcome Screen

![SHEild welcome screen](docs/screenshots/01-welcome.png)

### Case Dashboard and Evidence Review

| Case Dashboard | Evidence Review |
| --- | --- |
| ![Case dashboard](docs/screenshots/02-dashboard.png) | ![Evidence review](docs/screenshots/03-evidence-review.png) |

### Take Action and Emotional Support

| Take Action | Emotional Support |
| --- | --- |
| ![Take action](docs/screenshots/04-action.png) | ![Emotional support](docs/screenshots/05-support.png) |

### Incident Reporting and Continued Workflow

| Report an Incident | Continue After an Update |
| --- | --- |
| ![Report an incident](docs/screenshots/06-report.png) | ![Continue after a successful case update](docs/screenshots/08-continue-after-update.png) |

### Official Reporting Channels

![Official reporting channels](docs/screenshots/09-official-channels.png)

### Mobile Screens

| Dashboard | Evidence Review | Take Action | Emotional Support |
| --- | --- | --- | --- |
| ![Mobile dashboard](docs/screenshots/mobile-01-dashboard.png) | ![Mobile evidence review](docs/screenshots/mobile-02-evidence.png) | ![Mobile action](docs/screenshots/mobile-03-action.png) | ![Mobile support](docs/screenshots/mobile-04-support.png) |

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | HTML5, CSS3, JavaScript modules, Fetch API |
| Backend | Java, Spring Boot, Spring Web |
| Data Access | Spring Data JPA, Hibernate |
| Database | MySQL 8 |
| Database Migrations | Flyway |
| Build Tools | Maven, Maven Wrapper |
| Testing | JUnit 5, Spring Boot Test, MockMvc, Playwright |

The frontend uses a lightweight, responsive interface with hash-based navigation. The backend provides REST APIs for managing cases, incidents, evidence, summaries, report drafts, checklists, and support interactions.

## System Architecture

The application follows a straightforward flow:

```text
User
  |
  v
Frontend
HTML, CSS, JavaScript
  |
  v
REST API
Spring Boot
  |
  v
Services and Access Checks
  |
  +---------------------+
  |                     |
  v                     v
MySQL Database     Private Evidence Storage
```

The backend is organized into controllers, services, repositories, entities, DTOs, and security components. This separation keeps request handling, application logic, validation, and data access organized.

### Project Structure

```text
src/main/java/com/sheild/
├── config/        Security headers and MVC configuration
├── controller/    REST API endpoints
├── domain/        Enums and status values
├── dto/           Request and response objects
├── entity/        Database entities
├── repository/    Spring Data JPA repositories
├── security/      Session-token handling and access checks
├── service/       Business logic and storage operations
└── web/           API errors and exception handling

src/main/resources/
├── db/migration/  Flyway database migrations
└── static/        Frontend pages, styles, fonts, and icons
```

### Data Model

```text
users
└── safety_cases
    ├── incidents
    │   ├── documented_urls
    │   ├── evidence
    │   ├── report_drafts
    │   └── incident_connections
    ├── checklist_items
    └── support_interactions
```

The model connects browser sessions with cases and their related records. Support interactions may store check-in metadata when the user chooses to associate it with a case.

## API Overview

The backend exposes REST endpoints for the application's main features.

| Method and Path | Purpose |
| --- | --- |
| `GET /api/health` | Database-aware health check |
| `POST /api/session` | Create an anonymous browser session |
| `GET /api/session/me` | Read current session information |
| `GET /api/cases` | List cases |
| `POST /api/cases` | Create a case |
| `GET /api/cases/{id}` | Read a case |
| `PUT /api/cases/{id}` | Rename or update a case |
| `DELETE /api/cases/{id}` | Delete a case |
| `GET /api/cases/{id}/dashboard` | Retrieve dashboard information |
| `GET /api/cases/{id}/incidents` | List incidents |
| `POST /api/cases/{id}/incidents` | Create an incident |
| `GET /api/incidents/{id}` | Read an incident |
| `PUT /api/incidents/{id}` | Update an incident |
| `POST /api/incidents/{id}/review` | Generate a rule-based review draft |
| `PUT /api/incidents/{id}/confirmed-summary` | Save a confirmed summary |
| `POST /api/incidents/{id}/evidence` | Upload evidence |
| `GET /api/incidents/{id}/evidence` | List evidence |
| `GET /api/evidence/{id}` | Read evidence metadata |
| `GET /api/evidence/{id}/file` | Preview or download evidence |
| `DELETE /api/evidence/{id}` | Delete evidence |
| `GET /api/cases/{id}/urls` | List documented URLs |
| `GET /api/cases/{id}/connections` | List possible connections |
| `POST /api/connections/{id}` | Record a connection decision |
| `GET /api/cases/{id}/checklist` | Read checklist progress |
| `PUT /api/checklist/{itemId}` | Update checklist progress |
| `GET /api/cases/{id}/report-drafts` | List report drafts |
| `POST /api/incidents/{id}/report-drafts` | Generate a report draft |
| `PUT /api/report-drafts/{id}` | Save report draft edits |
| `GET /api/cases/{id}/summary` | Download a case summary |
| `POST /api/support/respond` | Get guided support content |

Except for the session-creation and health endpoints, API routes require the appropriate bearer-token authentication. Case-level access checks help prevent one browser session from accessing another session's information.

API details should be checked against the current implementation whenever endpoints change.

## Privacy and Security

Because SHEild handles potentially sensitive information, privacy is an important part of its design.

The current prototype includes the following safeguards:

- Randomly generated bearer tokens for anonymous browser sessions.
- SHA-256 hashing of session tokens before server-side storage.
- Ownership checks for case-related operations.
- Evidence storage outside the public static web directory.
- Server-generated filenames for uploaded evidence.
- File-type restrictions and a maximum evidence size of 10 MB.
- Protective response headers for evidence downloads.
- Security headers such as Content Security Policy and `X-Frame-Options`.
- Input validation on the server and client.
- URL normalization with HTTP and HTTPS restrictions.
- Removal of dependent records and associated evidence files when a case is deleted.

These safeguards are not a guarantee of production-grade security. Stronger authentication, encryption at rest, malware scanning, backups, and security monitoring would be important considerations for a production release.

## Demo Workflow

For a short demonstration, follow this sequence:

1. Open the [SHEild live demo](https://sheild-2.onrender.com/).
2. Start a new case.
3. Record a fictional online-abuse incident.
4. Attach a small sample evidence file.
5. Review and edit the summary.
6. Open the dashboard and explore the saved information.
7. Prepare an editable report draft and update the action checklist.
8. Explore the emotional-support section.
9. Explain how SHEild helps organize information while leaving decisions and reporting in the user's hands.

Use fictional information and sample files only. Avoid uploading real names, private conversations, passwords, sensitive images, or other personal information.

## Running and Deployment

### Live Application

**Live Demo:** [https://sheild-2.onrender.com/]

The deployed application depends on its configured backend and database services. If the demo is temporarily unavailable, the issue may be related to application startup, deployment, or database connectivity.

### Configuration

Database connection details, passwords, and evidence-storage paths should be configured through environment variables and deployment settings rather than committed to source code.

The environment variables and their defaults must match the application's actual configuration. Check `application.properties`, the test configuration, deployment settings, and any provided run scripts before changing them.

**Never commit real database passwords, API keys, or other secrets to GitHub.** Use placeholders in documentation and configure real credentials securely in the deployment environment.

### Docker and Local Development

The repository may include Docker Compose files and Maven Wrapper scripts for development. Before following those instructions, confirm that the relevant files exist and that their database, port, and storage settings match the current project.

For the deployed application, use the Render link above.

## Testing

The project includes backend integration tests and a Playwright browser end-to-end test.

The intended coverage includes:

- Session creation and bearer-token authentication.
- Case and incident creation and validation.
- Evidence upload, download, and deletion.
- Summary generation and confirmation.
- Report draft creation and editing.
- Checklist updates and dashboard aggregation.
- Access isolation between browser sessions.
- Support responses and reporting disclosures.
- Responsive layout checks across desktop and mobile screen widths.

### Running the Tests

Before running integration tests, verify that the test configuration points to a dedicated test database and not to live demo or production data.

**Windows PowerShell**

```powershell
.\mvnw.cmd test
```

**macOS or Linux**

```sh
./mvnw test
```

To build without running tests:

**Windows PowerShell**

```powershell
.\mvnw.cmd -DskipTests package
```

**macOS or Linux**

```sh
./mvnw -DskipTests package
```

These commands assume the Maven Wrapper scripts are present in the repository. Browser end-to-end tests also require the appropriate Node.js dependencies, browser installation, and test configuration.

Test results should be documented only after the corresponding tests have actually been run and verified.

## Future Improvements

Possible areas for future development include:

- Stronger authentication and account recovery.
- Encryption at rest and enhanced evidence protection.
- Additional accessibility and multilingual support.
- More comprehensive security and automated testing.
- Carefully evaluated integrations with official reporting channels, with clear user consent.
- Improved deployment monitoring and reliability.

These are potential enhancements rather than claims about functionality already implemented.

## Branding

- **Project name:** SHEild
- **Tagline:** Your Safety. Your Story. Your Next Step.
- **Colour palette:** Berry `#9E1B64`, soft lavender, white, and warm yellow accents.
- **Typography:** Plus Jakarta Sans and Instrument Serif Italic, where available in the application.

The visual design aims to feel approachable, clear, and easy to navigate, particularly when users may already be dealing with a stressful situation.

## Licence and Intended Use

SHEild is a hackathon prototype exploring how technology can make online-safety support more organized and approachable. It is not a law-enforcement system, professional counselling service, or emergency-response service.

If you are in immediate danger in India, call **112** for emergency assistance. Women can also seek support through the **181 Women's Helpline**, subject to local availability.

---

**Built for a simple purpose: helping people feel more prepared for their next step.**
