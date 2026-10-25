package com.sheild;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SheildApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeAll
    static void cleanTestStorage() throws Exception {
        Path storage = Path.of("target", "test-evidence");
        if (Files.exists(storage)) {
            try (var paths = Files.walk(storage)) {
                paths.sorted(Comparator.reverseOrder()).forEach(p -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (Exception ignored) {
                    }
                });
            }
        }
    }

    @Test
    void fullCaseWorkflowPersistsAcrossRequests() throws Exception {
        String token = createSession("Workflow tester");

        MvcResult created = mvc.perform(post("/api/cases")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"End-to-end integration case\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reference").value(org.hamcrest.Matchers.startsWith("SH-")))
                .andExpect(jsonPath("$.title").value("End-to-end integration case"))
                .andReturn();
        long caseId = read(created).path("id").asLong();

        MvcResult incidentResult = mvc.perform(post("/api/cases/" + caseId + "/incidents")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "incidentType": "HARASSMENT",
                                  "platform": "INSTAGRAM",
                                  "profileUrl": "https://www.instagram.com/example_account",
                                  "additionalUrls": ["https://example.com/post/123"],
                                  "description": "Five days after blocking the first account, a second username contacted a friend and asked for my phone number. I saved screenshots and did not reply.",
                                  "occurredAt": "2026-10-19T10:15:00Z",
                                  "impactNotes": "The contact has continued for two weeks and I feel anxious opening the app.",
                                  "draft": false
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewStatus").value("NEEDS_REVIEW"))
                .andExpect(jsonPath("$.urls.length()").value(2))
                .andReturn();
        long incidentId = read(incidentResult).path("id").asLong();

        MockMultipartFile file = new MockMultipartFile("file", "synthetic-note.txt", "text/plain",
                "Synthetic evidence for the integration test. Not a real message.".getBytes(StandardCharsets.UTF_8));
        MvcResult upload = mvc.perform(multipart("/api/incidents/" + incidentId + "/evidence")
                        .file(file)
                        .param("note", "Synthetic note")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalFilename").value("synthetic-note.txt"))
                .andExpect(jsonPath("$.text").value(true))
                .andExpect(jsonPath("$.previewable").value(true))
                .andReturn();
        long evidenceId = read(upload).path("id").asLong();

        mvc.perform(get("/api/evidence/" + evidenceId + "/file")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Synthetic evidence")));

        MvcResult review = mvc.perform(post("/api/incidents/" + incidentId + "/review")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("RULE_BASED"))
                .andExpect(jsonPath("$.evidenceCount").value(1))
                .andExpect(jsonPath("$.provenanceNotes.length()").value(3))
                .andReturn();
        String suggested = read(review).path("draftSummary").asText();
        assertThat(suggested).contains("repeated online harassment", "Evidence attached: 1 file");

        mvc.perform(put("/api/incidents/" + incidentId + "/confirmed-summary")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("summary", suggested))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("REVIEWED"))
                .andExpect(jsonPath("$.summaryConfirmedAt").isNotEmpty());

        MvcResult draft = mvc.perform(post("/api/incidents/" + incidentId + "/report-drafts")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("UNSUBMITTED"))
                .andExpect(jsonPath("$.content").value(org.hamcrest.Matchers.containsString("NOT SUBMITTED")))
                .andReturn();
        long draftId = read(draft).path("id").asLong();

        mvc.perform(put("/api/report-drafts/" + draftId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"My edited draft\",\"content\":\"DRAFT — NOT SUBMITTED\\n\\nThis is my own edited wording.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("My edited draft"))
                .andExpect(jsonPath("$.content").value(org.hamcrest.Matchers.containsString("my own edited wording")));

        MvcResult checklist = mvc.perform(get("/api/cases/" + caseId + "/checklist")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andReturn();
        long checklistId = read(checklist).get(0).path("id").asLong();
        mvc.perform(put("/api/checklist/" + checklistId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"done\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.done").value(true));

        mvc.perform(get("/api/cases/" + caseId + "/dashboard")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.caseInfo.incidentCount").value(1))
                .andExpect(jsonPath("$.caseInfo.evidenceCount").value(1))
                .andExpect(jsonPath("$.caseInfo.reviewedIncidentCount").value(1))
                .andExpect(jsonPath("$.caseInfo.checklistDone").value(1))
                .andExpect(jsonPath("$.incidents[0].confirmedSummary").isNotEmpty())
                .andExpect(jsonPath("$.drafts[0].title").value("My edited draft"))
                .andExpect(jsonPath("$.connections").isArray());

        mvc.perform(get("/api/cases/" + caseId + "/summary")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("SHEild-case-")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("not a report to any platform or authority")));
    }

    @Test
    void caseDataIsIsolatedBetweenAccessTokens() throws Exception {
        String owner = createSession("Owner");
        String other = createSession("Other browser");

        MvcResult created = mvc.perform(post("/api/cases")
                        .header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Private owner case\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long caseId = read(created).path("id").asLong();

        mvc.perform(get("/api/cases/" + caseId)
                        .header("Authorization", bearer(other)))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/cases/" + caseId))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        mvc.perform(get("/api/cases/" + caseId + "/dashboard")
                        .header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/cases").header("Authorization", bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void invalidIncidentAndUnsafeUploadAreRejected() throws Exception {
        String token = createSession("Validation tester");
        MvcResult created = mvc.perform(post("/api/cases")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andReturn();
        long caseId = read(created).path("id").asLong();

        mvc.perform(post("/api/cases/" + caseId + "/incidents")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"incidentType\":\"HARASSMENT\",\"platform\":\"INSTAGRAM\",\"description\":\"\",\"draft\":false}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.description").exists());

        MvcResult valid = mvc.perform(post("/api/cases/" + caseId + "/incidents")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"incidentType\":\"OTHER\",\"platform\":\"OTHER\",\"description\":\"A valid description for the upload test.\",\"draft\":false}"))
                .andExpect(status().isCreated())
                .andReturn();
        long incidentId = read(valid).path("id").asLong();

        MockMultipartFile executable = new MockMultipartFile("file", "malware.exe",
                "application/octet-stream", new byte[]{0x4d, 0x5a});
        mvc.perform(multipart("/api/incidents/" + incidentId + "/evidence")
                        .file(executable)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/incidents/" + incidentId + "/review")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.missingDetails").isArray());
    }

    @Test
    void supportIsLabelledAsGuidedAndOnlyStoredWhenOptedIn() throws Exception {
        String token = createSession("Support tester");

        mvc.perform(post("/api/support/respond")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"feeling\":\"SCARED\",\"associateWithCase\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("GUIDED_RULE_BASED"))
                .andExpect(jsonPath("$.modeLabel").value("Guided support — not AI or a counsellor"))
                .andExpect(jsonPath("$.metadataStored").value(false))
                .andExpect(jsonPath("$.metadataNote").value(org.hamcrest.Matchers.containsString("not saved")))
                .andExpect(jsonPath("$.resources[0].phone").value("112"))
                .andExpect(jsonPath("$.options.length()").value(5));

        MvcResult created = mvc.perform(post("/api/cases")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Support opt-in case\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long caseId = read(created).path("id").asLong();

        mvc.perform(post("/api/support/respond")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"feeling\":\"OVERWHELMED\",\"action\":\"GROUNDING\",\"caseId\":" + caseId
                                + ",\"associateWithCase\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metadataStored").value(true))
                .andExpect(jsonPath("$.exerciseSteps.length()").value(5))
                .andExpect(jsonPath("$.metadataNote").value(org.hamcrest.Matchers.containsString("feeling you selected")));
    }

    private String createSession(String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/session")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"" + name + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        return read(result).path("token").asText();
    }

    private JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
