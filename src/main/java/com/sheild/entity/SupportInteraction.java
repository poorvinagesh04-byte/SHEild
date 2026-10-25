package com.sheild.entity;

import com.sheild.domain.SupportAction;
import com.sheild.domain.SupportFeeling;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * Minimal support metadata only. Conversation content is intentionally not stored.
 */
@Entity
@Table(name = "support_interactions")
public class SupportInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id")
    private SafetyCase safetyCase;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private SupportFeeling feeling;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private SupportAction action;

    @Column(name = "associated_with_case", nullable = false)
    private boolean associatedWithCase;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SupportInteraction() {
    }

    public SupportInteraction(UserEntity user, SafetyCase safetyCase, SupportFeeling feeling,
                              SupportAction action, boolean associatedWithCase) {
        this.user = user;
        this.safetyCase = safetyCase;
        this.feeling = feeling;
        this.action = action;
        this.associatedWithCase = associatedWithCase;
        this.createdAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public UserEntity getUser() {
        return user;
    }

    public SafetyCase getSafetyCase() {
        return safetyCase;
    }

    public SupportFeeling getFeeling() {
        return feeling;
    }

    public SupportAction getAction() {
        return action;
    }

    public boolean isAssociatedWithCase() {
        return associatedWithCase;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
