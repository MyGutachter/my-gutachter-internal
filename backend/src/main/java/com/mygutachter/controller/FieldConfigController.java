package com.mygutachter.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.UpdateOptions;
import com.mygutachter.model.FieldConfig;
import jakarta.servlet.http.HttpServletRequest;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/field-configs")
public class FieldConfigController {

    private final MongoCollection<Document> collection;
    private final ObjectMapper objectMapper;

    @Autowired
    public FieldConfigController(MongoDatabase database,
            ObjectMapper objectMapper,
            @Value("${mongodb.collections.fieldConfigs}") String collectionName) {
        this.collection = database.getCollection(collectionName);
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<List<Document>> getAllConfigs(@RequestParam(required = false) String customerNumber) {
        List<Document> globalConfigs = new ArrayList<>();
        collection.find(Filters.or(Filters.exists("type", false), Filters.eq("type", "global"))).forEach(doc -> {
            doc.remove("_id");
            globalConfigs.add(doc);
        });

        if (customerNumber != null && !customerNumber.trim().isEmpty()) {
            String trimmed = customerNumber.trim();
            List<org.bson.conversions.Bson> orClauses = new ArrayList<>();
            orClauses.add(Filters.eq("customerNumber", trimmed));
            orClauses.add(Filters.regex("customerNumber", "^" + java.util.regex.Pattern.quote(trimmed) + "$", "i"));
            try {
                orClauses.add(Filters.eq("customerNumber", Integer.parseInt(trimmed)));
            } catch (NumberFormatException ignored) {}

            List<Document> customerConfigs = new ArrayList<>();
            collection.find(Filters.and(Filters.eq("type", "customer"), Filters.or(orClauses))).forEach(doc -> {
                doc.remove("_id");
                customerConfigs.add(doc);
            });

            // Merge logic: customer overrides global
            Map<String, Document> mergedMap = new HashMap<>();
            for (Document doc : globalConfigs) {
                String fName = doc.getString("fieldName");
                if (fName != null) {
                    mergedMap.put(fName, new Document(doc));
                }
            }
            for (Document doc : customerConfigs) {
                String fieldName = doc.getString("fieldName");
                if (fieldName != null) {
                    if (mergedMap.containsKey(fieldName)) {
                        mergedMap.get(fieldName).putAll(doc);
                    } else {
                        mergedMap.put(fieldName, new Document(doc));
                    }
                }
            }
            return ResponseEntity.ok(new ArrayList<>(mergedMap.values()));
        }

        return ResponseEntity.ok(globalConfigs);
    }

    @PostMapping
    public ResponseEntity<FieldConfig> updateConfig(@RequestBody FieldConfig config, HttpServletRequest request) {
        String userRole = (String) request.getAttribute("userRole");
        if (userRole == null || !"ADMIN".equalsIgnoreCase(userRole)) {
            return ResponseEntity.status(403).build();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> map = objectMapper.convertValue(config, Map.class);

        Document updateFields = new Document();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (entry.getValue() != null && !entry.getKey().equals("_id") && !entry.getKey().equals("customerNumber") && !entry.getKey().equals("type")) {
                updateFields.append(entry.getKey(), entry.getValue());
            }
        }
        updateFields.put("type", "global");

        Document updateDoc = new Document("$set", updateFields);

        collection.updateOne(
                Filters.and(Filters.eq("fieldName", config.getFieldName()), Filters.or(Filters.exists("type", false), Filters.eq("type", "global"))),
                updateDoc,
                new UpdateOptions().upsert(true));

        return ResponseEntity.ok(config);
    }

    @PostMapping("/customer/{customerNumber}")
    public ResponseEntity<FieldConfig> updateCustomerConfig(@PathVariable String customerNumber, @RequestBody FieldConfig config, HttpServletRequest request) {
        String userRole = (String) request.getAttribute("userRole");
        if (userRole == null || !"ADMIN".equalsIgnoreCase(userRole)) {
            return ResponseEntity.status(403).build();
        }

        String trimmed = customerNumber != null ? customerNumber.trim() : "";

        @SuppressWarnings("unchecked")
        Map<String, Object> map = objectMapper.convertValue(config, Map.class);

        Document updateFields = new Document();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (entry.getValue() != null && !entry.getKey().equals("_id") && !entry.getKey().equals("customerNumber") && !entry.getKey().equals("type")) {
                updateFields.append(entry.getKey(), entry.getValue());
            }
        }
        updateFields.put("type", "customer");
        updateFields.put("customerNumber", trimmed);

        Document updateDoc = new Document("$set", updateFields);

        List<org.bson.conversions.Bson> orClauses = new ArrayList<>();
        orClauses.add(Filters.eq("customerNumber", trimmed));
        orClauses.add(Filters.regex("customerNumber", "^" + java.util.regex.Pattern.quote(trimmed) + "$", "i"));
        try {
            orClauses.add(Filters.eq("customerNumber", Integer.parseInt(trimmed)));
        } catch (NumberFormatException ignored) {}

        collection.updateOne(
                Filters.and(
                    Filters.eq("fieldName", config.getFieldName()),
                    Filters.eq("type", "customer"),
                    Filters.or(orClauses)
                ),
                updateDoc,
                new UpdateOptions().upsert(true));

        return ResponseEntity.ok(config);
    }
}
