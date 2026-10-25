package com.sheild.domain;

public enum ProcessingStatus {
    TEXT_EXTRACTED("Text extracted"),
    OCR_NOT_CONFIGURED("Manual review — OCR unavailable"),
    STORED("Stored privately");

    private final String label;

    ProcessingStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
