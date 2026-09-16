package com.mygutachter.service;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Service to generate and cache ephemeral WebRTC ICE server credentials via Cloudflare Realtime TURN (Calls).
 *
 * <p>Cloudflare Realtime TURN requires short-lived credentials generated server-side using a secret
 * Turn Key ID and API Token. This service proxies the credential generation, caches the response
 * within the credential TTL to minimize API calls, and provides safe fallback STUN servers if
 * Cloudflare is unconfigured or unreachable.
 */
@Service
public class CloudflareTurnService {

    private static final Logger log = LoggerFactory.getLogger(CloudflareTurnService.class);
    private static final String CLOUDFLARE_TURN_ENDPOINT_TEMPLATE =
            "https://rtc.live.cloudflare.com/v1/turn/keys/%s/credentials/generate-ice-servers";

    private static final List<Map<String, Object>> FALLBACK_ICE_SERVERS = List.of(
            Map.of("urls", List.of("stun:stun.cloudflare.com:3478")),
            Map.of("urls", List.of("stun:stun.l.google.com:19302"))
    );

    private final RestTemplate restTemplate;
    private final boolean enabled;
    private final String turnKeyId;
    private final String apiToken;
    private final int ttl;

    private volatile Map<String, Object> cachedResponse;
    private volatile long cacheExpiryTimeMs = 0L;

    public CloudflareTurnService(
            RestTemplate restTemplate,
            @Value("${cloudflare.turn.enabled:true}") boolean enabled,
            @Value("${cloudflare.turn.key-id:}") String turnKeyId,
            @Value("${cloudflare.turn.api-token:}") String apiToken,
            @Value("${cloudflare.turn.ttl:86400}") int ttl) {
        this.restTemplate = restTemplate;
        this.enabled = enabled;
        this.turnKeyId = turnKeyId != null ? turnKeyId.trim() : "";
        this.apiToken = apiToken != null ? apiToken.trim() : "";
        this.ttl = ttl > 0 ? ttl : 86400;
    }

    /**
     * Retrieves the ICE servers configuration (STUN and TURN relays).
     *
     * @return Map containing {@code iceServers: [...]}
     */
    public Map<String, Object> getIceServersConfig() {
        if (!enabled || turnKeyId.isEmpty() || apiToken.isEmpty()) {
            log.debug("Cloudflare Realtime TURN is not configured or disabled. Returning default STUN servers.");
            return buildFallbackConfig();
        }

        long now = System.currentTimeMillis();
        if (cachedResponse != null && now < cacheExpiryTimeMs) {
            return cachedResponse;
        }

        synchronized (this) {
            if (cachedResponse != null && System.currentTimeMillis() < cacheExpiryTimeMs) {
                return cachedResponse;
            }

            try {
                String url = String.format(CLOUDFLARE_TURN_ENDPOINT_TEMPLATE, turnKeyId);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(apiToken);

                Map<String, Object> requestBody = Map.of("ttl", ttl);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                log.info("Fetching ephemeral TURN credentials from Cloudflare (keyId={})...", turnKeyId);
                @SuppressWarnings("unchecked")
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> body = (Map<String, Object>) response.getBody();
                    if (body.containsKey("iceServers")) {
                        // Cache for (TTL - 300s) or at least 60s, capped at TTL
                        long cacheDurationMs = Math.max(60, ttl - 300) * 1000L;
                        this.cachedResponse = body;
                        this.cacheExpiryTimeMs = System.currentTimeMillis() + cacheDurationMs;
                        log.info("Successfully fetched and cached Cloudflare TURN credentials (valid for {}s).", cacheDurationMs / 1000);
                        return body;
                    }
                }
                log.warn("Cloudflare TURN response did not contain 'iceServers': {}", response.getBody());
            } catch (Exception e) {
                log.error("Failed to fetch Cloudflare TURN credentials: {}", e.getMessage());
            }

            // Return fallback on any failure
            return buildFallbackConfig();
        }
    }

    private Map<String, Object> buildFallbackConfig() {
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("iceServers", FALLBACK_ICE_SERVERS);
        return Collections.unmodifiableMap(fallback);
    }
}
