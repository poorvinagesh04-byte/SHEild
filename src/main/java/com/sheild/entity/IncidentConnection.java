package com.sheild.entity;

import com.sheild.domain.ConnectionBasis;
import com.sheild.domain.ConnectionStatus;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "incident_connections")
public class IncidentConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private SafetyCase safetyCase;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_a_id", nullable = false)
    private Incident incidentA;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_b_id", nullable = false)
    private Incident incidentB;

    @Column(nullable = false, length = 600)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ConnectionBasis basis;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConnectionStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    protected IncidentConnection() {
    }

    public IncidentConnection(SafetyCase safetyCase, Incident incidentA, Incident incidentB,
                              String reason, ConnectionBasis basis) {
        this.safetyCase = safetyCase;
        this.incidentA = incidentA;
        this.incidentB = incidentB;
        this.reason = reason;
        this.basis = basis;
        this.status = ConnectionStatus.SUGGESTED;
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

    public Incident getIncidentA() {
        return incidentA;
    }

    public Incident getIncidentB() {
        return incidentB;
    }

    public String getReason() {
        return reason;
    }

    public ConnectionBasis getBasis() {
        return basis;
    }

    public ConnectionStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public void setStatus(ConnectionStatus status) {
        this.status = status;
        this.decidedAt = Instant.now();
    }
}
