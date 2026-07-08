package com.mygutachter.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import com.mygutachter.model.Order;
import com.mygutachter.model.OrderMode;
import com.mygutachter.model.OrderSource;
import com.mygutachter.service.OrderService;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Video-Expert order API (T7.8). Backs the faithfully-ported VideoExpert dashboard
 * ({@code MainLayout} → {@code DashboardPage} → {@code OrderCard}/{@code OrderDetailsPanel}),
 * shaping the SAME unified {@code orders} collection into the video frontend's {@code Order}
 * DTO. No second data store — the OMT-import {@code Order} fields map ~1:1 to the video shape;
 * only {@code numberOfPhotos} is computed (from {@code meetingData}).
 *
 * <p>Shares the {@code /api/orders} base path with {@link OrderController} (disjoint sub-paths,
 * as three controllers already share {@code /api/auth}). Per-user scoping mirrors
 * {@code ReportController.canViewAllOrders}: a non-admin without the all-orders permission sees
 * and mutates only orders where {@code userEmail == caller}. The dashboard is VIDEO_EXPERT-scoped
 * (Decision D-T7.8): {@code modes} contains VIDEO_EXPERT, or legacy docs with no {@code modes}.
 */
@RestController
@RequestMapping("/api/orders")
public class VideoOrderController {

    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final List<String> ALLOWED_STATUS = List.of("PENDING", "DONE", "CANCEL", "ARCHIVE");

    private final MongoCollection<Document> collection;
    private final MongoCollection<Document> usersCollection;
    private final MongoCollection<Document> rateConfigCollection;
    private final OrderService orderService;

    public VideoOrderController(MongoDatabase database,
            OrderService orderService,
            @Value("${mongodb.collections.orders}") String collectionName,
            @Value("${mongodb.collections.users}") String usersCollName,
            @Value("${mongodb.collections.rateConfig}") String rateConfigCollName) {
        this.collection = database.getCollection(collectionName);
        this.usersCollection = database.getCollection(usersCollName);
        this.rateConfigCollection = database.getCollection(rateConfigCollName);
        this.orderService = orderService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dashboard list — GET /api/orders/dashboard?search=&showArchive=
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false, defaultValue = "false") boolean showArchive,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        String userRole = (String) request.getAttribute("userRole");

        Document filter = new Document("$and", baseVideoFilter(userEmail, userRole, showArchive, search));

        long totalElements = collection.countDocuments(filter);

        List<Document> docs = new ArrayList<>();
        collection.find(filter).sort(new Document("_id", -1)).into(docs);

        List<Map<String, Object>> content = new ArrayList<>();
        for (Document d : docs) {
            content.add(toVideoOrderDto(d));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", content);
        response.put("totalElements", totalElements);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Paginated records table — GET /api/orders/all-records (AllScanRecordsPage)
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/all-records")
    public ResponseEntity<Map<String, Object>> allRecords(
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size,
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false, defaultValue = "") String startDate,
            @RequestParam(required = false, defaultValue = "") String endDate,
            @RequestParam(required = false, defaultValue = "") String userId,
            @RequestParam(required = false, defaultValue = "false") boolean showArchive,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        String userRole = (String) request.getAttribute("userRole");

        List<Document> filter = baseVideoFilter(userEmail, userRole, showArchive, search);

        // Optional explicit expert filter (userId == the expert's email in our model).
        if (userId != null && !userId.isBlank()) {
            filter.add(new Document("userEmail", userId));
        }
        // Created-date range (createdAt is stored ISO_LOCAL_DATE_TIME; lexicographic compare works).
        if (startDate != null && !startDate.isBlank()) {
            filter.add(new Document("createdAt", new Document("$gte", startDate)));
        }
        if (endDate != null && !endDate.isBlank()) {
            filter.add(new Document("createdAt", new Document("$lte", endDate + "T23:59:59")));
        }

        Document query = new Document("$and", filter);
        long totalElements = collection.countDocuments(query);
        int safeSize = Math.max(1, size);
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);

        List<Document> docs = new ArrayList<>();
        collection.find(query)
                .sort(new Document("_id", -1))
                .skip(Math.max(0, page) * safeSize)
                .limit(safeSize)
                .into(docs);

        List<Map<String, Object>> content = new ArrayList<>();
        for (Document d : docs) {
            content.add(toVideoOrderDto(d));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", content);
        response.put("totalElements", totalElements);
        response.put("totalPages", totalPages);
        return ResponseEntity.ok(response);
    }

