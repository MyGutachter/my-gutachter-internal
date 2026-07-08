package com.mygutachter.controller;

import com.mygutachter.model.ApiKey;
import com.mygutachter.service.ApiKeyService;
import com.mygutachter.service.UserAccountService;
import jakarta.servlet.http.HttpServletRequest;
import org.bson.Document;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Authenticated API-key management under {@code /api/keys/**} (requires a valid JWT).
 * The caller's email is read from the {@code userEmail} request attribute.
 *
 * <p>As in VideoExpert, generating a key requires 2FA to be enabled on the account.
 * The public key-exchange endpoint ({@code /api/auth/api-key-login}) lives in
 * {@link PublicAuthController}.
 */
@RestController
@RequestMapping("/api/keys")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;
    private final UserAccountService userAccountService;

    public ApiKeyController(ApiKeyService apiKeyService, UserAccountService userAccountService) {
        this.apiKeyService = apiKeyService;
        this.userAccountService = userAccountService;
    }

    private String callerEmail(HttpServletRequest request) {
        Object email = request.getAttribute("userEmail");
        return email == null ? null : email.toString();
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {
        String email = callerEmail(request);
        Document user = userAccountService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        // VideoExpert requires 2FA before an API key can be generated — keep it.
        if (!user.getBoolean("twoFactorEnabled", false)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Two-factor authentication must be enabled to generate an API key."));
        }

        String name = (body != null && body.get("name") != null) ? body.get("name") : "API Key";
        ApiKey apiKey = apiKeyService.generateApiKey(user.getString("email"), name);

        // Return the secret exactly once, at creation time.
        Map<String, Object> result = new HashMap<>();
        result.put("id", apiKey.getId());
        result.put("name", apiKey.getName());
        result.put("key", apiKey.getKey());
        result.put("createdAt", apiKey.getCreatedAt());
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest request) {
        String email = callerEmail(request);
        Document user = userAccountService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (ApiKey apiKey : apiKeyService.getApiKeys(user.getString("email"))) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", apiKey.getId());
            item.put("name", apiKey.getName());
            item.put("active", apiKey.isActive());
            item.put("createdAt", apiKey.getCreatedAt());
            item.put("lastUsedAt", apiKey.getLastUsedAt());
            // Deliberately NOT returning the secret key.
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> revoke(@PathVariable String id, HttpServletRequest request) {
        String email = callerEmail(request);
        Document user = userAccountService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }
        try {
            apiKeyService.revokeApiKey(id, user.getString("email"));
            return ResponseEntity.ok(Map.of("message", "API key revoked"));
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
