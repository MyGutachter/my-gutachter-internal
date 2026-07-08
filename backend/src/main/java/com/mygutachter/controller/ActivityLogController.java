package com.mygutachter.controller;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/activity-log")
public class ActivityLogController {

    private final MongoCollection<Document> collection;

    @Autowired
    public ActivityLogController(MongoDatabase database,
            @Value("${mongodb.collections.activity_logs:activity_logs}") String collectionName) {
        this.collection = database.getCollection(collectionName);
    }

    @GetMapping("/by-order/{orderId}")
    public ResponseEntity<Map<String, Object>> getLogsByOrder(
            @PathVariable String orderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String user) {

        List<Bson> filters = new ArrayList<>();
        filters.add(Filters.eq("orderId", orderId));

        if (category != null && !category.isEmpty()) {
            filters.add(Filters.eq("category", category));
        }
        if (user != null && !user.isEmpty()) {
            filters.add(Filters.eq("userId", user));
        }

        Bson filter = Filters.and(filters);
        long totalItems = collection.countDocuments(filter);

        List<Document> logs = new ArrayList<>();
        collection.find(filter)
                .sort(Sorts.descending("creationTime"))
                .skip(page * size)
                .limit(size)
                .into(logs);

        // Remove _id for cleaner output
        logs.forEach(l -> l.remove("_id"));

        return ResponseEntity.ok(Map.of(
                "items", logs,
                "totalItems", totalItems,
                "currentPage", page,
                "totalPages", (int) Math.ceil((double) totalItems / size)));
    }

    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String user,
            @RequestParam(required = false) String orderId) {

        List<Bson> filters = new ArrayList<>();
        
        if (category != null && !category.isEmpty()) {
            filters.add(Filters.eq("category", category));
        }
        if (user != null && !user.isEmpty()) {
            filters.add(Filters.eq("userId", user));
        }
        if (orderId != null && !orderId.isEmpty()) {
            filters.add(Filters.eq("orderId", orderId));
        }

        Bson filter = filters.isEmpty() ? new Document() : Filters.and(filters);
        long totalItems = collection.countDocuments(filter);

        List<Document> logs = new ArrayList<>();
        collection.find(filter)
                .sort(Sorts.descending("creationTime"))
                .skip(page * size)
                .limit(size)
                .into(logs);

        logs.forEach(l -> l.remove("_id"));

        return ResponseEntity.ok(Map.of(
                "items", logs,
                "totalItems", totalItems,
                "currentPage", page,
                "totalPages", (int) Math.ceil((double) totalItems / size)));
    }
}
