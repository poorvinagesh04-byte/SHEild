package com.sheild.domain;

public enum SupportFeeling {
    SCARED("Scared"),
    OVERWHELMED("Overwhelmed"),
    ANGRY("Angry"),
    CONFUSED("Confused"),
    UNSURE("Unsure"),
    LISTEN("I just need someone to listen");

    private final String label;

    SupportFeeling(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
