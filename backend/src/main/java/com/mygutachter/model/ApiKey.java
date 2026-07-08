package com.mygutachter.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * A programmatic API key tied to a user (by email). Ported from VideoExpert's
 * {@code ApiKey}, stored in the {@code api_keys} collection via Spring Data Mongo.
 *
 * <p>The secret {@code key} is stored in plaintext (as in VideoExpert) so
 * {@code findByKey} can resolve it on api-key-login; it is returned to the caller
 * only once at generation time and never listed back.
 */
@Document(collection = "api_keys")
public class ApiKey {

    @Id
    private String id;

    @Indexed(unique = true)
    private String key;

    /** Owner, matched case-insensitively elsewhere but stored as the resolved email. */
    private String userEmail;

    private String name;

    private boolean active = true;

    private LocalDateTime createdAt;

    private LocalDateTime lastUsedAt;

    public ApiKey() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(LocalDateTime lastUsedAt) { this.lastUsedAt = lastUsedAt; }
}
