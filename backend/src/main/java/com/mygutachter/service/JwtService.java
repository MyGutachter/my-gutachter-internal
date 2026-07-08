package com.mygutachter.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    // HS256 key derived from the configured Base64 secret. Unlike the previous
    // random-per-startup key, this is stable across restarts and instances — required
    // for a multi-server deployment (Decision Q11).
    private final SecretKey secretKey;
    private final long expirationTime;

    public static final String CLAIM_NAME = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
    public static final String CLAIM_EMAIL = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
    public static final String CLAIM_ROLE = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired
    public JwtService(com.fasterxml.jackson.databind.ObjectMapper objectMapper,
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expirationTime) {
        this.objectMapper = objectMapper;
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationTime = expirationTime;
    }

    public String generateToken(String username, String role, String email, String externalToken) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("username", username);
        if (externalToken != null) {
            claims.put("externalToken", externalToken);
        }
        return createToken(claims, email);
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(secretKey)
                .compact();
    }

    // --- Two-factor login temp token (T2.4) -------------------------------------
    // Short-lived token issued by /api/auth/login when 2FA is enabled. It carries a
    // "type":"2fa_temp" claim and the user's email (subject) only — no role/username —
    // and is exchanged for a full JWT at /api/auth/2fa/login-verify. The auth filter
    // ignores temp tokens so they can't authenticate normal endpoints.
    private static final String TEMP_TOKEN_TYPE = "2fa_temp";
    private static final long TEMP_TOKEN_EXPIRATION_MS = 1000L * 60 * 5; // 5 minutes

    public String generateTempToken(String email) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", TEMP_TOKEN_TYPE);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + TEMP_TOKEN_EXPIRATION_MS))
                .signWith(secretKey)
                .compact();
    }

    public boolean isTempToken(String token) {
        try {
            return TEMP_TOKEN_TYPE.equals(extractAllClaims(token).get("type"));
        } catch (Exception e) {
            return false;
        }
    }

    // --- OMT deep-link token (T7.9) ----------------------------------------------
    // Signed, short-lived token minted by OMT (not by this app) to open an order's video
    // call or report in one click without exposing the raw API key as cleartext in a URL
    // (unlike the older `?apikey=` links). OMT signs with the SAME shared secret
    // (`jwt.secret` here / `MergedApp:JwtSecret` there), explicitly as HS256 — both sides
    // force HS256 rather than relying on key-length auto-selection, since they're two
    // independently implemented JWT stacks (jjwt here, System.IdentityModel.Tokens.Jwt in
    // OMT) that must agree on the algorithm regardless of the configured secret's length.
    private static final String DEEPLINK_TOKEN_TYPE = "deeplink";

    /**
     * Verifies signature + expiry (via the normal parser) and the {@code type=deeplink}
     * claim, then returns all claims ({@code orderId}, {@code apiKey}, {@code app}).
     * Throws (unchecked, jjwt {@code JwtException}/{@code IllegalArgumentException}) on any
     * invalid, expired, or non-deep-link token — callers should catch broadly.
     */
    public Map<String, Object> parseDeepLinkClaims(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
        if (!DEEPLINK_TOKEN_TYPE.equals(claims.get("type"))) {
            throw new io.jsonwebtoken.JwtException("Not a deep-link token");
        }
        return new HashMap<>(claims);
    }

    public Boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(secretKey).build().parseClaimsJws(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        final Claims claims = extractAllClaims(token);
        return (String) claims.get("username");
    }

    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractRole(String token) {
        final Claims claims = extractAllClaims(token);
        return (String) claims.get("role");
    }

    public String extractExternalToken(String token) {
        final Claims claims = extractAllClaims(token);
        return (String) claims.get("externalToken");
    }

    public java.util.Map<String, Object> parseUnverifiedClaims(String token) {
        String[] parts = token.split("\\.");
        if (parts.length < 2)
            return new java.util.HashMap<>();
        try {
            String payload = parts[1];
            // Normalize for Base64 URL decoding: replace - with + and _ with /
            // Although getUrlDecoder() handles this, some environments might be finicky
            payload = payload.replace('-', '+').replace('_', '/');

            // Add padding if missing (Base64.getDecoder() needs padding, getUrlDecoder()
            // might too depending on version)
            int missingPadding = (4 - payload.length() % 4) % 4;
            if (missingPadding > 0 && missingPadding < 4) {
                for (int i = 0; i < missingPadding; i++) {
                    payload += "=";
                }
            }

            byte[] decodedBytes = java.util.Base64.getDecoder().decode(payload);
            return objectMapper.readValue(decodedBytes,
                    new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {
                    });
        } catch (Exception e) {
            System.err.println("JWT Parsing Error: " + e.getMessage());
            return new java.util.HashMap<>();
        }
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(secretKey).build().parseClaimsJws(token).getBody();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
}
