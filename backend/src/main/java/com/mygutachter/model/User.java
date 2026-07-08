package com.mygutachter.model;

import org.bson.types.ObjectId;

import java.time.LocalDateTime;

/**
 * Unified user model for the merged platform.
 *
 * <p>Supports both login paths (Decision Q1–Q3):
 * <ul>
 *   <li><b>OMT-connected</b> — provisioned/updated on OMT login; {@code connectedWithOmt=true}.
 *       {@code password} may stay null unless the user sets one via reset.</li>
 *   <li><b>Internal</b> — email + {@code password} (BCrypt). Available to anyone with a
 *       password set, including OMT users who did a password reset.</li>
 * </ul>
 *
 * <p>Note: most code manipulates the {@code users} collection as raw BSON
 * {@link org.bson.Document}s; this POJO is used by the newer auth code (internal
 * login, 2FA, API keys) and for serialization convenience.
 */
public class User {
    private ObjectId id;
    private String username;
    private String fullName;
    private String email;
    private UserRole role;

    /** Whether this account can log in via OMT (upserted on OMT login). */
    private boolean connectedWithOmt;
    /** BCrypt hash; null until the user establishes internal credentials. */
    private String password;
    /** Per-user override; role-level default lives in rateConfig. */
    private boolean canViewAllOrders;

    // Two-factor (TOTP)
    private boolean twoFactorEnabled;
    private String twoFactorSecret;

    // Password reset
    private String resetPasswordToken;
    private LocalDateTime resetPasswordTokenExpiry;

    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;

    public User() {}

    public User(String username, String email, UserRole role) {
        this.username = username;
        this.email = email;
        this.role = role;
    }

    public ObjectId getId() { return id; }
    public void setId(ObjectId id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    public boolean isConnectedWithOmt() { return connectedWithOmt; }
    public void setConnectedWithOmt(boolean connectedWithOmt) { this.connectedWithOmt = connectedWithOmt; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isCanViewAllOrders() { return canViewAllOrders; }
    public void setCanViewAllOrders(boolean canViewAllOrders) { this.canViewAllOrders = canViewAllOrders; }

    public boolean isTwoFactorEnabled() { return twoFactorEnabled; }
    public void setTwoFactorEnabled(boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }

    public String getTwoFactorSecret() { return twoFactorSecret; }
    public void setTwoFactorSecret(String twoFactorSecret) { this.twoFactorSecret = twoFactorSecret; }

    public String getResetPasswordToken() { return resetPasswordToken; }
    public void setResetPasswordToken(String resetPasswordToken) { this.resetPasswordToken = resetPasswordToken; }

    public LocalDateTime getResetPasswordTokenExpiry() { return resetPasswordTokenExpiry; }
    public void setResetPasswordTokenExpiry(LocalDateTime resetPasswordTokenExpiry) { this.resetPasswordTokenExpiry = resetPasswordTokenExpiry; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public LocalDateTime getUpdatedDate() { return updatedDate; }
    public void setUpdatedDate(LocalDateTime updatedDate) { this.updatedDate = updatedDate; }
}
