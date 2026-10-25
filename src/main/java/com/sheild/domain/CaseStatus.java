package com.sheild.domain;

public enum CaseStatus {
    OPEN("Open"),
    IN_PROGRESS("In progress"),
    CLOSED("Closed");

    private final String label;

    CaseStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
