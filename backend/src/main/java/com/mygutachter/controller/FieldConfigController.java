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

        if (customerNumber != null && !customerNumber.isEmpty()) {
            List<Document> customerConfigs = new ArrayList<>();
            collection.find(Filters.and(Filters.eq("type", "customer"), Filters.eq("customerNumber", customerNumber))).forEach(doc -> {
                doc.remove("_id");
                customerConfigs.add(doc);
            });

            // Merge logic: customer overrides global
            Map<String, Document> mergedMap = new HashMap<>();
            for (Document doc : globalConfigs) {
                mergedMap.put(doc.getString("fieldName"), doc);
            }
            for (Document doc : customerConfigs) {
                mergedMap.put(doc.getString("fieldName"), doc);
            }
            return ResponseEntity.ok(new ArrayList<>(mergedMap.values()));
        }

        return ResponseEntity.ok(globalConfigs);
    }

    @PostMapping
    public ResponseEntity<FieldConfig> updateConfig(@RequestBody FieldConfig config, HttpServletRequest request) {
        String userRole = (String) request.getAttribute("userRole");
        if (!"ADMIN".equals(userRole)) {
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
        if (!"ADMIN".equals(userRole)) {
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
        updateFields.put("type", "customer");
        updateFields.put("customerNumber", customerNumber);

        Document updateDoc = new Document("$set", updateFields);

        collection.updateOne(
                Filters.and(Filters.eq("fieldName", config.getFieldName()), Filters.eq("type", "customer"), Filters.eq("customerNumber", customerNumber)),
                updateDoc,
                new UpdateOptions().upsert(true));

        return ResponseEntity.ok(config);
    }
}
