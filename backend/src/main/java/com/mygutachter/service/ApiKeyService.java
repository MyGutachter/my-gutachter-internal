package com.mygutachter.service;

import com.mygutachter.model.ApiKey;
import com.mygutachter.repository.ApiKeyRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * API-key management, ported from VideoExpert's {@code ApiKeyService}.
 *
 * <p>Keys are {@code sk_}-prefixed, generated from 32 secure-random bytes, and
 * stored in plaintext (matching VideoExpert) so they can be resolved on login.
 * VideoExpert requires 2FA before a key may be generated; that check lives in the
 * controller here (it needs the user's 2FA state from the users collection).
 */
@Service
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Base64.Encoder BASE64_ENCODER = Base64.getUrlEncoder();

    public ApiKeyService(ApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    public ApiKey generateApiKey(String userEmail, String name) {
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String key = "sk_"
                + BASE64_ENCODER.encodeToString(randomBytes).replaceAll("[^a-zA-Z0-9]", "").substring(0, 40);

        ApiKey apiKey = new ApiKey();
        apiKey.setId(UUID.randomUUID().toString());
        apiKey.setKey(key);
        apiKey.setUserEmail(userEmail);
        apiKey.setName(name);
        apiKey.setActive(true);
        apiKey.setCreatedAt(LocalDateTime.now());

        return apiKeyRepository.save(apiKey);
    }

    public List<ApiKey> getApiKeys(String userEmail) {
        return apiKeyRepository.findByUserEmail(userEmail);
    }

    public void revokeApiKey(String id, String userEmail) {
        ApiKey apiKey = apiKeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("API Key not found"));

        if (!apiKey.getUserEmail().equalsIgnoreCase(userEmail)) {
            throw new SecurityException("Unauthorized access to API Key");
        }

        apiKey.setActive(false);
        apiKeyRepository.save(apiKey);
    }

    public Optional<ApiKey> findByKey(String key) {
        return apiKeyRepository.findByKey(key);
    }

    public void updateLastUsed(ApiKey apiKey) {
        apiKey.setLastUsedAt(LocalDateTime.now());
        apiKeyRepository.save(apiKey);
    }
}
