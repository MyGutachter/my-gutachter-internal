package com.mygutachter.controller;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import com.mygutachter.service.OrderService;
import com.mygutachter.service.S3Service;

/**
 * Video-call recordings. Ported from VideoExpert; keyed on the order's {@code caseNumber}
 * ({@code meetingId} == caseNumber). Each POST is one full {@code .webm} file uploaded to
 * S3 under {@code recordings/{meetingId}/{ts}.webm}; the key is appended to the order's
 * {@code videoRecordingKeys}. Serving returns presigned URLs in a JSON body. Public endpoints
 * ({@code permitAll} in SecurityConfig).
 */
@RestController
@RequestMapping("/api/recordings")
public class RecordingController {

    private static final Logger log = LoggerFactory.getLogger(RecordingController.class);

    private final OrderService orderService;
    private final S3Service s3Service;

    public RecordingController(OrderService orderService, S3Service s3Service) {
        this.orderService = orderService;
        this.s3Service = s3Service;
    }

    @PostMapping("/{meetingId}")
    public ResponseEntity<String> uploadRecording(@PathVariable String meetingId,
            @RequestParam("file") MultipartFile file) {
        try {
            log.info("Uploading recording for meeting {}, size: {} bytes", meetingId, file.getSize());
            String key = "recordings/" + meetingId + "/" + System.currentTimeMillis() + ".webm";
            s3Service.uploadFile(key, file.getBytes(), "video/webm");
            orderService.addVideoRecordingKey(meetingId, key);
            log.info("Recording saved for meeting {}: {}", meetingId, key);
            return ResponseEntity.ok(key);
        } catch (IOException e) {
            log.error("Failed to upload recording for meeting {}", meetingId, e);
            return ResponseEntity.status(500).body("Failed to upload recording");
        }
    }

    @GetMapping("/{meetingId}")
    public ResponseEntity<?> getRecordingUrls(@PathVariable String meetingId) {
        List<String> keys = orderService.getVideoRecordingKeys(meetingId);
        if (!keys.isEmpty()) {
            List<String> urls = new ArrayList<>();
            for (String key : keys) {
                try {
                    urls.add(s3Service.generatePresignedUrl(key));
                } catch (Exception e) {
                    log.warn("Failed to generate URL for key {}: {}", key, e.getMessage());
                }
            }
            if (!urls.isEmpty()) {
                return ResponseEntity.ok(Collections.singletonMap("urls", urls));
            }
        }
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        log.error("Recording upload exceeded max size: {}", exc.getMessage());
        return ResponseEntity.status(413).body("Recording file is too large. Maximum allowed size is 500MB.");
    }
}
