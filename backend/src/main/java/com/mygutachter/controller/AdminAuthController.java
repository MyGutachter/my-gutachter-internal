package com.mygutachter.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.UpdateOptions;
import com.mygutachter.model.AdminLoginRequest;
import com.mygutachter.model.AuthResponse;
import com.mygutachter.model.UserRole;
import com.mygutachter.service.JwtService;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/auth/admin")
public class AdminAuthController {

    private final MongoCollection<Document> collection;
    private final JwtService jwtService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String adminAuthUrl;

    @Autowired
    public AdminAuthController(MongoDatabase database,
            JwtService jwtService,
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${mongodb.collections.users}") String collectionName,
            @Value("${external.admin-auth.url}") String adminAuthUrl) {
        this.collection = database.getCollection(collectionName);
        this.jwtService = jwtService;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.adminAuthUrl = adminAuthUrl;
    }

    @PostMapping("/login")
    public ResponseEntity<?> adminLogin(@RequestBody AdminLoginRequest request) {
        // Validate input
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()
                || request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("error", "Email and password are required"));
        }

        try {
            // Build request to external auth API
            Map<String, Object> externalBody = new HashMap<>();
            externalBody.put("userNameOrEmailAddress", request.getEmail());
            externalBody.put("password", request.getPassword());
            externalBody.put("rememberClient", false);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(externalBody, headers);

            ResponseEntity<String> externalResponse = restTemplate.exchange(
                    adminAuthUrl, HttpMethod.POST, entity, String.class);

            if (!externalResponse.getStatusCode().is2xxSuccessful() || externalResponse.getBody() == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
            }

            // Parse external response
            JsonNode root = objectMapper.readTree(externalResponse.getBody());

            boolean success = root.has("success") && root.get("success").asBoolean();
            if (!success) {
                String errorMsg = "Invalid email or password";
                if (root.has("error") && !root.get("error").isNull()) {
                    JsonNode errorNode = root.get("error");
                    if (errorNode.has("message")) {
                        errorMsg = errorNode.get("message").asText();
                    }
                }
                return ResponseEntity.status(401).body(Map.of("error", errorMsg));
            }

            if (!root.has("result") || root.get("result").isNull()) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
            }

            JsonNode resultNode = root.get("result");
            String accessToken = resultNode.has("accessToken") ? resultNode.get("accessToken").asText() : null;

            if (accessToken == null || accessToken.isEmpty()) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
            }

            // Decode JWT payload (base64 decode, no signature verification)
            Map<String, Object> jwtPayload = decodeJwtPayload(accessToken);
            if (jwtPayload == null) {
                return ResponseEntity.status(500).body(Map.of("error", "Failed to process authentication token"));
            }

            // Extract roles from OMT JWT and map to internal UserRole
            String roleClaim = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
            Object rolesObj = jwtPayload.get(roleClaim);

            List<String> omtRoles = new ArrayList<>();
            if (rolesObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<String> roleList = (List<String>) rolesObj;
                omtRoles.addAll(roleList);
            } else if (rolesObj instanceof String) {
                omtRoles.add((String) rolesObj);
            }

            // Map OMT role to internal UserRole (Admin > Expert > Dispatch > Accounting)
            UserRole internalRole = UserRole.EXPERT; // default for any authenticated OMT user
            for (String r : omtRoles) {
                if ("Admin".equalsIgnoreCase(r)) {
                    internalRole = UserRole.ADMIN;
                    break;
                } else if ("Expert".equalsIgnoreCase(r)) {
                    internalRole = UserRole.EXPERT;
                    break;
                } else if ("Dispatch".equalsIgnoreCase(r)) {
                    internalRole = UserRole.DISPATCH;
                    break;
                } else if ("Accounting".equalsIgnoreCase(r)) {
                    internalRole = UserRole.ACCOUNTING;
                    break;
                }
            }

            // Extract user info from JWT
            String nameClaim = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
            String emailClaim = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";

            String name = jwtPayload.containsKey(nameClaim) ? jwtPayload.get(nameClaim).toString() : request.getEmail();
            String email = jwtPayload.containsKey(emailClaim) ? jwtPayload.get(emailClaim).toString()
                    : request.getEmail();

            // Determine final role to use (prefer database role if user already exists)
            UserRole roleToUse = internalRole;
            Document existingUser = collection.find(Filters.regex("email", "^" + java.util.regex.Pattern.quote(email) + "$", "i")).first();
            if (existingUser != null && existingUser.getString("role") != null) {
                try {
                    roleToUse = UserRole.valueOf(existingUser.getString("role"));
                } catch (IllegalArgumentException e) {
                    roleToUse = internalRole;
                }
            }

            // Save or update user in MongoDB with their actual role, preserving existing properties like canViewAllOrders
            // Merge-by-email (Q1): the case-insensitive email match updates an existing
            // internal (password) user in place and flips connectedWithOmt on, so both
            // login paths share a single user doc. Existing props (canViewAllOrders,
            // password) are preserved.
            collection.updateOne(
                    Filters.regex("email", "^" + java.util.regex.Pattern.quote(email) + "$", "i"),
                    new Document("$set", new Document("email", email)
                            .append("username", name)
                            .append("role", roleToUse.name())
                            .append("connectedWithOmt", true)),
                    new UpdateOptions().upsert(true));

            // Generate internal JWT with the correct role and include external OMT token
            String internalJwt = jwtService.generateToken(name, roleToUse.name(), email, accessToken);

            AuthResponse res = new AuthResponse(internalJwt, name, roleToUse, null);
            return ResponseEntity.ok(res);

        } catch (HttpClientErrorException e) {
            System.err.println("External Auth API error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED || e.getStatusCode() == HttpStatus.BAD_REQUEST) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
            }
            return ResponseEntity.status(502).body(Map.of("error", "Authentication service is unavailable"));
        } catch (Exception e) {
            System.err.println("Admin login error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(502).body(Map.of("error", "Authentication service is unavailable"));
        }
    }

    /**
     * Decode JWT payload without signature verification.
     * The JWT from the external system is signed with their key which we don't
     * have.
     * We only need the payload claims (roles, name, email).
     */
    private Map<String, Object> decodeJwtPayload(String jwt) {
        try {
            String[] parts = jwt.split("\\.");
            if (parts.length < 2) {
                return null;
            }

            String payload = parts[1];
            // Add padding if needed
            int padding = 4 - (payload.length() % 4);
            if (padding != 4) {
                payload += "=".repeat(padding);
            }

            byte[] decodedBytes = Base64.getUrlDecoder().decode(payload);
            String decodedPayload = new String(decodedBytes);

            @SuppressWarnings("unchecked")
            Map<String, Object> payloadMap = objectMapper.readValue(decodedPayload, Map.class);
            return payloadMap;
        } catch (Exception e) {
            System.err.println("Failed to decode JWT payload: " + e.getMessage());
            return null;
        }
    }
}