    /** Distinct experts that own the caller-visible video orders (AllScanRecordsPage filter). */
    @GetMapping("/experts")
    public ResponseEntity<List<Map<String, Object>>> experts(HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        String userRole = (String) request.getAttribute("userRole");

        Document query = new Document("$and", baseVideoFilter(userEmail, userRole, true, ""));
        List<Document> docs = new ArrayList<>();
        collection.find(query).into(docs);

        Map<String, Map<String, Object>> byEmail = new LinkedHashMap<>();
        for (Document d : docs) {
            String email = d.getString("userEmail");
            if (email == null || email.isBlank() || byEmail.containsKey(email)) {
                continue;
            }
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("id", email);
            e.put("email", email);
            e.put("fullName", firstNonNull(d.getString("vehicleExpertName"), email));
            byEmail.put(email, e);
        }
        return ResponseEntity.ok(new ArrayList<>(byEmail.values()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Create a manual order — POST /api/orders  (CreateOrderModal)
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody Order body, HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        try {
            // A manual order created from the video app: MANUAL source, VIDEO_EXPERT mode,
            // assigned to the creator. importOrder unions the mode into `modes` and stamps
            // timestamps / default PENDING status.
            body.setSource(OrderSource.MANUAL.name());
            body.setMode(OrderMode.VIDEO_EXPERT.name());
            if (userEmail != null) {
                body.setUserEmail(userEmail);
            }
            Document saved = orderService.importOrder(body);
            return ResponseEntity.ok(toVideoOrderDto(saved));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Update lifecycle status — PATCH /api/orders/{id}/status
    // Body is a BARE JSON string ("DONE"/"PENDING") — the video DashboardPage sends
    // JSON.stringify(status), NOT { status }. Accept both quoted and unquoted.
    // ─────────────────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id,
            @RequestBody(required = false) String rawStatus,
            HttpServletRequest request) {
        String status = normalizeStatus(rawStatus);
        if (status == null || !ALLOWED_STATUS.contains(status)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status"));
        }

        Document order = findScoped(id, request);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        collection.updateOne(Filters.eq("caseNumber", id),
                Updates.combine(
                        Updates.set("orderStatus", status),
                        Updates.set("updatedAt", LocalDateTime.now().format(TS))));
        return ResponseEntity.ok(Map.of("status", status));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Single order + its screenshots — GET /api/orders/{id}, /{id}/parts, /{id}/images
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable String id, HttpServletRequest request) {
        Document order = findScoped(id, request);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toVideoOrderDto(order));
    }

    @GetMapping("/{id}/parts")
    public ResponseEntity<List<String>> getOrderParts(@PathVariable String id, HttpServletRequest request) {
        if (findScoped(id, request) == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(orderService.getOrderPartKeys(id));
    }

    /**
     * The order's {@code meetingData} map (db-key → S3 key or legacy base64). The frontend
     * {@code OrderDetailsPanel.getImageUrl} turns a {@code screenshots/…} value into a serve
     * URL {@code /api/screenshots/{id}/{dbKey}}; base64 values render directly.
     */
    @GetMapping("/{id}/images")
    public ResponseEntity<Map<String, String>> getOrderImages(@PathVariable String id, HttpServletRequest request) {
        if (findScoped(id, request) == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(orderService.getOrderImages(id));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Resolve an order by caseNumber, enforcing per-user scoping; null if missing/forbidden. */
    private Document findScoped(String caseNumber, HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        String userRole = (String) request.getAttribute("userRole");
        Document order = orderService.findByCaseNumber(caseNumber);
        if (order == null) {
            return null;
        }
        if (!canViewAllOrders(userEmail, userRole)) {
            String owner = order.getString("userEmail");
            if (owner == null || !owner.equalsIgnoreCase(userEmail)) {
                return null;
            }
        }
        return order;
    }

    /**
     * The shared video-order query: per-user scoping (unless privileged), VIDEO_EXPERT mode
     * (+ legacy no-modes), archive toggle, and free-text search. Returns a mutable list of
     * {@code $and} clauses callers can extend (date range / explicit expert).
     */
    private List<Document> baseVideoFilter(String userEmail, String userRole, boolean showArchive, String search) {
        List<Document> and = new ArrayList<>();

        if (!canViewAllOrders(userEmail, userRole)) {
            and.add(new Document("userEmail", userEmail));
        }

        and.add(new Document("$or", List.of(
                new Document("modes", OrderMode.VIDEO_EXPERT.name()),
                new Document("modes", new Document("$exists", false)),
                new Document("modes", new Document("$size", 0)))));

        if (!showArchive) {
            and.add(new Document("orderStatus", new Document("$ne", "ARCHIVE")));
        }

        String q = search == null ? "" : search.trim();
        if (!q.isEmpty()) {
            String rx = Pattern.quote(q);
            and.add(new Document("$or", List.of(
                    regex("dispatchOrOrderNo", rx),
                    regex("licensePlateNumber", rx),
                    regex("licensePlate", rx),
                    regex("contactPersonName", rx),
                    regex("vehicleExpertName", rx),
                    regex("vinNumber", rx))));
        }
        return and;
    }

    private static Document regex(String field, String quotedPattern) {
        return new Document(field, new Document("$regex", quotedPattern).append("$options", "i"));
    }

    private static String normalizeStatus(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.trim();
        // Strip a surrounding pair of JSON quotes if present ("DONE" → DONE).
        if (s.length() >= 2 && s.startsWith("\"") && s.endsWith("\"")) {
            s = s.substring(1, s.length() - 1);
        }
        s = s.trim();
        return s.isEmpty() ? null : s.toUpperCase();
    }

    /** Map a unified order document into the video frontend's {@code Order} DTO shape. */
    private Map<String, Object> toVideoOrderDto(Document d) {
        Map<String, Object> o = new LinkedHashMap<>();
        String id = firstNonNull(d.getString("caseNumber"), d.getString("omtOrderId"));
        o.put("id", id);
        o.put("dispatchOrOrderNo", d.getString("dispatchOrOrderNo"));
        o.put("status", d.getString("orderStatus"));
        o.put("source", d.getString("source"));
        o.put("claimType", d.getString("claimType"));
        o.put("repairerName", d.getString("repairerName"));
        o.put("contactPersonName", d.getString("contactPersonName"));
        o.put("contactPersonMobile", d.getString("contactPersonMobile"));
        o.put("contactPersonEmail", d.getString("contactPersonEmail"));
        o.put("vehicleExpertName", d.getString("vehicleExpertName"));
        o.put("vehicleMake", d.getString("vehicleMake"));
        o.put("vehicleModel", d.getString("vehicleModel"));
        // Report edits may set `licensePlate`/`vin`; the OMT import uses `licensePlateNumber`/`vinNumber`.
        o.put("licensePlateNumber", firstNonNull(d.getString("licensePlateNumber"), d.getString("licensePlate")));
        o.put("vinNumber", firstNonNull(d.getString("vinNumber"), d.getString("vin")));
        o.put("registrationNumber", d.getString("registrationNumber"));
        o.put("mileage", d.get("mileage"));
        o.put("lastVehicleInspectionDate", d.getString("lastVehicleInspectionDate"));
        o.put("additionalUserIds", d.get("additionalUserIds"));
        o.put("meetingData", d.get("meetingData"));
        o.put("claimType", d.getString("claimType"));
        o.put("uvvResult", d.getString("uvvResult"));
        o.put("uvvInspectionDate", d.getString("uvvInspectionDate"));
        o.put("uvvCertificateAvailable", d.getBoolean("uvvCertificateAvailable", false));

        // All-records table columns.
        o.put("createdDate", firstNonNull(d.getString("createdAt")));
        o.put("updatedDate", firstNonNull(d.getString("updatedAt")));
        o.put("location", firstNonNull(d.getString("inspectionLocation")));

        // numberOfPhotos: no scalar count is stored — derive from the screenshot map size.
        Object meetingData = d.get("meetingData");
        int photoCount = meetingData instanceof Map ? ((Map<?, ?>) meetingData).size() : 0;
        o.put("numberOfPhotos", photoCount);
        return o;
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... vals) {
        for (T v : vals) {
            if (v != null) {
                return v;
            }
        }
        return null;
    }

    /** Mirror of {@code ReportController.canViewAllOrders} (admin / user flag / role-config). */
    private boolean canViewAllOrders(String userEmail, String userRole) {
        if ("ADMIN".equals(userRole)) {
            return true;
        }
        if (userEmail != null) {
            Document userDoc = usersCollection
                    .find(Filters.regex("email", "^" + Pattern.quote(userEmail) + "$", "i")).first();
            if (userDoc != null && Boolean.TRUE.equals(userDoc.getBoolean("canViewAllOrders"))) {
                return true;
            }
        }
        Document globalConfig = rateConfigCollection.find(Filters.eq("type", "global")).first();
        if (globalConfig != null && globalConfig.containsKey("allowedRolesToViewAllOrders")) {
            List<?> allowedRoles = globalConfig.getList("allowedRolesToViewAllOrders", String.class);
            if (allowedRoles != null && allowedRoles.contains(userRole)) {
                return true;
            }
        }
        return false;
    }
}
