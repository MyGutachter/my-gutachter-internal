package com.mygutachter.service;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * Thin accessor over the raw {@code users} collection (BSON {@link Document}s, not Spring Data),
 * matching the convention used by {@code InternalAuthController}/{@code AdminAuthController}.
 * Shared by the password-reset, 2FA and API-key flows so they resolve/match users consistently
 * (case-insensitive email).
 */
@Service
public class UserAccountService {

    private final MongoCollection<Document> users;

    public UserAccountService(MongoDatabase database,
            @Value("${mongodb.collections.users}") String collectionName) {
        this.users = database.getCollection(collectionName);
    }

    public MongoCollection<Document> collection() {
        return users;
    }

    /** Case-insensitive exact email filter, identical to the login controllers. */
    public Bson emailFilter(String email) {
        return Filters.regex("email", "^" + Pattern.quote(email) + "$", "i");
    }

    public Document findByEmail(String email) {
        if (email == null) {
            return null;
        }
        return users.find(emailFilter(email)).first();
    }

    public Document findByResetToken(String token) {
        if (token == null) {
            return null;
        }
        return users.find(Filters.eq("resetPasswordToken", token)).first();
    }
}
