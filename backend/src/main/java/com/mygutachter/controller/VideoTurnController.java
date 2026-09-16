package com.mygutachter.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mygutachter.service.CloudflareTurnService;

/**
 * Controller providing WebRTC ICE server configurations (STUN/TURN) for video inspections.
 *
 * <p>Exposed publicly under {@code /api/video/ice-servers} (whitelisted in {@link com.mygutachter.config.SecurityConfig})
 * so both authenticated vehicle experts and unauthenticated guests can negotiate peer connections
 * via Cloudflare Realtime Anycast TURN servers.
 */
@RestController
@RequestMapping("/api/video")
public class VideoTurnController {

    private final CloudflareTurnService cloudflareTurnService;

    public VideoTurnController(CloudflareTurnService cloudflareTurnService) {
        this.cloudflareTurnService = cloudflareTurnService;
    }

    @GetMapping("/ice-servers")
    public ResponseEntity<Map<String, Object>> getIceServers() {
        return ResponseEntity.ok(cloudflareTurnService.getIceServersConfig());
    }
}
