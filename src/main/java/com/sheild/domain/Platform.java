package com.sheild.domain;

public enum Platform {
    INSTAGRAM("Instagram"),
    FACEBOOK("Facebook"),
    WHATSAPP("WhatsApp"),
    OTHER("Other platform");

    private final String label;

    Platform(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
