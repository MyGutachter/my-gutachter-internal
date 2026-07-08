package com.mygutachter.controller;

import com.mongodb.client.model.Updates;
import com.mygutachter.service.TwoFactorService;
import com.mygutachter.service.UserAccountService;
import jakarta.servlet.http.HttpServletRequest;
import org.bson.Document;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authenticated 2FA management (setup / verify / disable). Lives under {@code /api/2fa/**},
 * which requires a valid JWT; the caller's email is read from the {@code userEmail} request
 * attribute set by {@link com.mygutachter.security.JwtAuthenticationFilter}.
 *
 * <p>The public login-exchange endpoint ({@code /api/auth/2fa/login-verify}) lives in
 * {@link PublicAuthController}.
 */
@RestController
@RequestMapping("/api/2fa")
public class TwoFactorController {

    private final TwoFactorService twoFactorService;
    private final UserAccountService userAccountService;

    public TwoFactorController(TwoFactorService twoFactorService, UserAccountService userAccountService) {
        this.twoFactorService = twoFactorService;
        this.userAccountService = userAccountService;
    }

    private String callerEmail(HttpServletRequest request) {
        Object email = request.getAttribute("userEmail");
        return email == null ? null : email.toString();
    }

    @PostMapping("/setup")
    public ResponseEntity<?> setup(HttpServletRequest request) {
        String email = callerEmail(request);
        Document user = userAccountService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        String secret = twoFactorService.generateNewSecret();
        String qrCodeUri = twoFactorService.generateQrCodeImageUri(secret, email);

        // Store the secret but do NOT enable 2FA until a code is verified.
        userAccountService.collection().updateOne(
                userAccountService.emailFilter(email),
                Updates.set("twoFactorSecret", secret));

        return ResponseEntity.ok(Map.of(
                "secret", secret,
                "qrCodeUri", qrCodeUri));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String email = callerEmail(request);
        Document user = userAccountService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        String code = body == null ? null : body.get("code");
        String secret = user.getString("twoFactorSecret");

        if (twoFactorService.isOtpValid(secret, code)) {
            userAccountService.collection().updateOne(
                    userAccountService.emailFilter(email),
                    Updates.set("twoFactorEnabled", true));
            return ResponseEntity.ok(Map.of("message", "Two-factor authentication enabled"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Invalid code"));
    }

    @PostMapping("/disable")
    public ResponseEntity<?> disable(@RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {
        String email = callerEmail(request);
        Document user = userAccountService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        String code = body == null ? null : body.get("code");
        String secret = user.getString("twoFactorSecret");
        if (!twoFactorService.isOtpValid(secret, code)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid code"));
        }

        userAccountService.collection().updateOne(
                userAccountService.emailFilter(email),
                Updates.combine(
                        Updates.set("twoFactorEnabled", false),
                        Updates.set("twoFactorSecret", null)));

        return ResponseEntity.ok(Map.of("message", "Two-factor authentication disabled"));
    }
}
