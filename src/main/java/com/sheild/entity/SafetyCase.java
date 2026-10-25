package com.sheild.entity;

import com.sheild.domain.CaseStatus;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "safety_cases")
public class SafetyCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 24)
    private String reference;

    @Column(nullable = false, length = 160)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserEntity owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private CaseStatus status;

    @Column(name = "confirmed_summary", columnDefinition = "TEXT")
    private String confirmedSummary;

    @Column(name = "summary_confirmed_at")
    private Instant summaryConfirmedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SafetyCase() {
    }

    public SafetyCase(String reference, String title, UserEntity owner) {
        this.reference = reference;
        this.title = title;
        this.owner = owner;
        this.status = CaseStatus.OPEN;
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

    public String getReference() {
        return reference;
    }

    public String getTitle() {
        return title;
    }

    public UserEntity getOwner() {
        return owner;
    }

    public CaseStatus getStatus() {
        return status;
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

    public void setTitle(String title) {
        this.title = title;
    }

    public void setStatus(CaseStatus status) {
        this.status = status;
    }

    public void setConfirmedSummary(String confirmedSummary) {
        this.confirmedSummary = confirmedSummary;
        this.summaryConfirmedAt = Instant.now();
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
