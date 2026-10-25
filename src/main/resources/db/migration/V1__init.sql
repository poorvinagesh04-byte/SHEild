-- SHEild initial schema
-- All tables use UTC timestamps. Evidence binaries live outside the database
-- in a private storage directory referenced by stored_filename.

CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    access_token_hash VARCHAR(64) NOT NULL,
    display_name VARCHAR(80) NULL,
    created_at DATETIME(6) NOT NULL,
    last_seen_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_token (access_token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE safety_cases (
    id BIGINT NOT NULL AUTO_INCREMENT,
    reference VARCHAR(24) NOT NULL,
    title VARCHAR(160) NOT NULL,
    owner_id BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL,
    confirmed_summary TEXT NULL,
    summary_confirmed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cases_reference (reference),
    KEY ix_cases_owner (owner_id),
    KEY ix_cases_updated (updated_at),
    CONSTRAINT fk_cases_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE incidents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    case_id BIGINT NOT NULL,
    incident_type VARCHAR(40) NOT NULL,
    platform VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    occurred_at DATETIME(6) NULL,
    impact_notes TEXT NULL,
    review_status VARCHAR(24) NOT NULL,
    suggested_summary TEXT NULL,
    summary_generated_at DATETIME(6) NULL,
    confirmed_summary TEXT NULL,
    summary_confirmed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_incidents_case (case_id),
    KEY ix_incidents_occurred (occurred_at),
    KEY ix_incidents_review (review_status),
    CONSTRAINT fk_incidents_case FOREIGN KEY (case_id) REFERENCES safety_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE evidence (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_id BIGINT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at DATETIME(6) NOT NULL,
    processing_status VARCHAR(32) NOT NULL,
    extracted_text MEDIUMTEXT NULL,
    user_note VARCHAR(500) NULL,
    review_status VARCHAR(24) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_evidence_stored (stored_filename),
    KEY ix_evidence_incident (incident_id),
    CONSTRAINT fk_evidence_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documented_urls (
    id BIGINT NOT NULL AUTO_INCREMENT,
    case_id BIGINT NOT NULL,
    incident_id BIGINT NULL,
    evidence_id BIGINT NULL,
    platform VARCHAR(30) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    url_kind VARCHAR(20) NOT NULL,
    display_label VARCHAR(160) NULL,
    notes VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_urls_case (case_id),
    KEY ix_urls_incident (incident_id),
    KEY ix_urls_evidence (evidence_id),
    CONSTRAINT fk_urls_case FOREIGN KEY (case_id) REFERENCES safety_cases (id) ON DELETE CASCADE,
    CONSTRAINT fk_urls_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
    CONSTRAINT fk_urls_evidence FOREIGN KEY (evidence_id) REFERENCES evidence (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE incident_connections (
    id BIGINT NOT NULL AUTO_INCREMENT,
    case_id BIGINT NOT NULL,
    incident_a_id BIGINT NOT NULL,
    incident_b_id BIGINT NOT NULL,
    reason VARCHAR(600) NOT NULL,
    basis VARCHAR(32) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    decided_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_connection_pair (case_id, incident_a_id, incident_b_id),
    KEY ix_connections_case (case_id),
    CONSTRAINT fk_connections_case FOREIGN KEY (case_id) REFERENCES safety_cases (id) ON DELETE CASCADE,
    CONSTRAINT fk_connections_a FOREIGN KEY (incident_a_id) REFERENCES incidents (id) ON DELETE CASCADE,
    CONSTRAINT fk_connections_b FOREIGN KEY (incident_b_id) REFERENCES incidents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_drafts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    case_id BIGINT NOT NULL,
    incident_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_draft_incident (incident_id),
    KEY ix_drafts_case (case_id),
    CONSTRAINT fk_drafts_case FOREIGN KEY (case_id) REFERENCES safety_cases (id) ON DELETE CASCADE,
    CONSTRAINT fk_drafts_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE checklist_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    case_id BIGINT NOT NULL,
    code VARCHAR(60) NOT NULL,
    label VARCHAR(160) NOT NULL,
    description VARCHAR(400) NULL,
    is_done BIT NOT NULL DEFAULT 0,
    completed_at DATETIME(6) NULL,
    sort_order INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_checklist_code (case_id, code),
    KEY ix_checklist_case (case_id),
    CONSTRAINT fk_checklist_case FOREIGN KEY (case_id) REFERENCES safety_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE support_interactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    case_id BIGINT NULL,
    feeling VARCHAR(32) NULL,
    action VARCHAR(40) NULL,
    associated_with_case BIT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_support_user (user_id),
    KEY ix_support_case (case_id),
    CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_support_case FOREIGN KEY (case_id) REFERENCES safety_cases (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
