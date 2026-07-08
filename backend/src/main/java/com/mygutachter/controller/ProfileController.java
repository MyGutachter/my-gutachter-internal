package com.mygutachter.controller;

import com.mongodb.client.model.Updates;
import com.mygutachter.service.TwoFactorService;
import com.mygutachter.service.UserAccountService;
import com.mygutachter.util.PasswordValidator;
import jakarta.servlet.http.HttpServletRequest;
import org.bson.Document;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Authenticated self-service profile management under {@code /api/users/**}
 * (requires a valid JWT). The caller's email is read from the {@code userEmail}
 * request attribute set by the JWT filter. Backs the shared Profile/Settings
 * pages (T7.6c). Note {@code /api/admin/users/**} (in {@link UserController}) is
 * the separate admin-only role/permission surface.
 */
@RestController
@RequestMapping("/api/users")
public class ProfileController {

    private final UserAccountService userAccountService;
    private final PasswordEncoder passwordEncoder;
    private final TwoFactorService twoFactorService;

    public ProfileController(UserAccountService userAccountService,
            PasswordEncoder passwordEncoder,
            TwoFactorService twoFactorService) {
        this.userAccountService = userAccountService;
        this.passwordEncoder = passwordEncoder;
        this.twoFactorService = twoFactorService;
    }

    private String callerEmail(HttpServletRequest request) {
        Object email = request.getAttribute("userEmail");
        return email == null ? null : email.toString();
    }

    /** Shape returned to the client — never includes password or 2FA secret. */
    private Map<String, Object> profileOf(Document user) {
        Map<String, Object> out = new HashMap<>();
        out.put("fullName", user.getString("username"));
        out.put("email", user.getString("email"));
        out.put("role", user.getString("role"));
        out.put("profilePicture", user.getString("profilePicture"));
        out.put("twoFactorEnabled", user.getBoolean("twoFactorEnabled", false));
        out.put("connectedWithOmt", user.getBoolean("connectedWithOmt", false));
        return out;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        Document user = userAccountService.findByEmail(callerEmail(request));
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }
        return ResponseEntity.ok(profileOf(user));
    }

    /**
     * Update the caller's display name and/or avatar. Accepts JSON
     * {@code {fullName?, profilePicture?}} — profilePicture is a URL or data URI
     * string (no multipart upload; avatars are small and self-contained).
     * If 2FA is enabled, a valid {@code twoFactorCode} must be supplied.
     */
    @PatchMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body,
            HttpServletRequest request) {
        Document user = userAccountService.findByEmail(callerEmail(request));
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        if (user.getBoolean("twoFactorEnabled", false)) {
            String code = body == null ? null : body.get("twoFactorCode");
            if (!twoFactorService.isOtpValid(user.getString("twoFactorSecret"), code)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid two-factor code"));
            }
        }

        java.util.List<org.bson.conversions.Bson> updates = new java.util.ArrayList<>();
        if (body != null && body.get("fullName") != null && !body.get("fullName").isBlank()) {
            updates.add(Updates.set("username", body.get("fullName").trim()));
        }
        if (body != null && body.containsKey("profilePicture")) {
            updates.add(Updates.set("profilePicture", body.get("profilePicture")));
        }
        if (!updates.isEmpty()) {
            userAccountService.collection().updateOne(
                    userAccountService.emailFilter(user.getString("email")),
                    Updates.combine(updates));
        }

        Document updated = userAccountService.findByEmail(user.getString("email"));
        return ResponseEntity.ok(profileOf(updated));
    }

    /**
     * Change the caller's password. Requires the current password (and a valid
     * 2FA code when 2FA is enabled). New password must pass {@link PasswordValidator}.
     */
    @PatchMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body,
            HttpServletRequest request) {
        Document user = userAccountService.findByEmail(callerEmail(request));
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }

        String currentPassword = body == null ? null : body.get("currentPassword");
        String newPassword = body == null ? null : body.get("newPassword");
        String storedHash = user.getString("password");

        if (currentPassword == null || storedHash == null
                || !passwordEncoder.matches(currentPassword, storedHash)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect"));
        }

        if (user.getBoolean("twoFactorEnabled", false)) {
            String code = body.get("twoFactorCode");
            if (!twoFactorService.isOtpValid(user.getString("twoFactorSecret"), code)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid two-factor code"));
            }
        }

        try {
            PasswordValidator.validate(newPassword);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }

        userAccountService.collection().updateOne(
                userAccountService.emailFilter(user.getString("email")),
                Updates.set("password", passwordEncoder.encode(newPassword)));

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}
