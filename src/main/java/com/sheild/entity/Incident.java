package com.sheild.entity;

import com.sheild.domain.IncidentType;
import com.sheild.domain.Platform;
import com.sheild.domain.ReviewStatus;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private SafetyCase safetyCase;

    @Enumerated(EnumType.STRING)
    @Column(name = "incident_type", nullable = false, length = 40)
    private IncidentType incidentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Platform platform;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "occurred_at")
    private Instant occurredAt;

    @Column(name = "impact_notes", columnDefinition = "TEXT")
    private String impactNotes;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 24)
    private ReviewStatus reviewStatus;

    @Column(name = "suggested_summary", columnDefinition = "TEXT")
    private String suggestedSummary;

    @Column(name = "summary_generated_at")
    private Instant summaryGeneratedAt;

    @Column(name = "confirmed_summary", columnDefinition = "TEXT")
    private String confirmedSummary;

    @Column(name = "summary_confirmed_at")
    private Instant summaryConfirmedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Incident() {
    }

    public Incident(SafetyCase safetyCase, IncidentType incidentType, Platform platform, String description) {
        this.safetyCase = safetyCase;
        this.incidentType = incidentType;
        this.platform = platform;
        this.description = description;
        this.reviewStatus = ReviewStatus.DRAFT;
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

    public IncidentType getIncidentType() {
        return incidentType;
    }

    public Platform getPlatform() {
        return platform;
    }

    public String getDescription() {
        return description;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getImpactNotes() {
        return impactNotes;
    }

    public ReviewStatus getReviewStatus() {
        return reviewStatus;
    }

    public String getSuggestedSummary() {
        return suggestedSummary;
    }

    public Instant getSummaryGeneratedAt() {
        return summaryGeneratedAt;
    }

    public String getConfirmedSummary() {
        return confirmedSummary;
    }

    public Instant getSummaryConfirmedAt() {
        return summaryConfirmedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setIncidentType(IncidentType incidentType) {
        this.incidentType = incidentType;
    }

    public void setPlatform(Platform platform) {
        this.platform = platform;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }

    public void setImpactNotes(String impactNotes) {
        this.impactNotes = impactNotes;
    }

    public void setReviewStatus(ReviewStatus reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public void setSuggestedSummary(String suggestedSummary) {
        this.suggestedSummary = suggestedSummary;
        this.summaryGeneratedAt = Instant.now();
    }

    public void setConfirmedSummary(String confirmedSummary) {
        this.confirmedSummary = confirmedSummary;
        this.summaryConfirmedAt = Instant.now();
        this.reviewStatus = ReviewStatus.REVIEWED;
    }

    public void resetReview() {
        this.reviewStatus = ReviewStatus.NEEDS_REVIEW;
        this.suggestedSummary = null;
        this.summaryGeneratedAt = null;
        this.confirmedSummary = null;
        this.summaryConfirmedAt = null;
        this.updatedAt = Instant.now();
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
