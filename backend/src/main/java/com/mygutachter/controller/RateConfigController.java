package com.mygutachter.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.UpdateOptions;
import com.mygutachter.model.RateConfig;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/config")
public class RateConfigController {

    private final MongoCollection<Document> collection;
    private final ObjectMapper objectMapper;

    @Autowired
    public RateConfigController(MongoDatabase database,
            ObjectMapper objectMapper,
            @Value("${mongodb.collections.rateConfig}") String collectionName) {
        this.collection = database.getCollection(collectionName);
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<Document> getConfig() {
        // Global config
        Document config = collection.find(Filters.eq("type", "global")).first();
        if (config == null) {
            return ResponseEntity.ok(new Document());
        }
        config.remove("_id");
        return ResponseEntity.ok(config);
    }

    @GetMapping("/customers")
    public ResponseEntity<List<Document>> getAllCustomerConfigs(HttpServletRequest request) {
        String userRole = (String) request.getAttribute("userRole");
        if (!"ADMIN".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }

        List<Document> configs = new ArrayList<>();
        collection.find(Filters.eq("type", "customer")).into(configs);
        configs.forEach(doc -> doc.remove("_id"));
        return ResponseEntity.ok(configs);
    }

    @GetMapping("/customer/{customerNumber}")
    public ResponseEntity<Document> getCustomerConfig(@PathVariable String customerNumber) {
        Document config = collection.find(Filters.and(
                Filters.eq("type", "customer"),
                Filters.eq("customerNumber", customerNumber))).first();

        // If not found or inactive, fallback to global
        if (config == null || (config.containsKey("isActive") && !config.getBoolean("isActive"))) {
            Document globalConfig = collection.find(Filters.eq("type", "global")).first();
            if (globalConfig != null) {
                globalConfig.remove("_id");
                return ResponseEntity.ok(globalConfig);
            }
            return ResponseEntity.notFound().build();
        }

        config.remove("_id");
        return ResponseEntity.ok(config);
    }

    @PostMapping("/copy")
    public ResponseEntity<Void> copyConfig(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String userRole = (String) request.getAttribute("userRole");
        if (!"ADMIN".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }

        String from = payload.get("from"); // customerNumber or "global"
        String to = payload.get("to"); // customerNumber
        String toName = payload.get("toName");

        Document source;
        if ("global".equals(from)) {
            source = collection.find(Filters.eq("type", "global")).first();
        } else {
            source = collection.find(Filters.and(Filters.eq("type", "customer"), Filters.eq("customerNumber", from)))
                    .first();
        }

        if (source == null) {
            return ResponseEntity.notFound().build();
        }

        source.remove("_id");
        source.put("type", "customer");
        source.put("customerNumber", to);
        if (toName != null) {
            source.put("customerName", toName);
        }
        source.put("isActive", true);

        collection.updateOne(
                Filters.and(Filters.eq("type", "customer"), Filters.eq("customerNumber", to)),
                new Document("$set", source),
                new UpdateOptions().upsert(true));

        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<RateConfig> saveConfig(@RequestBody RateConfig config, HttpServletRequest request) {
        String userRole = (String) request.getAttribute("userRole");
        if (!"ADMIN".equals(userRole)) {
            return ResponseEntity.status(403).build();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> map = objectMapper.convertValue(config, Map.class);

        Document updateFields = new Document("type", "global");
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (entry.getValue() != null && !entry.getKey().equals("_id")) {
                updateFields.append(entry.getKey(), entry.getValue());
            }
        }
        updateFields.put("type", "global");
        updateFields.put("isActive", true); // Global is always active

        Document updateDoc = new Document("$set", updateFields);

        collection.updateOne(
                Filters.eq("type", "global"),
                updateDoc,
                new UpdateOptions().upsert(true));

        return ResponseEntity.ok(config);
    }

    @PostMapping("/customer/{customerNumber}")
    public ResponseEntity<RateConfig> saveCustomerConfig(
            @PathVariable String customerNumber,
            @RequestBody RateConfig config,
            HttpServletRequest request) {

        String userRole = (String) request.getAttribute("userRole");
        if (!"ADMIN".equals(userRole)) {
            // Potentially allow experts if needed, but per requirements it's usually Admin
            // return ResponseEntity.status(403).build();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> map = objectMapper.convertValue(config, Map.class);

        Document updateFields = new Document("type", "customer")
                .append("customerNumber", customerNumber);

        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (entry.getValue() != null && !entry.getKey().equals("_id")) {
                updateFields.append(entry.getKey(), entry.getValue());
            }
        }
        updateFields.put("type", "customer");
        updateFields.put("customerNumber", customerNumber);

        Document updateDoc = new Document("$set", updateFields);

        collection.updateOne(
                Filters.and(Filters.eq("type", "customer"), Filters.eq("customerNumber", customerNumber)),
                updateDoc,
                new UpdateOptions().upsert(true));

        return ResponseEntity.ok(config);
    }
}
