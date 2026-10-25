package com.sheild.entity;

import com.sheild.domain.DraftStatus;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "report_drafts")
public class ReportDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private SafetyCase safetyCase;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DraftStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ReportDraft() {
    }

    public ReportDraft(SafetyCase safetyCase, Incident incident, String title, String content) {
        this.safetyCase = safetyCase;
        this.incident = incident;
        this.title = title;
        this.content = content;
        this.status = DraftStatus.UNSUBMITTED;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
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

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public DraftStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setContent(String content) {
        this.content = content;
        this.status = DraftStatus.EDITED;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
