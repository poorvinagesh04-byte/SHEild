package com.sheild.service;

import com.sheild.entity.Evidence;
import com.sheild.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class EvidenceStorageService {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "pdf", "txt");

    private final Path root;
    private final long maxBytes;

    public EvidenceStorageService(@Value("${sheild.storage-dir}") String storageDir,
                                  @Value("${sheild.max-evidence-bytes}") long maxBytes) {
        this.root = Path.of(storageDir).toAbsolutePath().normalize();
        this.maxBytes = maxBytes;
        try {
            Files.createDirectories(root);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not create the private evidence directory: " + root, ex);
        }
    }

    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Choose a file to upload.");
        }
        if (file.getSize() > maxBytes) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "That file is too large. The maximum size is 10 MB.");
        }
        String original = sanitizeFilename(file.getOriginalFilename());
        String extension = extensionOf(original);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw ApiException.badRequest("Unsupported file type. Upload a JPG, PNG, WebP, PDF, or TXT file.");
        }
        String expectedType = expectedMime(extension);
        String declared = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        boolean acceptable = declared.equals(expectedType)
                || (expectedType.equals("image/jpeg") && declared.equals("image/jpg"))
                || (declared.equals("application/octet-stream") && !expectedType.equals("text/plain"));
        if (!acceptable) {
            throw ApiException.badRequest("The file content type does not match its extension. Please choose a valid file.");
        }

        String storedFilename = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        Path target = root.resolve(storedFilename).normalize();
        if (!target.startsWith(root)) {
            throw ApiException.badRequest("That filename is not allowed.");
        }
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not store the evidence file.", ex);
        }
        return new StoredFile(original, storedFilename, expectedType, file.getSize(), target);
    }

    public String extractTextIfPlain(Path path) {
        try {
            long size = Files.size(path);
            if (size > 1_000_000) {
                return "The text file is larger than 1 MB. Open the original file to review it.";
            }
            String text = Files.readString(path, StandardCharsets.UTF_8);
            String cleaned = text.replace("\u0000", " ").replaceAll("[\\p{Cntrl}&&[^\\n\\r\\t]]", " ");
            return cleaned.length() > 100_000 ? cleaned.substring(0, 100_000) + "\n\n[Truncated for display]" : cleaned;
        } catch (IOException ex) {
            return null;
        }
    }

    public Resource load(Evidence evidence) {
        Path target = root.resolve(evidence.getStoredFilename()).normalize();
        if (!target.startsWith(root) || !Files.exists(target)) {
            throw ApiException.notFound("The original evidence file is no longer available.");
        }
        return new FileSystemResource(target);
    }

    public void delete(String storedFilename) {
        if (storedFilename == null) return;
        try {
            Path target = root.resolve(storedFilename).normalize();
            if (target.startsWith(root)) {
                Files.deleteIfExists(target);
            }
        } catch (IOException ignored) {
            // Metadata is still removed; the orphaned file can be cleaned up by an administrator.
        }
    }

    private String sanitizeFilename(String name) {
        String value = name == null ? "evidence" : name;
        value = value.replace('\\', '/');
        int slash = value.lastIndexOf('/');
        if (slash >= 0) value = value.substring(slash + 1);
        value = value.replaceAll("[\\r\\n\\t\\u0000]", " ")
                .replaceAll("[^A-Za-z0-9._ -]", "_")
                .replaceAll("\\s+", " ")
                .trim();
        if (value.isBlank()) value = "evidence";
        if (value.length() > 180) {
            String ext = extensionOf(value);
            value = value.substring(0, 160) + (ext.isBlank() ? "" : "." + ext);
        }
        return value;
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String expectedMime(String extension) {
        return switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "pdf" -> "application/pdf";
            case "txt" -> "text/plain";
            default -> "application/octet-stream";
        };
    }

    public static boolean isImage(String mimeType) {
        return mimeType != null && mimeType.startsWith("image/");
    }

    public record StoredFile(String originalFilename, String storedFilename, String mimeType,
                             long size, Path path) {
    }
}
