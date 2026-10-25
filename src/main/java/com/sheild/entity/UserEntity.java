package com.sheild.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "access_token_hash", nullable = false, unique = true, length = 64)
    private String accessTokenHash;

    @Column(name = "display_name", length = 80)
    private String displayName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    protected UserEntity() {
    }

    public UserEntity(String accessTokenHash, String displayName) {
        this.accessTokenHash = accessTokenHash;
        this.displayName = displayName;
        this.createdAt = Instant.now();
        this.lastSeenAt = this.createdAt;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (lastSeenAt == null) {
            lastSeenAt = createdAt;
        }
    }

    public Long getId() {
        return id;
    }

    public String getAccessTokenHash() {
        return accessTokenHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public void touch() {
        this.lastSeenAt = Instant.now();
    }
}
