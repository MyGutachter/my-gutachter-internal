package com.mygutachter.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mygutachter.model.ActivityLog;
import com.mygutachter.model.ReportDTO;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Iterator;
import java.util.Map;

@Service
public class ActivityLogService {

    private final MongoCollection<Document> collection;
    private final ObjectMapper objectMapper;

    @Autowired
    public ActivityLogService(MongoDatabase database,
            ObjectMapper objectMapper,
            @Value("${mongodb.collections.activity_logs:activity_logs}") String collectionName) {
        this.collection = database.getCollection(collectionName);
        this.objectMapper = objectMapper;
    }

    @Async
    public void logActivity(ActivityLog log) {
        Document doc = objectMapper.convertValue(log, Document.class);
        collection.insertOne(doc);
    }

    @Async
    public void logChange(String orderId, String userId, String userName, String category, String action,
            String additionalInfo) {
        ActivityLog log = new ActivityLog();
        log.setOrderId(orderId);
        log.setUserId(userId);
        log.setUserName(userName);
        log.setCategory(category);
        log.setAction(action);
        log.setAdditionalInfo(additionalInfo);
        logActivity(log);
    }

    @Async
    public void compareAndLog(ReportDTO oldReport, ReportDTO newReport, String userId, String userName) {
        if (oldReport == null || newReport == null)
            return;

        JsonNode oldNode = objectMapper.valueToTree(oldReport);
        JsonNode newNode = objectMapper.valueToTree(newReport);

        compareNodes(oldNode, newNode, "", oldReport.getCaseNumber(), userId, userName);
    }

    private void compareNodes(JsonNode oldNode, JsonNode newNode, String prefix, String orderId, String userId,
            String userName) {
        Iterator<Map.Entry<String, JsonNode>> fields = newNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            String fieldName = entry.getKey();
            JsonNode newValue = entry.getValue();
            JsonNode oldValue = oldNode.get(fieldName);

            if (oldValue == null || !oldValue.equals(newValue)) {
                String fullFieldName = prefix + fieldName;
                String category = determineCategory(fullFieldName);

                if (newValue.isObject()) {
                    compareNodes(oldValue != null && oldValue.isObject() ? oldValue : objectMapper.createObjectNode(),
                            newValue, fullFieldName + ".", orderId, userId, userName);
                } else if (newValue.isArray()) {
                    // For arrays, we log a general update for now
                    logActivity(orderId, userId, userName, category, "Array Updated", fullFieldName,
                            "Modified", "Modified", null);
                } else {
                    // Log primitive change
                    logActivity(orderId, userId, userName, category, "Field Updated", fullFieldName,
                            oldValue != null ? oldValue.asText() : "N/A", newValue.asText(), null);
                }
            }
        }
    }

    private String determineCategory(String fieldName) {
        if (fieldName.contains("vehicleCategory") ||
                fieldName.contains("audatexHaupttyp")) {
            return "Calculation";
        }
        if (fieldName.contains("customerEmail")) {
            return "Shipping";
        }
        return "Update";
    }

    private void logActivity(String orderId, String userId, String userName, String category, String action,
            String fieldName, String oldValue, String newValue, String additionalInfo) {
        ActivityLog log = new ActivityLog();
        log.setOrderId(orderId);
        log.setUserId(userId);
        log.setUserName(userName);
        log.setCategory(category);
        log.setAction(action);
        log.setFieldName(fieldName);
        log.setOldValue(oldValue);
        log.setNewValue(newValue);
        log.setAdditionalInfo(additionalInfo);
        logActivity(log);
    }
}
// 2
// 43
// 654
