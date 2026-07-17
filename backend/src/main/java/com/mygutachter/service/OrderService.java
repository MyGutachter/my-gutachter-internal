package com.mygutachter.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.bson.Document;
import org.bson.conversions.Bson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.UpdateOptions;
import com.mongodb.client.model.Updates;
import com.mygutachter.dto.UvvInspectionResultRequest;
import com.mygutachter.model.Order;
import com.mygutachter.model.OrderMode;
import com.mygutachter.model.OrderSource;
import com.mygutachter.model.OrderStatus;

/**
 * Persists OMT-pushed orders into the single unified {@code orders} collection (Decision Q5/Q6).
 *
 * <p>Import is an idempotent upsert deduped on {@code omtOrderId} (falling back to
 * {@code dispatchOrOrderNo}). The document is stored flat — the {@link Order} POJO's typed
 * fields plus its {@code @JsonAnyGetter} passthrough flatten to top-level keys, matching the
 * shape {@code ReportController} reads/writes (keyed on {@code caseNumber}/{@code userEmail}).
 */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final MongoCollection<Document> collection;
    private final ObjectMapper objectMapper;
    private final S3Service s3;
    private final OmtIntegrationService omtIntegrationService;
    private final UvvCertificateGenerator uvvCertificateGenerator;

    public OrderService(MongoDatabase database,
            ObjectMapper objectMapper,
            S3Service s3,
            OmtIntegrationService omtIntegrationService,
            UvvCertificateGenerator uvvCertificateGenerator,
            @Value("${mongodb.collections.orders}") String collectionName) {
        this.collection = database.getCollection(collectionName);
        this.objectMapper = objectMapper;
        this.s3 = s3;
        this.omtIntegrationService = omtIntegrationService;
        this.uvvCertificateGenerator = uvvCertificateGenerator;
    }

    private static final List<String> DEFAULT_BODY_PARTS = java.util.Arrays.asList(
        "bumper_front", "hood", "windshield",
        "fender_front_left", "door_front_left", "door_rear_left", "quarter_panel_left", "sill_left", "roof_frame_left",
        "fender_front_right", "door_front_right", "door_rear_right", "quarter_panel_right", "sill_right", "roof_frame_right",
        "roof", "tailgate", "bumper_rear",
        "headlight_left", "headlight_right", "rear_light_left", "rear_light_right"
    );

    private static String normalizeDate(String value) {
        if (value == null || value.trim().isEmpty())
            return value;
        String trimmed = value.trim();
        if (trimmed.matches("^\\d{4}-\\d{2}-\\d{2}$"))
            return trimmed;
        if (trimmed.contains("T")) {
            return trimmed;
        }
        try {
            java.time.OffsetDateTime odt = java.time.OffsetDateTime.parse(trimmed);
            return odt.toLocalDate().toString();
        } catch (java.time.format.DateTimeParseException ignored) {
        }
        try {
            java.time.LocalDate ld = java.time.LocalDate.parse(trimmed);
            return ld.toString();
        } catch (java.time.format.DateTimeParseException ignored) {
        }
        return trimmed;
    }

    private static String normalizeTime(String value) {
        if (value == null || value.trim().isEmpty())
            return value;
        String trimmed = value.trim();
        if (trimmed.matches("^\\d{2}:\\d{2}$"))
            return trimmed;
        if (trimmed.matches("^\\d{1,2}:\\d{2}(:\\d{2}(\\.\\d+)?)?$")) {
            try {
                java.time.LocalTime lt = java.time.LocalTime.parse(trimmed);
                return lt.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
            } catch (java.time.format.DateTimeParseException ignored) {
            }
        }
        return trimmed;
    }

    /**
     * Upsert an inbound (OMT-pushed) order. Dedups on {@code omtOrderId} (or
     * {@code dispatchOrOrderNo}); re-importing the same order updates it in place, no duplicate.
     *
     * @return the stored order document (without Mongo's {@code _id})
     * @throws IllegalArgumentException if neither dedup key is present
     */
    public Document importOrder(Order order) {
        String omtOrderId = trimToNull(order.getOmtOrderId());
        String dispatchNo = trimToNull(order.getDispatchOrOrderNo());
        if (omtOrderId == null && dispatchNo == null) {
            throw new IllegalArgumentException("Order must include omtOrderId or dispatchOrOrderNo");
        }

        // caseNumber == the OMT order id by convention, so the expert's report doc
        // (keyed by {userEmail, caseNumber}) resolves to this same document.
        if (order.getCaseNumber() == null) {
            order.setCaseNumber(omtOrderId != null ? omtOrderId : dispatchNo);
        }
        if (order.getSource() == null) {
            order.setSource(OrderSource.MANUAL.name());
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> asMap = objectMapper.convertValue(order, Map.class);

        Document setFields = new Document();
        for (Map.Entry<String, Object> e : asMap.entrySet()) {
            if (e.getValue() != null) {
                setFields.put(e.getKey(), e.getValue());
            }
        }

        // `modes` is a unioned set managed via $addToSet below; never $set it (that would
        // clobber the other app's mode on a re-import). `mode` is only the singular import
        // hint — don't persist it as a stray field.
        setFields.remove("mode");
        setFields.remove("modes");

        // Normalize date/time fields if present
        if (setFields.containsKey("orderDate")) {
            setFields.put("orderDate", normalizeDate((String) setFields.get("orderDate")));
        }
        if (setFields.containsKey("inspectionDate")) {
            setFields.put("inspectionDate", normalizeDate((String) setFields.get("inspectionDate")));
        }
        if (setFields.containsKey("inspectionTime")) {
            String timeVal = (String) setFields.get("inspectionTime");
            if (timeVal != null && timeVal.contains("T")) {
                setFields.put("inspectionTime", timeVal);
            } else {
                setFields.put("inspectionTime", normalizeTime(timeVal));
            }
        }
        if (setFields.containsKey("valuationDate")) {
            setFields.put("valuationDate", normalizeDate((String) setFields.get("valuationDate")));
        }

        String now = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        setFields.put("updatedAt", now);

        // orderStatus: OMT value is authoritative when present; otherwise default PENDING
        // only on first insert (never clobber an existing status on re-import).
        Document onInsert = new Document("createdAt", now);
        setFields.remove("orderStatus");
        if (order.getOrderStatus() != null) {
            setFields.put("orderStatus", order.getOrderStatus());
        } else {
            onInsert.append("orderStatus", "PENDING");
        }

        Bson filter = omtOrderId != null
                ? Filters.eq("omtOrderId", omtOrderId)
                : Filters.eq("dispatchOrOrderNo", dispatchNo);

        Document existingOrder = collection.find(filter).first();

        // Initialize collections if they don't exist in existingOrder
        if (existingOrder == null || !existingOrder.containsKey("minderwertRows") ||
            !(existingOrder.get("minderwertRows") instanceof java.util.List) ||
            ((java.util.List<?>) existingOrder.get("minderwertRows")).isEmpty()) {

            java.util.List<Document> defaultMinderwertRows = new java.util.ArrayList<>();
            for (String partId : DEFAULT_BODY_PARTS) {
                Document row = new Document()
                        .append("id", partId)
                        .append("bodyPart", partId)
                        .append("damage", "")
                        .append("repairMethod", "")
                        .append("repairCost", 0.0)
                        .append("presetType", 1)
                        .append("isCustom", false)
                        .append("repairCodeIndex", 0)
                        .append("images", new java.util.ArrayList<String>())
                        .append("reparaturweg", "Karosserie")
                        .append("spareParts", 0.0)
                        .append("anrechnung", "kein")
                        .append("repairType", "")
                        .append("minderwertBrutto", 0.0)
                        .append("minderwertNetto", 0.0);
                defaultMinderwertRows.add(row);
            }
            setFields.put("minderwertRows", defaultMinderwertRows);
        }

        if (existingOrder == null || !existingOrder.containsKey("mileageImages")) {
            setFields.put("mileageImages", new java.util.ArrayList<String>());
        }
        if (existingOrder == null || !existingOrder.containsKey("identificationImages")) {
            setFields.put("identificationImages", new java.util.ArrayList<String>());
        }
        if (existingOrder == null || !existingOrder.containsKey("photos")) {
            setFields.put("photos", new java.util.ArrayList<Document>());
        }
        if (existingOrder == null || !existingOrder.containsKey("damages")) {
            setFields.put("damages", new java.util.ArrayList<Document>());
        }

        Document update = new Document("$set", setFields).append("$setOnInsert", onInsert);

        // Union the app mode into `modes` (VIDEO_EXPERT / VEHICLE_REPORT). Importing the same
        // order into the second app adds its mode without removing the first (Decision Q2).
        String mode = trimToNull(order.getMode());
        if (mode != null && OrderMode.isValid(mode)) {
            update.append("$addToSet", new Document("modes", mode));
        }

        collection.updateOne(filter, update, new UpdateOptions().upsert(true));

        Document saved = collection.find(filter).first();
        if (saved != null) {
            saved.remove("_id");
        }
        return saved;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Video-mode helpers (T4.1). Orders are keyed by the shared cross-mode id
    // `caseNumber` (== omtOrderId), so screenshots/recordings captured in the video
    // call land on the SAME order document the report mode reads (the KAN-25 win).
    // `meetingId` passed by the video controllers == the order's caseNumber.
    // ─────────────────────────────────────────────────────────────────────────

    /** The order document for a case number, or null if none exists. */
    public Document findByCaseNumber(String caseNumber) {
        if (caseNumber == null) {
            return null;
        }
        return collection.find(Filters.eq("caseNumber", caseNumber)).first();
    }

    /**
     * Check if an order exists by its OMT ID, and if so, ensures its modes list
     * contains the resolved app mode.
     */
    public boolean existsAndEnsureMode(String orderId, String app) {
        if (orderId == null || orderId.isEmpty()) {
            return false;
        }
        Bson filter = Filters.or(
            Filters.eq("omtOrderId", orderId),
            Filters.eq("dispatchOrOrderNo", orderId),
            Filters.eq("caseNumber", orderId)
        );
        Document order = collection.find(filter).first();
        if (order == null) {
            return false;
        }
        String appMode = null;
        if ("video".equalsIgnoreCase(app)) {
            appMode = OrderMode.VIDEO_EXPERT.name();
        } else if ("report".equalsIgnoreCase(app)) {
            appMode = OrderMode.VEHICLE_REPORT.name();
        }
        if (appMode != null) {
            collection.updateOne(filter, Updates.addToSet("modes", appMode));
        }
        return true;
    }

    /** All screenshot db-keys (the {@code meetingData} map keys) for an order. */
    public List<String> getOrderPartKeys(String caseNumber) {
        return new ArrayList<>(getOrderImages(caseNumber).keySet());
    }

    /** The whole {@code meetingData} map (db-key → S3 key or legacy base64) for an order. */
    @SuppressWarnings("unchecked")
    public Map<String, String> getOrderImages(String caseNumber) {
        Document order = findByCaseNumber(caseNumber);
        if (order == null) {
            return Collections.emptyMap();
        }
        Object meetingData = order.get("meetingData");
        if (meetingData instanceof Map) {
            return new LinkedHashMap<>((Map<String, String>) meetingData);
        }
        return Collections.emptyMap();
    }

    /** Store a screenshot reference under {@code meetingData.<dbKey>}. Automatically map to report fields. */
    public void addMeetingImage(String caseNumber, String dbKey, String value) {
        Document doc = collection.find(Filters.eq("caseNumber", caseNumber)).first();
        if (doc == null) return;

        Document meetingData = doc.get("meetingData", Document.class);
        if (meetingData == null) {
            meetingData = new Document();
        }
        meetingData.put(dbKey, value);
        doc.put("meetingData", meetingData);

        mapScreenshotToReport(doc, caseNumber, dbKey, value);

        collection.replaceOne(Filters.eq("caseNumber", caseNumber), doc);
    }

    /** Remove a screenshot reference from {@code meetingData}. Automatically remove from report fields. */
    public void removeMeetingImage(String caseNumber, String dbKey) {
        Document doc = collection.find(Filters.eq("caseNumber", caseNumber)).first();
        if (doc == null) return;

        Document meetingData = doc.get("meetingData", Document.class);
        if (meetingData != null) {
            meetingData.remove(dbKey);
            doc.put("meetingData", meetingData);
        }

        removeScreenshotFromReport(doc, dbKey);

        collection.replaceOne(Filters.eq("caseNumber", caseNumber), doc);
    }

    private void mapScreenshotToReport(Document doc, String caseNumber, String dbKey, String s3Key) {
        String cleanPartId = dbKey;
        int lastUnderscore = dbKey.lastIndexOf('_');
        if (lastUnderscore != -1) {
            cleanPartId = dbKey.substring(0, lastUnderscore);
        }

        String url = "/api/screenshots/" + caseNumber + "/" + dbKey;
        String filename = dbKey + ".png";

        List<String> videoExpertImages = doc.getList("videoExpertImages", String.class);
        if (videoExpertImages == null) {
            videoExpertImages = new ArrayList<>();
        }
        if (!videoExpertImages.contains(url)) {
            videoExpertImages.add(url);
            doc.put("videoExpertImages", videoExpertImages);
        }

        switch (cleanPartId) {
            case "vin_number":
            case "vin_photo":
            case "identificationImages":
                addToUniqueList(doc, "identificationImages", url);
                addMandatoryPhoto(doc, "vin_photo", "Fahrzeug-Ident.-Nr. / Typschild", url, filename);
                break;

            case "Meter_reading":
            case "mileage_photo":
            case "mileageImages":
                addToUniqueList(doc, "mileageImages", url);
                addMandatoryPhoto(doc, "mileage_photo", "Kilometerstand / Tacho", url, filename);
                break;

            case "next_hu":
            case "nextHUImages":
                addToUniqueList(doc, "nextHUImages", url);
                break;

            case "keys_photo":
            case "keysImages":
                addToUniqueList(doc, "keysImages", url);
                break;

            case "docRegistration":
            case "vehicle_registration_document":
            case "fzScheinImages":
                addToUniqueList(doc, "fzScheinImages", url);
                break;

            case "docServiceBook":
            case "serviceheftImages":
                addToUniqueList(doc, "serviceheftImages", url);
                break;

            case "docManual":
            case "bordliteraturImages":
                addToUniqueList(doc, "bordliteraturImages", url);
                break;

            case "docBadge":
            case "environmentalBadgeImages":
                addToUniqueList(doc, "environmentalBadgeImages", url);
                break;

            case "maintenance_images":
            case "maintenanceImages":
                addToUniqueList(doc, "maintenanceImages", url);
                break;

            case "breakdown_kit":
                updateEquipmentImage(doc, "breakdownKit", url);
                break;

            case "first_aid_kit":
                updateEquipmentImage(doc, "firstAidKit", url);
                break;

            case "warning_triangle":
                updateEquipmentImage(doc, "warningTriangle", url);
                break;

            case "safety_vest":
                updateEquipmentImage(doc, "safetyVest", url);
                break;

            case "spare_tire":
                updateEquipmentImage(doc, "spareTire", url);
                break;

            case "EV_charging_cover":
            case "chargingCableImages":
                addToUniqueList(doc, "chargingCableImages", url);
                break;

            case "front_left_wheel":
                updateTireImage(doc, 0, url);
                break;

            case "front_right_wheel":
                updateTireImage(doc, 1, url);
                break;

            case "rear_right_wheel":
                updateTireImage(doc, 2, url);
                break;

            case "rear_left_wheel":
                updateTireImage(doc, 3, url);
                break;

            case "Overview_diagonal_front_left":
                addMandatoryPhoto(doc, "diag_fl", "Übersicht diagonal vorne links", url, filename);
                break;

            case "Overview_diagonal_front_right":
                addMandatoryPhoto(doc, "diag_fr", "Übersicht diagonal vorne rechts", url, filename);
                break;

            case "Overview_diagonal_rear_left":
                addMandatoryPhoto(doc, "diag_rl", "Übersicht diagonal hinten links", url, filename);
                break;

            case "Overview_diagonal_rear_right":
                addMandatoryPhoto(doc, "diag_rr", "Übersicht diagonal hinten rechts", url, filename);
                break;

            case "left_sill":
                addMandatoryPhoto(doc, "sill_left", "Schweller links", url, filename);
                break;

            case "Right_sill":
                addMandatoryPhoto(doc, "sill_right", "Schweller rechts", url, filename);
                break;

            default:
                String label = cleanPartId.replace("_", " ");
                addAdditionalPhoto(doc, label, url, filename);
                break;
        }

        associateScreenshotWithMinderwertRow(doc, cleanPartId, url);
    }

    private void addToUniqueList(Document doc, String fieldName, String url) {
        List<String> list = doc.getList(fieldName, String.class);
        if (list == null) {
            list = new ArrayList<>();
        }
        if (!list.contains(url)) {
            list.add(url);
            doc.put(fieldName, list);
        }
    }

    @SuppressWarnings("unchecked")
    private void addMandatoryPhoto(Document doc, String mandatoryPhotoId, String label, String url, String filename) {
        List<Document> photos = (List<Document>) doc.get("photos");
        if (photos == null) {
            photos = new ArrayList<>();
        }

        int foundIndex = -1;
        for (int i = 0; i < photos.size(); i++) {
            Document p = photos.get(i);
            if (mandatoryPhotoId.equals(p.getString("mandatoryPhotoId"))) {
                foundIndex = i;
                break;
            }
        }

        Document photoObj = new Document()
            .append("id", "vx_" + filename.replaceAll("\\.[^/.]+$", ""))
            .append("data", url)
            .append("label", label)
            .append("fileName", filename)
            .append("mandatoryPhotoId", mandatoryPhotoId)
            .append("isExternal", true)
            .append("fromVideoExpert", true);

        if (foundIndex >= 0) {
            Document existing = photos.get(foundIndex);
            if (existing.getString("data") == null || existing.getString("data").isEmpty()) {
                photos.set(foundIndex, photoObj);
            }
        } else {
            photos.add(photoObj);
        }
        doc.put("photos", photos);
    }

    @SuppressWarnings("unchecked")
    private void addAdditionalPhoto(Document doc, String label, String url, String filename) {
        List<Document> photos = (List<Document>) doc.get("photos");
        if (photos == null) {
            photos = new ArrayList<>();
        }
        for (Document p : photos) {
            if (url.equals(p.getString("data"))) {
                return;
            }
        }
        Document photoObj = new Document()
            .append("id", "vx_" + filename.replaceAll("\\.[^/.]+$", ""))
            .append("data", url)
            .append("label", label)
            .append("fileName", filename)
            .append("isExternal", true)
            .append("fromVideoExpert", true);
        photos.add(photoObj);
        doc.put("photos", photos);
    }

    private void updateEquipmentImage(Document doc, String fieldName, String url) {
        Document equip = doc.get(fieldName, Document.class);
        if (equip == null) {
            equip = new Document();
        }
        List<String> images = equip.getList("images", String.class);
        if (images == null) {
            images = new ArrayList<>();
        }
        if (!images.contains(url)) {
            images.add(url);
            equip.put("images", images);
            doc.put(fieldName, equip);
        }
    }

    @SuppressWarnings("unchecked")
    private void updateTireImage(Document doc, int tireIndex, String url) {
        List<Document> tires = (List<Document>) doc.get("tires");
        if (tires == null || tires.size() < 4) {
            tires = new ArrayList<>();
            for (int i = 0; i < 4; i++) {
                Document t = new Document()
                    .append("axle", i < 2 ? 1 : 2)
                    .append("side", (i == 0 || i == 3) ? "links" : "rechts")
                    .append("designation", "")
                    .append("manufacturer", "")
                    .append("tireModel", "")
                    .append("type", "A")
                    .append("treadDepth", "")
                    .append("dotNumber", "")
                    .append("depreciationValue", 0)
                    .append("rimType", "")
                    .append("rimDamage", new ArrayList<>())
                    .append("images", new ArrayList<>())
                    .append("damaged", false);
                tires.add(t);
            }
        }
        Document tire = tires.get(tireIndex);
        List<String> images = tire.getList("images", String.class);
        if (images == null) {
            images = new ArrayList<>();
        }
        if (!images.contains(url)) {
            images.add(url);
            tire.put("images", images);
            tires.set(tireIndex, tire);
            doc.put("tires", tires);
        }
    }

    private void removeScreenshotFromReport(Document doc, String dbKey) {
        String filename = dbKey + ".png";

        removeFromUniqueLists(doc, filename);
        removeFromTires(doc, filename);
        removeFromEquipment(doc, filename);
        removeFromPhotos(doc, filename);
        removeFromVideoExpertImages(doc, filename);
        removeScreenshotFromMinderwertRows(doc, filename);
    }

    private void removeFromUniqueLists(Document doc, String filename) {
        String[] listFields = {
            "identificationImages", "mileageImages", "nextHUImages",
            "keysImages", "fzScheinImages", "serviceheftImages",
            "bordliteraturImages", "environmentalBadgeImages",
            "maintenanceImages", "chargingCableImages"
        };
        for (String field : listFields) {
            List<String> list = doc.getList(field, String.class);
            if (list != null) {
                List<String> updated = new ArrayList<>();
                for (String val : list) {
                    if (!val.contains(filename)) {
                        updated.add(val);
                    }
                }
                doc.put(field, updated);
            }
        }
    }

    private void removeFromVideoExpertImages(Document doc, String filename) {
        List<String> list = doc.getList("videoExpertImages", String.class);
        if (list != null) {
            List<String> updated = new ArrayList<>();
            for (String val : list) {
                if (!val.contains(filename)) {
                    updated.add(val);
                }
            }
            doc.put("videoExpertImages", updated);
        }
    }

    @SuppressWarnings("unchecked")
    private void removeFromTires(Document doc, String filename) {
        List<Document> tires = (List<Document>) doc.get("tires");
        if (tires != null) {
            for (Document tire : tires) {
                List<String> images = tire.getList("images", String.class);
                if (images != null) {
                    List<String> updated = new ArrayList<>();
                    for (String val : images) {
                        if (!val.contains(filename)) {
                            updated.add(val);
                        }
                    }
                    tire.put("images", updated);
                }
            }
            doc.put("tires", tires);
        }
    }

    private void removeFromEquipment(Document doc, String filename) {
        String[] equipFields = {"breakdownKit", "firstAidKit", "safetyVest", "warningTriangle", "spareTire"};
        for (String field : equipFields) {
            Document equip = doc.get(field, Document.class);
            if (equip != null) {
                List<String> images = equip.getList("images", String.class);
                if (images != null) {
                    List<String> updated = new ArrayList<>();
                    for (String val : images) {
                        if (!val.contains(filename)) {
                            updated.add(val);
                        }
                    }
                    equip.put("images", updated);
                    doc.put(field, equip);
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void removeFromPhotos(Document doc, String filename) {
        List<Document> photos = (List<Document>) doc.get("photos");
        if (photos != null) {
            List<Document> updated = new ArrayList<>();
            for (Document p : photos) {
                String data = p.getString("data");
                String fn = p.getString("fileName");
                boolean match = (data != null && data.contains(filename)) || filename.equals(fn);
                if (!match) {
                    updated.add(p);
                }
            }
            doc.put("photos", updated);
        }
    }

    /** The stored {@code meetingData} value for a db-key (S3 key or legacy base64), if present. */
    public Optional<String> getMeetingImage(String caseNumber, String dbKey) {
        return Optional.ofNullable(getOrderImages(caseNumber).get(dbKey));
    }

    /**
     * A presigned URL for a screenshot if its stored value is an S3 key ({@code screenshots/…});
     * null if absent or if the value is a legacy base64 blob (served directly instead).
     */
    public String getScreenshotUrl(String caseNumber, String dbKey) {
        String value = getOrderImages(caseNumber).get(dbKey);
        if (value != null && value.startsWith("screenshots/")) {
            return s3.generatePresignedUrl(value);
        }
        return null;
    }

    /** Append a recording S3 key to the order's {@code videoRecordingKeys} array. */
    public void addVideoRecordingKey(String caseNumber, String key) {
        collection.updateOne(Filters.eq("caseNumber", caseNumber),
                Updates.push("videoRecordingKeys", key));
    }

    /** The order's recording S3 keys (with backward-compat for a legacy single {@code videoRecordingKey}). */
    @SuppressWarnings("unchecked")
    public List<String> getVideoRecordingKeys(String caseNumber) {
        Document order = findByCaseNumber(caseNumber);
        if (order == null) {
            return Collections.emptyList();
        }
        List<String> keys = new ArrayList<>();
        Object legacy = order.get("videoRecordingKey");
        if (legacy instanceof String && !((String) legacy).isBlank()) {
            keys.add((String) legacy);
        }
        Object list = order.get("videoRecordingKeys");
        if (list instanceof List) {
            for (Object k : (List<Object>) list) {
                if (k != null) {
                    keys.add(k.toString());
                }
            }
        }
        return keys;
    }

    // ------------------------------------------------------------------
    // UVV Digital (Decision Q9 — kept as-is from VideoExpert). Keyed by
    // caseNumber (== omtOrderId) so the result lands on the same unified order
    // the report/video modes use.
    // ------------------------------------------------------------------

    /**
     * Record a UVV inspection result on the order and report it to OMT. Marks the order's
     * lifecycle {@code orderStatus=DONE} (NOT the report {@code status}), stamps the result,
     * then calls OMT {@code CompleteUvvInspection}; if OMT generated a certificate or if
     * we generate it locally, flips {@code uvvCertificateAvailable=true}.
     */
    public void saveUvvResult(String caseNumber, UvvInspectionResultRequest request) {
        Document order = findByCaseNumber(caseNumber);
        if (order == null) {
            throw new IllegalArgumentException("No order found for caseNumber " + caseNumber);
        }

        // Persist the per-item checklist to the order document so the PDF generator
        // reads explicit values instead of inferring from vehicle report fields.
        if (request.getChecklistItems() != null && !request.getChecklistItems().isEmpty()) {
            Document checklistDoc = new Document();
            for (java.util.Map.Entry<Integer, String> entry : request.getChecklistItems().entrySet()) {
                if (entry.getValue() != null) {
                    checklistDoc.put(String.valueOf(entry.getKey()), entry.getValue());
                }
            }
            order.put("uvvChecklist", checklistDoc);
        }

        // Build combined update — include uvvChecklist if provided
        java.util.List<org.bson.conversions.Bson> updateOps = new java.util.ArrayList<>();
        updateOps.add(Updates.set("orderStatus", OrderStatus.DONE.name()));
        updateOps.add(Updates.set("uvvResult", request.getUvvResult()));
        updateOps.add(Updates.set("uvvInspectionDate", LocalDateTime.now().toString()));
        updateOps.add(Updates.set("uvvCertificateAvailable", false));
        updateOps.add(Updates.set("updatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)));
        if (request.getChecklistItems() != null && !request.getChecklistItems().isEmpty()) {
            Document checklistDoc = order.get("uvvChecklist", Document.class);
            if (checklistDoc != null) {
                updateOps.add(Updates.set("uvvChecklist", checklistDoc));
            }
        }
        collection.updateOne(Filters.eq("caseNumber", caseNumber), Updates.combine(updateOps));

        String source = order.getString("source");
        String omtOrderId = order.getString("omtOrderId");
        if (omtOrderId == null) {
            omtOrderId = caseNumber;
        }

        // Generate and upload UVV certificate PDF locally.
        // The order document already has uvvChecklist set, so the generator will use it.
        try {
            byte[] pdfBytes = uvvCertificateGenerator.generateCertificatePdf(order, request.getInspectorName(), request.getUvvResult());
            s3.uploadFile("uvv-certificates/" + caseNumber + ".pdf", pdfBytes, "application/pdf");
            collection.updateOne(
                    Filters.eq("caseNumber", caseNumber),
                    Updates.set("uvvCertificateAvailable", true));
            request.setPdfBase64(java.util.Base64.getEncoder().encodeToString(pdfBytes));
        } catch (Exception e) {
            log.error("Failed to generate and upload UVV PDF locally: {}", e.getMessage(), e);
        }

        boolean certificateAvailable = omtIntegrationService.completeUvvInspection(omtOrderId, source, request);
        if (certificateAvailable) {
            collection.updateOne(
                    Filters.eq("caseNumber", caseNumber),
                    Updates.set("uvvCertificateAvailable", true));
        }
    }


    /**
     * Fetch the UVV certificate PDF for an order (only when the result is PASSED). Serves the local
     * PDF from S3 (or generates on-the-fly), falling back to fetching it from OMT if local retrieval fails.
     */
    public org.springframework.http.ResponseEntity<byte[]> getUvvCertificate(String caseNumber) {
        Document order = findByCaseNumber(caseNumber);
        if (order == null) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
        String uvvResult = order.getString("uvvResult");
        if (uvvResult == null || uvvResult.isBlank()) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND).build();
        }

        try {
            String key = "uvv-certificates/" + caseNumber + ".pdf";
            byte[] pdf = null;

            if (s3.exists(key)) {
                pdf = s3.downloadFile(key);
            } else {
                try {
                    String inspectorName = order.getString("vehicleExpertName");
                    if (inspectorName == null || inspectorName.isBlank()) {
                        inspectorName = "Sachverständiger";
                    }
                    pdf = uvvCertificateGenerator.generateCertificatePdf(order, inspectorName, uvvResult);
                    s3.uploadFile(key, pdf, "application/pdf");
                    collection.updateOne(
                            Filters.eq("caseNumber", caseNumber),
                            Updates.set("uvvCertificateAvailable", true));
                } catch (Exception e) {
                    log.error("Failed to generate UVV certificate on-the-fly for {}: {}", caseNumber, e.getMessage());
                }
            }

            // Fallback to OMT if local generation/retrieval failed
            if (pdf == null || pdf.length == 0) {
                String source = order.getString("source");
                String omtOrderId = order.getString("omtOrderId");
                if (omtOrderId == null) {
                    omtOrderId = caseNumber;
                }
                pdf = omtIntegrationService.fetchUvvCertificate(omtOrderId, source);
            }

            if (pdf == null || pdf.length == 0) {
                return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND).build();
            }

            return org.springframework.http.ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"UVV_Zertifikat.pdf\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .body(pdf);
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND).build();
        }
    }

    private String getReportBodyPartKey(String cleanPartId) {
        if (cleanPartId == null) return null;
        switch (cleanPartId.toLowerCase()) {
            case "front_bumper": return "bumper_front";
            case "bonnet": return "hood";
            case "windshield": return "windshield";
            case "front_left_fender": return "fender_front_left";
            case "front_left_door": return "door_front_left";
            case "rear_left_door": return "door_rear_left";
            case "left_side_wall": return "quarter_panel_left";
            case "left_sill": return "sill_left";
            case "dachrahmen_links": return "roof_frame_left";
            case "front_right_fender": return "fender_front_right";
            case "front_right_door": return "door_front_right";
            case "rear_right_door": return "door_rear_right";
            case "right_side_wall": return "quarter_panel_right";
            case "right_sill": return "sill_right";
            case "roof_frame_right": return "roof_frame_right";
            case "left_wing_mirror": return "mirror_left";
            case "right_hand_exterior_mirror": return "mirror_right";
            case "roof": return "roof";
            case "tailgate": return "tailgate";
            case "rear_bumper": return "bumper_rear";
            case "headlight_on_the_left": return "headlight_left";
            case "headlight_on_the_right": return "headlight_right";
            case "left_rear_light": return "rear_light_left";
            case "taillights_right": return "rear_light_right";
            default: return null;
        }
    }

    @SuppressWarnings("unchecked")
    private void associateScreenshotWithMinderwertRow(Document doc, String cleanPartId, String url) {
        String bodyPartKey = getReportBodyPartKey(cleanPartId);
        if (bodyPartKey == null) return;

        List<Document> minderwertRows = (List<Document>) doc.get("minderwertRows");
        if (minderwertRows == null) {
            minderwertRows = new ArrayList<>();
        }

        Document targetRow = null;
        for (Document d : minderwertRows) {
            if (bodyPartKey.equals(d.getString("bodyPart"))) {
                targetRow = d;
                break;
            }
        }

        String targetId;
        if (targetRow != null) {
            targetId = targetRow.getString("id");
            List<String> images = targetRow.getList("images", String.class);
            if (images == null) {
                images = new ArrayList<>();
            }
            if (!images.contains(url)) {
                images.add(url);
                targetRow.put("images", images);
            }
        } else {
            targetId = bodyPartKey;
            List<String> images = new ArrayList<>();
            images.add(url);

            Document newRow = new Document()
                .append("id", targetId)
                .append("bodyPart", bodyPartKey)
                .append("damage", "")
                .append("repairMethod", "")
                .append("repairCost", 0.0)
                .append("presetType", 1)
                .append("isCustom", true)
                .append("repairCodeIndex", 0)
                .append("images", images)
                .append("reparaturweg", "Karosserie")
                .append("spareParts", 0.0)
                .append("anrechnung", "kein")
                .append("repairType", "")
                .append("minderwertBrutto", 0.0)
                .append("minderwertNetto", 0.0);

            minderwertRows.add(newRow);
        }
        doc.put("minderwertRows", minderwertRows);

        // Update photo reference in photos list to include damageId
        List<Document> photos = (List<Document>) doc.get("photos");
        if (photos != null) {
            for (Document p : photos) {
                if (url.equals(p.getString("data"))) {
                    p.put("damageId", targetId);
                    break;
                }
            }
            doc.put("photos", photos);
        }
    }

    @SuppressWarnings("unchecked")
    private boolean isScreenshotMatch(String val, List<String> videoExpertImages) {
        if (val == null || videoExpertImages == null) return false;
        String cleanVal = val.contains("/api/screenshots/") ? val.substring(val.indexOf("/api/screenshots/")) : val;
        for (String veImg : videoExpertImages) {
            String cleanVe = veImg.contains("/api/screenshots/") ? veImg.substring(veImg.indexOf("/api/screenshots/")) : veImg;
            if (cleanVal.equalsIgnoreCase(cleanVe)) {
                return true;
            }
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    public Document reSyncVideoExpertPhotos(String caseNumber) {
        Document doc = collection.find(Filters.eq("caseNumber", caseNumber)).first();
        if (doc == null) return null;

        // 1. Read existing VideoExpert-mapped photo URLs/paths
        List<String> videoExpertImages = doc.getList("videoExpertImages", String.class);
        if (videoExpertImages == null) {
            videoExpertImages = new ArrayList<>();
        }

        String[] uniqueListFields = {
            "identificationImages", "mileageImages", "nextHUImages",
            "keysImages", "fzScheinImages", "serviceheftImages",
            "bordliteraturImages", "environmentalBadgeImages",
            "maintenanceImages", "chargingCableImages"
        };
        for (String field : uniqueListFields) {
            List<String> list = doc.getList(field, String.class);
            if (list != null) {
                List<String> cleaned = new ArrayList<>();
                for (String val : list) {
                    if (!isScreenshotMatch(val, videoExpertImages)) {
                        cleaned.add(val);
                    }
                }
                doc.put(field, cleaned);
            }
        }

        // Tires
        List<Document> tires = (List<Document>) doc.get("tires");
        if (tires != null) {
            for (Document tire : tires) {
                List<String> images = tire.getList("images", String.class);
                if (images != null) {
                    List<String> cleaned = new ArrayList<>();
                    for (String val : images) {
                        if (!isScreenshotMatch(val, videoExpertImages)) {
                            cleaned.add(val);
                        }
                    }
                    tire.put("images", cleaned);
                }
            }
            doc.put("tires", tires);
        }

        // Equipment
        String[] equipFields = {"breakdownKit", "firstAidKit", "safetyVest", "warningTriangle", "spareTire"};
        for (String field : equipFields) {
            Document equip = doc.get(field, Document.class);
            if (equip != null) {
                List<String> images = equip.getList("images", String.class);
                if (images != null) {
                    List<String> cleaned = new ArrayList<>();
                    for (String val : images) {
                        if (!isScreenshotMatch(val, videoExpertImages)) {
                            cleaned.add(val);
                        }
                    }
                    equip.put("images", cleaned);
                    doc.put(field, equip);
                }
            }
        }

        // Photos gallery
        List<Document> photosList = (List<Document>) doc.get("photos");
        if (photosList != null) {
            List<Document> cleaned = new ArrayList<>();
            for (Document p : photosList) {
                String data = p.getString("data");
                if (data == null || !isScreenshotMatch(data, videoExpertImages)) {
                    cleaned.add(p);
                }
            }
            doc.put("photos", cleaned);
        }

        // MinderwertRows list – remove only VideoExpert-originated images
        List<Document> minderwertRows = (List<Document>) doc.get("minderwertRows");
        if (minderwertRows != null) {
            for (Document d : minderwertRows) {
                List<String> images = d.getList("images", String.class);
                if (images != null) {
                    List<String> cleaned = new ArrayList<>();
                    for (String val : images) {
                        if (!isScreenshotMatch(val, videoExpertImages)) {
                            cleaned.add(val);
                        }
                    }
                    d.put("images", cleaned);
                }
            }
            doc.put("minderwertRows", minderwertRows);
        }

        // Reset videoExpertImages to empty so mapScreenshotToReport can build it fresh
        doc.put("videoExpertImages", new ArrayList<String>());

        // 2. Loop through current meetingData and perform fresh mapping
        Document meetingData = doc.get("meetingData", Document.class);
        if (meetingData != null) {
            for (Map.Entry<String, Object> entry : meetingData.entrySet()) {
                String dbKey = entry.getKey();
                String value = String.valueOf(entry.getValue());
                mapScreenshotToReport(doc, caseNumber, dbKey, value);
            }
        }

        collection.replaceOne(Filters.eq("caseNumber", caseNumber), doc);
        return doc;
    }

    @SuppressWarnings("unchecked")
    private void removeScreenshotFromMinderwertRows(Document doc, String filename) {
        List<Document> minderwertRows = (List<Document>) doc.get("minderwertRows");
        if (minderwertRows != null) {
            for (Document d : minderwertRows) {
                List<String> images = d.getList("images", String.class);
                if (images != null) {
                    List<String> updated = new ArrayList<>();
                    for (String val : images) {
                        if (!val.contains(filename)) {
                            updated.add(val);
                        }
                    }
                    d.put("images", updated);
                }
            }
            doc.put("minderwertRows", minderwertRows);
        }
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
