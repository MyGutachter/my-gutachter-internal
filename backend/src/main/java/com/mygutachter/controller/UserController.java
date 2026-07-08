package com.mygutachter.controller;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import com.mygutachter.model.UserRole;
import jakarta.servlet.http.HttpServletRequest;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class UserController {

    private final MongoCollection<Document> collection;

    public UserController(MongoDatabase database,
                          @Value("${mongodb.collections.users}") String collectionName) {
        this.collection = database.getCollection(collectionName);
    }

    private boolean isAdmin(HttpServletRequest request) {
        return "ADMIN".equals(request.getAttribute("userRole"));
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers(HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        List<Map<String, Object>> users = new ArrayList<>();
        for (Document doc : collection.find()) {
            Map<String, Object> user = new HashMap<>();
            user.put("email", doc.getString("email"));
            user.put("username", doc.getString("username"));
            user.put("role", doc.getString("role"));
            user.put("canViewAllOrders", doc.getBoolean("canViewAllOrders", false));
            users.add(user);
        }

        return ResponseEntity.ok(users);
    }

    @PutMapping("/{email:.+}/role")
    public ResponseEntity<?> updateUserRole(
            @PathVariable String email,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        if (!isAdmin(request)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        String decodedEmail = email;

        String roleStr = body.get("role");
        if (roleStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Role is required"));
        }

        try {
            UserRole role = UserRole.valueOf(roleStr);
            Document result = collection.findOneAndUpdate(
                    Filters.regex("email", "^" + java.util.regex.Pattern.quote(decodedEmail) + "$", "i"),
                    Updates.set("role", role.name())
            );

            if (result == null) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            return ResponseEntity.ok(Map.of("message", "User role updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
        }
    }

    @PutMapping("/{email:.+}/can-view-all-orders")
    public ResponseEntity<?> updateCanViewAllOrders(
            @PathVariable String email,
            @RequestBody Map<String, Boolean> body,
            HttpServletRequest request) {

        if (!isAdmin(request)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        String decodedEmail = email;

        Boolean canViewAll = body.get("canViewAllOrders");
        if (canViewAll == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "canViewAllOrders is required"));
        }

        Document result = collection.findOneAndUpdate(
                Filters.regex("email", "^" + java.util.regex.Pattern.quote(decodedEmail) + "$", "i"),
                Updates.set("canViewAllOrders", canViewAll)
        );

        if (result == null) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found: " + decodedEmail));
        }

        return ResponseEntity.ok(Map.of(
                "message", "User permission updated successfully",
                "email", decodedEmail,
                "canViewAllOrders", canViewAll
        ));
    }
}
