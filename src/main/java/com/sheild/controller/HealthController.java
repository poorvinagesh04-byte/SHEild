package com.sheild.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public Map<String, Object> health() {
        Integer value = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("database", value != null && value == 1 ? "ok" : "unknown");
        body.put("application", "SHEild");
        body.put("time", Instant.now());
        return body;
    }
}
