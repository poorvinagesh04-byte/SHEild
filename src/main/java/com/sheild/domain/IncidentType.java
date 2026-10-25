package com.sheild.domain;

public enum IncidentType {
    DEEPFAKE("Suspected deepfake or manipulated content"),
    IMPERSONATION("Impersonation or fake profile"),
    HARASSMENT("Repeated online harassment"),
    THREATS("Online threats"),
    OTHER("Other");

    private final String label;

    IncidentType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
