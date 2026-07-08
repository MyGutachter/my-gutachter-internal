package com.mygutachter.controller;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mygutachter.service.OrderService;
import com.mygutachter.service.S3Service;

/**
 * Video-call screenshots. Ported from VideoExpert; keyed on the order's {@code caseNumber}
 * (the {@code meetingId} path variable == caseNumber), so a screenshot taken during the call
 * is stored on the same unified order document the report mode uses.
 *
 * <p>Screenshots live in the order's {@code meetingData} map (db-key {@code partName_timestamp}
 * → S3 key {@code screenshots/{meetingId}/{safePart}_{ts}.png}). Serving redirects (302) to a
 * presigned URL; a legacy base64-valued entry is decoded and returned inline instead.
 *
 * <p>Most endpoints are public ({@code permitAll} in SecurityConfig, matching VideoExpert), EXCEPT
 * {@code GET /api/screenshots/order/{orderId}} which stays authenticated.
 */
@RestController
@RequestMapping("/api/screenshots")
public class ScreenshotController {

    private final OrderService orderService;
    private final S3Service s3Service;

    @Value("${app.backend-url:http://localhost:8080}")
    private String backendUrl;

    public ScreenshotController(OrderService orderService, S3Service s3Service) {
        this.orderService = orderService;
        this.s3Service = s3Service;
    }

    @GetMapping("/{meetingId}")
    public ResponseEntity<List<String>> listScreenshots(@PathVariable String meetingId) {
        return ResponseEntity.ok(orderService.getOrderPartKeys(meetingId));
    }

    @PostMapping
    public ResponseEntity<String> uploadScreenshot(
            @RequestParam("file") MultipartFile file,
            @RequestParam("partName") String partName,
            @RequestParam("meetingId") String meetingId,
            @RequestParam("userId") String userId) {
        try {
            String safePartName = partName.replaceAll("[^a-zA-Z0-9.-]", "_");
            long timestamp = System.currentTimeMillis();
            String key = "screenshots/" + meetingId + "/" + safePartName + "_" + timestamp + ".png";

            s3Service.uploadFile(key, file);

            String dbKey = partName + "_" + timestamp;
            orderService.addMeetingImage(meetingId, dbKey, key);

            return ResponseEntity.ok(dbKey);
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Failed to upload screenshot");
        }
    }

    @GetMapping("/{meetingId}/{filename}")
    public ResponseEntity<?> getScreenshot(@PathVariable String meetingId, @PathVariable String filename, @RequestParam(value = "follow", defaultValue = "true") boolean follow) {
        Optional<String> imageOpt = orderService.getMeetingImage(meetingId, filename);
        if (imageOpt.isPresent()) {
            String storedValue = imageOpt.get();
            if (storedValue.startsWith("screenshots/")) {
                if (follow) {
                    String presignedUrl = s3Service.generatePresignedUrl(storedValue);
                    return ResponseEntity.status(HttpStatus.FOUND)
                            .location(URI.create(presignedUrl))
                            .build();
                } else {
                    try {
                        byte[] imageBytes = s3Service.downloadFile(storedValue);
                        return ResponseEntity.ok()
                                .header("Content-Type", "image/png")
                                .body(imageBytes);
                    } catch (Exception e) {
                        return ResponseEntity.status(500).build();
                    }
                }
            } else {
                try {
                    byte[] imageBytes = Base64.getDecoder().decode(storedValue);
                    return ResponseEntity.ok().header("Content-Type", "image/png").body(imageBytes);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.status(500).build();
                }
            }
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{meetingId}/{filename}")
    public ResponseEntity<String> deleteScreenshot(@PathVariable String meetingId, @PathVariable String filename) {
        Optional<String> imageOpt = orderService.getMeetingImage(meetingId, filename);
        if (imageOpt.isPresent()) {
            String storedValue = imageOpt.get();
            if (storedValue.startsWith("screenshots/")) {
                s3Service.deleteFile(storedValue);
            }
            orderService.removeMeetingImage(meetingId, filename);
            return ResponseEntity.ok("Screenshot deleted");
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<DamageScreenshotResponse>> getOrderDamagesAndScreenshots(@PathVariable String orderId) {
        Document order = orderService.findByCaseNumber(orderId);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, String> images = orderService.getOrderImages(orderId);
        List<DamageScreenshotResponse> response = new ArrayList<>();

        String baseUrl = backendUrl != null ? backendUrl : "";
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }

        for (Map.Entry<String, String> entry : images.entrySet()) {
            String dbKey = entry.getKey();
            String partName = dbKey;
            Long timestamp = null;

            int lastUnderscore = dbKey.lastIndexOf('_');
            if (lastUnderscore != -1) {
                try {
                    timestamp = Long.parseLong(dbKey.substring(lastUnderscore + 1));
                    partName = dbKey.substring(0, lastUnderscore);
                } catch (NumberFormatException e) {
                    // keep original dbKey as partName
                }
            }

            String url = baseUrl + "/api/screenshots/" + orderId + "/" + dbKey;
            response.add(new DamageScreenshotResponse(partName, dbKey, url, timestamp));
        }

        return ResponseEntity.ok(response);
    }

    public static class DamageScreenshotResponse {
        private String part;
        private String screenshotKey;
        private String url;
        private Long timestamp;

        public DamageScreenshotResponse(String part, String screenshotKey, String url, Long timestamp) {
            this.part = part;
            this.screenshotKey = screenshotKey;
            this.url = url;
            this.timestamp = timestamp;
        }

        public String getPart() { return part; }
        public String getScreenshotKey() { return screenshotKey; }
        public String getUrl() { return url; }
        public Long getTimestamp() { return timestamp; }
    }
}
