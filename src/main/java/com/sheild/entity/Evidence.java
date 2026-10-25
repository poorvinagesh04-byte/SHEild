package com.sheild.entity;

import com.sheild.domain.ProcessingStatus;
import com.sheild.domain.ReviewStatus;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "evidence")
public class Evidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "stored_filename", nullable = false, unique = true, length = 255)
    private String storedFilename;

    @Column(name = "mime_type", nullable = false, length = 120)
    private String mimeType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 32)
    private ProcessingStatus processingStatus;

    @Column(name = "extracted_text", columnDefinition = "MEDIUMTEXT")
    private String extractedText;

    @Column(name = "user_note", length = 500)
    private String userNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 24)
    private ReviewStatus reviewStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Evidence() {
    }

    public Evidence(Incident incident, String originalFilename, String storedFilename, String mimeType, long fileSize) {
        this.incident = incident;
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.uploadedAt = Instant.now();
        this.processingStatus = ProcessingStatus.STORED;
        this.reviewStatus = ReviewStatus.NEEDS_REVIEW;
        this.createdAt = this.uploadedAt;
        this.updatedAt = this.uploadedAt;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
        if (uploadedAt == null) uploadedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Incident getIncident() {
        return incident;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getStoredFilename() {
        return storedFilename;
    }

    public String getMimeType() {
        return mimeType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public ProcessingStatus getProcessingStatus() {
        return processingStatus;
    }

    public String getExtractedText() {
        return extractedText;
    }

    public String getUserNote() {
        return userNote;
    }

    public ReviewStatus getReviewStatus() {
        return reviewStatus;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setProcessingStatus(ProcessingStatus processingStatus) {
        this.processingStatus = processingStatus;
    }

    public void setExtractedText(String extractedText) {
        this.extractedText = extractedText;
    }

    public void setUserNote(String userNote) {
        this.userNote = userNote;
    }

    public void setReviewStatus(ReviewStatus reviewStatus) {
        this.reviewStatus = reviewStatus;
    }
}
