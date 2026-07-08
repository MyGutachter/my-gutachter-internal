package com.mygutachter.controller;

import com.mongodb.client.model.Updates;
import com.mygutachter.model.ApiKey;
import com.mygutachter.model.AuthResponse;
import com.mygutachter.model.UserRole;
import com.mygutachter.model.QuickRegisterRequest;
import com.mygutachter.model.QuickRegisterResponse;
import com.mygutachter.service.ApiKeyService;
import com.mygutachter.service.EmailService;
import com.mygutachter.service.JwtService;
import com.mygutachter.service.OrderService;
import com.mygutachter.service.TwoFactorService;
import com.mygutachter.service.UserAccountService;
import com.mygutachter.util.PasswordValidator;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Public authentication endpoints under {@code /api/auth/**} (permitAll in SecurityConfig):
 * password reset, the 2FA login-verify exchange, and API-key login.
 *
 * <p>All mint the same internal JWT as {@code InternalAuthController} via
 * {@link JwtService#generateToken} with {@code externalToken=null} (internal sessions
 * can't act on OMT's behalf).
 */
@RestController
@RequestMapping("/api/auth")
public class PublicAuthController {

    private final UserAccountService userAccountService;
    private final ApiKeyService apiKeyService;
    private final TwoFactorService twoFactorService;
    private final EmailService emailService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final OrderService orderService;
    private final String frontendUrl;
    private final String quickRegisterApiKey;

    public PublicAuthController(UserAccountService userAccountService,
            ApiKeyService apiKeyService,
            TwoFactorService twoFactorService,
            EmailService emailService,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            OrderService orderService,
            @Value("${app.frontend-url}") String frontendUrl,
            @Value("${app.quick-register.api-key}") String quickRegisterApiKey) {
        this.userAccountService = userAccountService;
        this.apiKeyService = apiKeyService;
        this.twoFactorService = twoFactorService;
        this.emailService = emailService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.orderService = orderService;
        this.frontendUrl = frontendUrl;
        this.quickRegisterApiKey = quickRegisterApiKey;
    }

    // --- Password reset ---------------------------------------------------------

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body == null ? null : body.get("email");
        if (email != null && !email.trim().isEmpty()) {
            Document user = userAccountService.findByEmail(email.trim());
            if (user != null) {
                String token = UUID.randomUUID().toString();
                Date expiry = Date.from(Instant.now().plus(1, ChronoUnit.HOURS));
                userAccountService.collection().updateOne(
                        userAccountService.emailFilter(user.getString("email")),
                        Updates.combine(
                                Updates.set("resetPasswordToken", token),
                                Updates.set("resetPasswordTokenExpiry", expiry)));
                try {
                    String resetLink = frontendUrl + "/reset-password?token=" + token;
                    emailService.sendPasswordResetEmail(user.getString("email"), resetLink);
                } catch (Exception e) {
                    // Do not leak delivery failures to the caller.
                    System.err.println("Failed to send password reset email: " + e.getMessage());
                }
            }
        }
        // Always generic — never reveal whether the email exists.
        return ResponseEntity.ok(Map.of(
                "message", "If an account exists for that email, a password reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token = body == null ? null : body.get("token");
        String newPassword = body == null ? null : body.get("newPassword");

        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired reset token"));
        }

        Document user = userAccountService.findByResetToken(token);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired reset token"));
        }

        Date expiry = user.getDate("resetPasswordTokenExpiry");
        if (expiry == null || expiry.before(new Date())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired reset token"));
        }

        try {
            PasswordValidator.validate(newPassword);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }

        userAccountService.collection().updateOne(
                userAccountService.emailFilter(user.getString("email")),
                Updates.combine(
                        Updates.set("password", passwordEncoder.encode(newPassword)),
                        Updates.set("resetPasswordToken", null),
                        Updates.set("resetPasswordTokenExpiry", null)));

        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully"));
    }

    // --- 2FA login exchange -----------------------------------------------------

    @PostMapping("/2fa/login-verify")
    public ResponseEntity<?> loginVerify(@RequestBody Map<String, String> body) {
        String tempToken = body == null ? null : body.get("tempToken");
        String code = body == null ? null : body.get("code");

        if (tempToken == null || !Boolean.TRUE.equals(jwtService.validateToken(tempToken))
                || !jwtService.isTempToken(tempToken)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired session"));
        }

        String email = jwtService.extractEmail(tempToken);
        Document user = userAccountService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired session"));
        }

        if (!twoFactorService.isOtpValid(user.getString("twoFactorSecret"), code)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid code"));
        }

        return ResponseEntity.ok(buildAuthResponse(user));
    }

    // --- API-key login ----------------------------------------------------------

    @PostMapping("/api-key-login")
    public ResponseEntity<?> apiKeyLogin(@RequestBody Map<String, String> body) {
        String key = body == null ? null : body.get("apiKey");
        if (key == null || key.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid API key"));
        }

        Optional<ApiKey> apiKeyOpt = apiKeyService.findByKey(key);
        if (apiKeyOpt.isEmpty() || !apiKeyOpt.get().isActive()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid API key"));
        }
        ApiKey apiKey = apiKeyOpt.get();

        Document user = userAccountService.findByEmail(apiKey.getUserEmail());
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found for this API key"));
        }

        apiKeyService.updateLastUsed(apiKey);
        return ResponseEntity.ok(buildAuthResponse(user));
    }

    // --- OMT deep-link (T7.9) ----------------------------------------------------
    // Single entry point for BOTH "open in Video Expert" and "open in Vehicle Report" links
    // generated by OMT (OrderAppService.OpenVideoDeepLink/OpenReportDeepLink). Unlike
    // api-key-login above (POST, JSON body, consumed by the SPA), this is a GET that a user
    // clicks directly: it decodes + validates the signed token itself, then 302-redirects
    // straight into the frontend with the resolved session already minted — no extra
    // frontend→backend round trip needed. On ANY failure (bad/expired/wrong-type token,
    // unknown/inactive API key, missing user) it redirects to the login page rather than
    // rendering a raw error, per the "redirect via 302 if possible" requirement.
    @GetMapping("/deeplink")
    public ResponseEntity<?> deepLink(@RequestParam String token) {
        Map<String, Object> claims;
        try {
            claims = jwtService.parseDeepLinkClaims(token);
        } catch (Exception e) {
            return redirectTo(frontendUrl + "/login?error=deeplink");
        }

        // orderId is OPTIONAL — OMT's bare "open the video app" link (OpenVideoCall, no
        // specific order) omits it entirely; apiKey is always required to resolve the user.
        String orderId = (String) claims.get("orderId");
        String apiKey = (String) claims.get("apiKey");
        String app = (String) claims.get("app");
        if (apiKey == null || apiKey.isEmpty()) {
            return redirectTo(frontendUrl + "/login?error=deeplink");
        }

        Optional<ApiKey> apiKeyOpt = apiKeyService.findByKey(apiKey);
        if (apiKeyOpt.isEmpty() || !apiKeyOpt.get().isActive()) {
            return redirectTo(frontendUrl + "/login?error=deeplink");
        }
        ApiKey resolvedApiKey = apiKeyOpt.get();

        Document user = userAccountService.findByEmail(resolvedApiKey.getUserEmail());
        if (user == null) {
            return redirectTo(frontendUrl + "/login?error=deeplink");
        }
        apiKeyService.updateLastUsed(resolvedApiKey);

        AuthResponse auth = buildAuthResponse(user);
        boolean isVideoxpert = "video".equalsIgnoreCase(app);
        boolean hasOrder = orderId != null && !orderId.isEmpty();
        if (hasOrder) {
            orderService.existsAndEnsureMode(orderId, app);
        }

        // With an order: land on /order/{id} (routes to the call or the report form). Without
        // one (OpenVideoCall's bare app-home link): land on the id-less /order route — the SAME
        // OrderDeepLinkPage component, which already falls back to /video when orderId is absent.
        String destinationPath = hasOrder ? "/order/" + encode(orderId) : "/order";

        StringBuilder redirectUrl = new StringBuilder(frontendUrl)
                .append(destinationPath)
                .append("?token=").append(encode(auth.getJwt()))
                .append("&expertName=").append(encode(auth.getExpertName()))
                .append("&role=").append(encode(auth.getRole().name()))
                .append("&isVideoxpert=").append(isVideoxpert);
        if (hasOrder) {
            redirectUrl.append("&caseNumber=").append(encode(orderId));
        }
        return redirectTo(redirectUrl.toString());
    }

    private static ResponseEntity<?> redirectTo(String url) {
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(url)).build();
    }

    private static String encode(String value) {
        return value == null ? "" : URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    @PostMapping("/quick-register")
    public ResponseEntity<?> quickRegister(
            @RequestBody QuickRegisterRequest request,
            @RequestHeader(value = "X-API-Key", required = false) String headerApiKey) {
        String keyToCheck = request.getApiKey();
        if (keyToCheck == null || keyToCheck.isEmpty()) {
            keyToCheck = headerApiKey;
        }

        if (keyToCheck == null || !keyToCheck.equals(quickRegisterApiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid Quick Register API Key"));
        }

        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        String email = request.getEmail().trim();
        Document existingUser = userAccountService.findByEmail(email);

        if (existingUser != null) {
            String existingEmail = existingUser.getString("email");
            List<ApiKey> apiKeys = apiKeyService.getApiKeys(existingEmail);
            ApiKey activeKey = apiKeys.stream()
                    .filter(ApiKey::isActive)
                    .findFirst()
                    .orElseGet(() -> apiKeyService.generateApiKey(existingEmail, "Default Key"));

            Object idObj = existingUser.get("_id");
            String userId = idObj != null ? idObj.toString() : "";

            return ResponseEntity.ok(new QuickRegisterResponse(userId, activeKey.getKey()));
        }

        // Create new user Document
        String randomPassword = UUID.randomUUID().toString();
        String hashedPassword = passwordEncoder.encode(randomPassword);

        UserRole mappedRole = UserRole.EXPERT;
        if (request.getRoles() != null) {
            if (request.getRoles().contains("Admin")) {
                mappedRole = UserRole.ADMIN;
            } else if (request.getRoles().contains("Expert")) {
                mappedRole = UserRole.EXPERT;
            } else if (request.getRoles().contains("Dispatch")) {
                mappedRole = UserRole.DISPATCH;
            } else if (request.getRoles().contains("Accounting")) {
                mappedRole = UserRole.ACCOUNTING;
            }
        }

        Document newUser = new Document("email", email)
                .append("username", request.getName())
                .append("fullName", request.getName())
                .append("password", hashedPassword)
                .append("role", mappedRole.name())
                .append("twoFactorEnabled", false)
                .append("connectedWithOmt", true)
                .append("createdDate", new Date())
                .append("updatedDate", new Date());

        userAccountService.collection().insertOne(newUser);

        // Fetch back to get generated ID
        Document savedUser = userAccountService.findByEmail(email);
        if (savedUser == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to retrieve registered user"));
        }

        ApiKey apiKey = apiKeyService.generateApiKey(email, "Default Key");

        Object idObj = savedUser.get("_id");
        String userId = idObj != null ? idObj.toString() : "";

        return ResponseEntity.ok(new QuickRegisterResponse(userId, apiKey.getKey()));
    }

    // --- shared -----------------------------------------------------------------

    private AuthResponse buildAuthResponse(Document user) {
        String resolvedEmail = user.getString("email");
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

        String internalJwt = jwtService.generateToken(name, role.name(), resolvedEmail, null);
        return new AuthResponse(internalJwt, name, role, null);
    }
}
