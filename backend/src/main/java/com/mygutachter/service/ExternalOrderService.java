package com.mygutachter.service;

import java.util.HashMap;
import java.util.Map;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;

/**
 * OMT integration — <b>outbound only</b>. The inbound order <i>pull</i> (formerly
 * {@code fetchAndMapOrderData} against OMT {@code Order/GetReportData}) was removed in T3.1:
 * OMT now <b>pushes</b> every order to {@code POST /api/orders/import} and the app never pulls
 * orders (Decision Q5).
 *
 * <p>What remains here:
 * <ul>
 *   <li><b>Reference-data lookups</b> — {@link #fetchClaimTypes} / {@link #fetchCustomerContacts}
 *       populate the report wizard's dropdowns. These are outbound reads of OMT master data, not
 *       order pulls, so they are retained; they require the user's OMT {@code externalToken}.</li>
 *   <li><b>Report sync-back</b> — {@link #updateOrderStatus} / {@link #uploadReportToOmt} push the
 *       finalized report/status back to OMT once an expert completes an order.</li>
 * </ul>
 */
@Service
public class ExternalOrderService {

    private final RestTemplate restTemplate;
    private final MongoCollection<Document> collection;
    private final ObjectMapper objectMapper;
    private final String externalApiUrl;

    @Autowired
    public ExternalOrderService(RestTemplate restTemplate,
            MongoDatabase database,
            ObjectMapper objectMapper,
            @Value("${mongodb.collections.orders}") String collectionName,
            @Value("${external.api.url:http://localhost:44311}") String externalApiUrl) {
        this.restTemplate = restTemplate;
        this.collection = database.getCollection(collectionName);
        this.objectMapper = objectMapper;
        this.externalApiUrl = externalApiUrl;
    }

    public JsonNode fetchClaimTypes(String token) throws Exception {
        // Use the correct OMT endpoint for Claim Types
        // The base URL ends in /Order/GetReportData, so we replace that part
        String url = externalApiUrl.replace("Order/GetReportData", "ClaimType/GetAll");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.set("Content-Type", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new Exception("Failed to fetch claim types from external API: " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        if (!root.has("success") || !root.get("success").asBoolean() || !root.has("result")
                || root.get("result").isNull()) {
            throw new Exception("External API returned failure or missing result object for claim types");
        }

        JsonNode result = root.get("result");
        // ABP PagedResultDto contains 'items' array and 'totalCount'
        if (result.has("items") && result.get("items").isArray()) {
            return result.get("items");
        }

        return result;
    }

    public JsonNode fetchCustomerContacts(String token) throws Exception {
        // OMT endpoint for Customer Contacts (ABP framework)
        String url = externalApiUrl.replace("Order/GetReportData", "BasicInformation/GetAllLite?limit=200&hasVehicleReportOrders=true");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.set("Content-Type", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new Exception("Failed to fetch customer contacts from external API: " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        if (!root.has("success") || !root.get("success").asBoolean() || !root.has("result")
                || root.get("result").isNull()) {
            throw new Exception("External API returned failure or missing result object for customer contacts");
        }

        JsonNode result = root.get("result");
        if (result.has("items") && result.get("items").isArray()) {
            return result.get("items");
        }

        return result;
    }

    public void updateOrderStatus(String caseId, String customerNumber, String contractNumber, String vin, String token)
            throws Exception {
        Document report = collection.find(Filters.eq("caseNumber", caseId)).first();
        if (report == null || !report.containsKey("omtOrderId")) {
            System.out.println("Skipping OMT status update for case " + caseId + " - omtOrderId not found.");
            return;
        }
        String omtOrderId = report.getString("omtOrderId");

        // Proper OMT API: services/app/Order/Update (PUT)
        // We set the state to 10 (DNRX_Done) to mark it as completed
        String url = externalApiUrl.replace("Order/GetReportData", "Order/Update");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.set("Content-Type", "application/json");

        Map<String, Object> body = new HashMap<>();
        body.put("id", omtOrderId);
        body.put("state", 10); // State.DNRX_Done
        if (customerNumber != null && !customerNumber.trim().isEmpty()) {
            body.put("customerNo", customerNumber);
        }
        if (contractNumber != null && !contractNumber.trim().isEmpty()) {
            body.put("contractNumber", contractNumber);
        }
        if (vin != null && !vin.trim().isEmpty()) {
            body.put("vin", vin.trim());
        }

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new Exception("OMT Sync failed with status: " + response.getStatusCode());
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            if (root.has("success") && !root.get("success").asBoolean()) {
                String errorMsg = "Unknown OMT error";
                if (root.has("error") && !root.get("error").isNull()) {
                    errorMsg = root.get("error").get("message").asText();
                }
                throw new Exception("OMT Sync returned failure: " + errorMsg);
            }
        } catch (Exception e) {
            System.err.println("Failed to sync status to OMT for case " + caseId + ": " + e.getMessage());
            throw e;
        }
    }

    public void uploadReportToOmt(String caseId, byte[] pdfData, String fileName, String token) throws Exception {
        Document report = collection.find(Filters.eq("caseNumber", caseId)).first();
        if (report == null || !report.containsKey("omtOrderId")) {
            System.out.println("Skipping OMT report upload for case " + caseId + " - omtOrderId not found.");
            return;
        }
        String omtOrderId = report.getString("omtOrderId");

        // Proper OMT API: services/app/Order/AddAttachment (POST Multipart)
        String url = externalApiUrl.replace("Order/GetReportData", "Order/AddAttachment");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

        org.springframework.util.MultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
        body.add("OrderId", omtOrderId);
        body.add("Notes", "Finalized Report from Vehicle Report System");

        // Use ByteArrayResource to send file data in-memory
        org.springframework.core.io.Resource resource = new org.springframework.core.io.ByteArrayResource(pdfData) {
            @Override
            public String getFilename() {
                return fileName;
            }
        };
        body.add("File", resource);

        HttpEntity<org.springframework.util.MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new Exception("OMT Report Upload failed with status: " + response.getStatusCode());
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            if (root.has("success") && !root.get("success").asBoolean()) {
                String errorMsg = "Unknown OMT error";
                if (root.has("error") && !root.get("error").isNull()) {
                    errorMsg = root.get("error").get("message").asText();
                }
                throw new Exception("OMT Report Upload returned failure: " + errorMsg);
            }
        } catch (Exception e) {
            System.err.println("Failed to upload report to OMT for case " + caseId + ": " + e.getMessage());
            throw e;
        }
    }
}
