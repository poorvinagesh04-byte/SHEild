package com.sheild.entity;

import com.sheild.domain.Platform;
import com.sheild.domain.UrlKind;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "documented_urls")
public class DocumentedUrl {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private SafetyCase safetyCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evidence_id")
    private Evidence evidence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Platform platform;

    @Column(nullable = false, length = 2048)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(name = "url_kind", nullable = false, length = 20)
    private UrlKind urlKind;

    @Column(name = "display_label", length = 160)
    private String displayLabel;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DocumentedUrl() {
    }

    public DocumentedUrl(SafetyCase safetyCase, Incident incident, Platform platform, String url, UrlKind urlKind) {
        this.safetyCase = safetyCase;
        this.incident = incident;
        this.platform = platform;
        this.url = url;
        this.urlKind = urlKind;
        this.createdAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public SafetyCase getSafetyCase() {
        return safetyCase;
    }

    public Incident getIncident() {
        return incident;
    }

    public Evidence getEvidence() {
        return evidence;
    }

    public Platform getPlatform() {
        return platform;
    }

    public String getUrl() {
        return url;
    }

    public UrlKind getUrlKind() {
        return urlKind;
    }

    public String getDisplayLabel() {
        return displayLabel;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setDisplayLabel(String displayLabel) {
        this.displayLabel = displayLabel;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public void setIncident(Incident incident) {
        this.incident = incident;
    }
}
