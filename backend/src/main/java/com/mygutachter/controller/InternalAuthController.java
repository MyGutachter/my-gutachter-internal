package com.mygutachter.controller;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mygutachter.model.AdminLoginRequest;
import com.mygutachter.model.AuthResponse;
import com.mygutachter.model.UserRole;
import com.mygutachter.service.JwtService;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Internal (email + password) login — the second of the two login paths (Decision Q1–Q4).
 *
 * <p>Works for any user that has a password set: former VideoExpert accounts, and
 * OMT-connected users who established a password via reset ({@code /api/auth/reset-password}, T2.4).
 * OMT login lives in {@link AdminAuthController} ({@code /api/auth/admin/login}); OMT SSO verify
 * in {@link AuthController}. All three mint the SAME internal JWT and operate on one user doc
 * (merge-by-email).
 *
 * <p>Returns our own JWT with no {@code externalToken} claim (internal sessions can't call OMT
 * on the user's behalf; OMT-bound actions require an OMT-issued session).
 */
@RestController
@RequestMapping("/api/auth")
public class InternalAuthController {

    private final MongoCollection<Document> collection;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public InternalAuthController(MongoDatabase database,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            @Value("${mongodb.collections.users}") String collectionName) {
        this.collection = database.getCollection(collectionName);
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AdminLoginRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()
                || request.getPassword() == null || request.getPassword().isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("error", "Email and password are required"));
        }

        String email = request.getEmail().trim();
        Document user = collection.find(
                Filters.regex("email", "^" + java.util.regex.Pattern.quote(email) + "$", "i")).first();

        String storedHash = user == null ? null : user.getString("password");
        // Generic error whether the user is missing or has no internal password set,
        // to avoid leaking which emails exist / are OMT-only.
        if (user == null || storedHash == null || storedHash.isEmpty()
                || !passwordEncoder.matches(request.getPassword(), storedHash)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }

        String resolvedEmail = user.getString("email");

        // If 2FA is enabled, don't issue the full JWT here. Return a short-lived temp
        // token; the client exchanges it (plus a TOTP code) at /api/auth/2fa/login-verify.
        if (user.getBoolean("twoFactorEnabled", false)) {
            String tempToken = jwtService.generateTempToken(resolvedEmail);
            return ResponseEntity.ok(Map.of("requires2fa", true, "tempToken", tempToken));
        }

        String name = user.getString("username");
        if (name == null || name.isEmpty()) {
            name = resolvedEmail;
        }

        UserRole role = UserRole.EXPERT;
        if (user.getString("role") != null) {
            try {
                role = UserRole.valueOf(user.getString("role"));
            } catch (IllegalArgumentException ignored) {
                // keep default
            }
        }

        // Internal session: no external OMT token.
        String internalJwt = jwtService.generateToken(name, role.name(), resolvedEmail, null);
        return ResponseEntity.ok(new AuthResponse(internalJwt, name, role, null));
    }
}
