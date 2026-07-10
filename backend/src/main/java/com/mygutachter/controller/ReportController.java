package com.mygutachter.controller;

import java.io.IOException;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.UpdateOptions;
import com.mygutachter.model.OrderMode;
import com.mygutachter.model.PhotoDTO;
import com.mygutachter.model.ReportDTO;
import com.mygutachter.model.ReportVersionDTO;
import com.mygutachter.model.SendLogDTO;
import com.mygutachter.service.ActivityLogService;
import com.mygutachter.service.EmailService;
import com.mygutachter.service.ExternalOrderService;
import com.mygutachter.service.JwtService;
import com.mygutachter.service.OrderService;
import com.mygutachter.service.S3Service;
import com.mygutachter.service.ValuationService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final MongoCollection<Document> collection;
    private final MongoCollection<Document> rateConfigCollection;
    private final MongoCollection<Document> usersCollection;
    private final ObjectMapper objectMapper;
    private final EmailService emailService;
    private final ExternalOrderService externalOrderService;
    private final JwtService jwtService;
    private final ActivityLogService activityLogService;
    private final ValuationService valuationService;
    private final S3Service s3;
    private final OrderService orderService;

    private static final List<String> ALLOWED_CLAIM_TYPES = Arrays.asList(
            "Zustandsbericht / Minderwertgutachten",
            "Fahrzeugbewertung",
            "Zustandsbericht / Minderwertbericht Foto",
            "Zustandsbericht / Minderwertbericht Video");

    @Autowired
    public ReportController(MongoDatabase database,
            ObjectMapper objectMapper,
            EmailService emailService,
            ExternalOrderService externalOrderService,
            JwtService jwtService,
            ActivityLogService activityLogService,
            ValuationService valuationService,
            S3Service s3,
            OrderService orderService,
            @Value("${mongodb.collections.orders}") String collectionName,
            @Value("${mongodb.collections.rateConfig}") String rateConfigCollName,
            @Value("${mongodb.collections.users}") String usersCollName) {
        this.collection = database.getCollection(collectionName);
        this.rateConfigCollection = database.getCollection(rateConfigCollName);
        this.usersCollection = database.getCollection(usersCollName);
        this.objectMapper = objectMapper;
        this.emailService = emailService;
        this.externalOrderService = externalOrderService;
        this.jwtService = jwtService;
        this.activityLogService = activityLogService;
        this.valuationService = valuationService;
        this.s3 = s3;
        this.orderService = orderService;
    }

    /** Map a sanitized email + filename to the S3 object key for report photos. */
    private String s3Key(String sanitizedEmail, String filename) {
        return "report-photos/" + sanitizedEmail + "/" + filename;
    }

    /** Derive the S3 key from a stored /api/reports/photos/... reference. */
    private String s3KeyFromStoredPath(String storedPath) {
        String prefix = "/api/reports/photos/";
        int idx = storedPath.indexOf(prefix);
        String rel = idx >= 0 ? storedPath.substring(idx + prefix.length()) : storedPath;
        return "report-photos/" + rel;
    }

    private boolean canViewAllVehicleValuations(String userEmail, String userRole) {
        if ("ADMIN".equals(userRole)) {
            return true;
        }
        if (userEmail != null) {
            Document userDoc = usersCollection.find(Filters.regex("email", "^" + java.util.regex.Pattern.quote(userEmail) + "$", "i")).first();
            if (userDoc != null && (Boolean.TRUE.equals(userDoc.getBoolean("vehicleValuationViewAll")) || Boolean.TRUE.equals(userDoc.getBoolean("vehicleValuationAdministrate")))) {
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

    private boolean canViewOwnVehicleValuations(String userEmail, String userRole) {
        if ("ADMIN".equals(userRole)) {
            return true;
        }
        if (userEmail != null) {
            Document userDoc = usersCollection.find(Filters.regex("email", "^" + java.util.regex.Pattern.quote(userEmail) + "$", "i")).first();
            if (userDoc != null) {
                if (Boolean.TRUE.equals(userDoc.getBoolean("vehicleValuationViewOwn")) ||
                    Boolean.TRUE.equals(userDoc.getBoolean("vehicleValuationViewAll")) ||
                    Boolean.TRUE.equals(userDoc.getBoolean("vehicleValuationAdministrate"))) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Admin: list all reports. Expert: list only own report.
     * Supports pagination via skipCount and maxResultCount.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllReports(
            @RequestParam(required = false, defaultValue = "0") int skipCount,
            @RequestParam(required = false, defaultValue = "50") int maxResultCount,
            @RequestParam(required = false) String mode,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        String userRole = (String) request.getAttribute("userRole");

        if (!canViewOwnVehicleValuations(userEmail, userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Document> reports = new ArrayList<>();

        Document base = new Document();
        if (!canViewAllVehicleValuations(userEmail, userRole)) {
            // Experts only see reports assigned to them (identified by userEmail)
            base.put("userEmail", userEmail);
        }

        // Filter by app mode (T7.4, Decision Q2). Video list: modes contains VIDEO_EXPERT.
        // Report list (default): modes contains VEHICLE_REPORT, PLUS legacy orders with no
        // modes yet (they belong to the Vehicle Report list).
        Document modeFilter;
        if (OrderMode.VIDEO_EXPERT.name().equals(mode)) {
            modeFilter = new Document("modes", OrderMode.VIDEO_EXPERT.name());
        } else {
            modeFilter = new Document("$or", List.of(
                    new Document("modes", OrderMode.VEHICLE_REPORT.name()),
                    new Document("modes", new Document("$exists", false)),
                    new Document("modes", new Document("$size", 0))));
        }

        Document filter = base.isEmpty()
                ? modeFilter
                : new Document("$and", List.of(base, modeFilter));

        long totalCount = collection.countDocuments(filter);

        collection.find(filter)
                .sort(new Document("_id", -1))
                .skip(skipCount)
                .limit(maxResultCount)
                .into(reports);

        // Remove _id field for cleaner JSON
        reports.forEach(r -> r.remove("_id"));

        Map<String, Object> response = new HashMap<>();
        response.put("items", reports);
        response.put("totalCount", totalCount);

        return ResponseEntity.ok(response);
    }

    /**
     * Get the current user's single report — used for lazy load / duplicate check.
     */
    @GetMapping("/my-report")
    public ResponseEntity<Document> getMyReport(
            @RequestParam(required = false) String caseNumber,
            HttpServletRequest request) {
        String requesterEmail = (String) request.getAttribute("userEmail");
        String requesterRole = (String) request.getAttribute("userRole");

        if (!canViewOwnVehicleValuations(requesterEmail, requesterRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Document report = null;
        if (caseNumber != null && !caseNumber.trim().isEmpty()) {
            if (canViewAllVehicleValuations(requesterEmail, requesterRole)) {
                // Admin can search globally by caseNumber
                report = collection.find(Filters.eq("caseNumber", caseNumber)).first();
            } else {
                // Experts restricted to their own email
                report = collection.find(Filters.and(
                        Filters.eq("userEmail", requesterEmail),
                        Filters.eq("caseNumber", caseNumber))).first();
            }
        }

        if (report == null) {
            return ResponseEntity.ok(null);
        }
        report.remove("_id");
        // For photos: build full data URLs if they have filePaths
        String reportUserEmail = report.getString("userEmail");
        enrichPhotosWithData(report, reportUserEmail);
        return ResponseEntity.ok(report);
    }

    /**
     * Save/update the user's report (partial merge).
     * Accepts a ReportDTO (any subset of fields).
     * Photos with base64 data are saved to disk, path stored in DB.
     */
    @PostMapping
    public ResponseEntity<ReportDTO> saveReport(@RequestBody ReportDTO report, HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        String userRole = (String) request.getAttribute("userRole");
        String userName = (String) request.getAttribute("expertName");

        if (!canViewOwnVehicleValuations(userEmail, userRole)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        // If requester is authorized to view all orders and userEmail is provided in body, use it.
        // Otherwise, use the requester's email.
        if (canViewAllVehicleValuations(userEmail, userRole) && report.getUserEmail() != null && !report.getUserEmail().isEmpty()) {
            userEmail = report.getUserEmail();
        } else {
            report.setUserEmail(userEmail);
        }

        if (report.getCaseNumber() == null || report.getCaseNumber().trim().isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Case number is required. Reports must be imported from OMT.");
        }

        // Fetch existing report to compare
        Document existingDoc = collection.find(Filters.and(
                Filters.eq("userEmail", userEmail),
                Filters.eq("caseNumber", report.getCaseNumber()))).first();

        if (existingDoc == null) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Report not found. Reports must be imported from OMT.");
        }

        ReportDTO oldReport = objectMapper.convertValue(existingDoc, ReportDTO.class);

        // Process photos: save base64 data to disk
        if (report.getPhotos() != null && !report.getPhotos().isEmpty()) {
            processPhotos(report.getPhotos(), userEmail);
        }

        // Process paint measurement photos
        if (report.getPaintMeasurements() != null) {
            for (int i = 0; i < report.getPaintMeasurements().size(); i++) {
                var pm = report.getPaintMeasurements().get(i);
                if (pm.getImages() != null && !pm.getImages().isEmpty()) {
                    pm.setImages(processBase64ImageList(pm.getImages(), "paint_" + i + "_" + pm.getId(), userEmail));
                }
            }
        }

        // Process other image lists

        report.setLastRegistrationImages(processBase64ImageList(report.getLastRegistrationImages(), "lri", userEmail));
        report.setMileageImages(processBase64ImageList(report.getMileageImages(), "mi", userEmail));
        report.setNextHUImages(processBase64ImageList(report.getNextHUImages(), "nhui", userEmail));
        report.setIdentificationImages(processBase64ImageList(report.getIdentificationImages(), "ident", userEmail));
        report.setServiceheftImages(processBase64ImageList(report.getServiceheftImages(), "shi", userEmail));
        report.setBordliteraturImages(processBase64ImageList(report.getBordliteraturImages(), "bli", userEmail));
        report.setKeysImages(processBase64ImageList(report.getKeysImages(), "ki", userEmail));
        report.setMaintenanceImages(processBase64ImageList(report.getMaintenanceImages(), "maint", userEmail));
        report.setChargingCableImages(processBase64ImageList(report.getChargingCableImages(), "cci", userEmail));
        report.setFzScheinImages(processBase64ImageList(report.getFzScheinImages(), "fzs", userEmail));
        report.setErrorMemoryReadImages(processBase64ImageList(report.getErrorMemoryReadImages(), "emri", userEmail));
        report.setHybridBatteryCheckedImages(
                processBase64ImageList(report.getHybridBatteryCheckedImages(), "hbci", userEmail));
        report.setInspectionFromAboveImages(
                processBase64ImageList(report.getInspectionFromAboveImages(), "ifa", userEmail));
        report.setInspectionFromBelowImages(
                processBase64ImageList(report.getInspectionFromBelowImages(), "ifb", userEmail));
        report.setVehicleConditionImages(
                processBase64ImageList(report.getVehicleConditionImages(), "vcond", userEmail));
        report.setEquipmentListAvailableImages(
                processBase64ImageList(report.getEquipmentListAvailableImages(), "elai", userEmail));
        report.setDeliveryConfirmationAvailableImages(
                processBase64ImageList(report.getDeliveryConfirmationAvailableImages(), "dcai", userEmail));
        report.setEngineRunPerformedImages(
                processBase64ImageList(report.getEngineRunPerformedImages(), "erpi", userEmail));

        // Process second tires photos
        if (report.getSecondTires() != null) {
            for (int i = 0; i < report.getSecondTires().size(); i++) {
                var tire = report.getSecondTires().get(i);
                if (tire.getImages() != null && !tire.getImages().isEmpty()) {
                    tire.setImages(processBase64ImageList(tire.getImages(), "second_tire_" + i, userEmail));
                }
            }
        }

        // Process tire photos
        if (report.getTires() != null) {
            for (int i = 0; i < report.getTires().size(); i++) {
                var tire = report.getTires().get(i);
                if (tire.getImages() != null && !tire.getImages().isEmpty()) {
                    tire.setImages(processBase64ImageList(tire.getImages(), "tire_" + i, userEmail));
                }
            }
        }

        // Process minderwertRows photos
        if (report.getMinderwertRows() != null) {
            for (int i = 0; i < report.getMinderwertRows().size(); i++) {
                var row = report.getMinderwertRows().get(i);
                if (row.getImages() != null && !row.getImages().isEmpty()) {
                    row.setImages(processBase64ImageList(row.getImages(), "mw_" + i + "_" + row.getId(), userEmail));
                }
            }
        }

        // Process damages photos
        if (report.getDamages() != null) {
            for (int i = 0; i < report.getDamages().size(); i++) {
                var damage = report.getDamages().get(i);
                if (damage.getImages() != null && !damage.getImages().isEmpty()) {
                    damage.setImages(
                            processBase64ImageList(damage.getImages(), "dmg_" + i + "_" + damage.getId(), userEmail));
                }
            }
        }

        // Process spare tire photos
        if (report.getSpareTire() != null && report.getSpareTire().getImages() != null) {
            report.getSpareTire()
                    .setImages(processBase64ImageList(report.getSpareTire().getImages(), "spare_tire", userEmail));
        }

        // Process equipment photos
        if (report.getBreakdownKit() != null && report.getBreakdownKit().getImages() != null) {
            report.getBreakdownKit()
                    .setImages(processBase64ImageList(report.getBreakdownKit().getImages(), "breakdown", userEmail));
        }
        if (report.getFirstAidKit() != null && report.getFirstAidKit().getImages() != null) {
            report.getFirstAidKit()
                    .setImages(processBase64ImageList(report.getFirstAidKit().getImages(), "firstaid", userEmail));
        }
        if (report.getSafetyVest() != null && report.getSafetyVest().getImages() != null) {
            report.getSafetyVest()
                    .setImages(processBase64ImageList(report.getSafetyVest().getImages(), "safetyvest", userEmail));
        }
        if (report.getWarningTriangle() != null && report.getWarningTriangle().getImages() != null) {
            report.getWarningTriangle()
                    .setImages(processBase64ImageList(report.getWarningTriangle().getImages(), "warning", userEmail));
        }

        // Process signatures: save base64 data to disk
        if (report.getSignatures() != null) {
            processSignatures(report, userEmail);
        }

        // Process authorized person photo
        if (report.getAuthorizedPersonPhoto() != null && report.getAuthorizedPersonPhoto().startsWith("data:image")) {
            report.setAuthorizedPersonPhoto(
                    saveSignatureFile(report.getAuthorizedPersonPhoto(), "authorized_person", userEmail));
        }

        final String lockKey = report.getCaseNumber().intern();
        ReportDTO mergedReport;

        synchronized (lockKey) {
            // 1. Fetch current version from DB to have a complete view for valuations
            existingDoc = collection.find(
                    Filters.and(Filters.eq("userEmail", userEmail),
                            Filters.eq("caseNumber", report.getCaseNumber())))
                    .first();

            mergedReport = report;
            if (existingDoc != null) {
                try {
                    // Remove _id from existingDoc before converting to DTO
                    existingDoc.remove("_id");
                    // Convert existing doc to DTO
                    mergedReport = objectMapper.convertValue(existingDoc, ReportDTO.class);
                    // Merge incoming fields OVER the existing ones
                    Map<String, Object> incomingMap = objectMapper.convertValue(report, Map.class);
                    for (Map.Entry<String, Object> entry : incomingMap.entrySet()) {
                        if (entry.getValue() != null) {
                            existingDoc.put(entry.getKey(), entry.getValue());
                        }
                    }
                    mergedReport = objectMapper.convertValue(existingDoc, ReportDTO.class);
                } catch (Exception e) {
                    System.err.println("Failed to merge report: " + e.getMessage());
                }
            }

            // Apply automatic valuations on the FULL (merged) report
            valuationService.calculateAutomaticDevaluations(mergedReport);

            // Convert the merged report back to Map for partial $set update
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.convertValue(mergedReport, Map.class);

            // Remove null values — only update fields that were actually sent
            Document updateFields = new Document();
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                if (entry.getValue() != null) {
                    updateFields.append(entry.getKey(), entry.getValue());
                }
            }
            // Always ensure userEmail and caseNumber are set
            updateFields.append("userEmail", userEmail);
            updateFields.append("caseNumber", report.getCaseNumber());

            Document updateDoc = new Document("$set", updateFields);

            collection.updateOne(
                    Filters.and(Filters.eq("userEmail", userEmail),
                            Filters.eq("caseNumber", report.getCaseNumber())),
                    updateDoc);
        }

        // Log the change
        activityLogService.compareAndLog(oldReport, report, userEmail, userName);

        return ResponseEntity.ok(mergedReport);
    }

    /**
     * Delete the current user's report and associated photo files.
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteReport(
            @RequestParam String caseNumber,
            HttpServletRequest request) {
        String requesterEmail = (String) request.getAttribute("userEmail");
        String requesterRole = (String) request.getAttribute("userRole");
        String requesterName = (String) request.getAttribute("expertName");

        if (!canViewOwnVehicleValuations(requesterEmail, requesterRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Find report first to check permissions and get targetEmail for file cleanup
        Document report;
        if (canViewAllVehicleValuations(requesterEmail, requesterRole)) {
            report = collection.find(Filters.eq("caseNumber", caseNumber)).first();
        } else {
            report = collection.find(Filters.and(
                    Filters.eq("userEmail", requesterEmail),
                    Filters.eq("caseNumber", caseNumber))).first();
        }

        if (report == null) {
            return ResponseEntity.notFound().build();
        }

        String targetEmail = report.getString("userEmail");
        collection.deleteOne(Filters.and(
                Filters.eq("userEmail", targetEmail),
                Filters.eq("caseNumber", caseNumber)));

        activityLogService.logChange(caseNumber, targetEmail, requesterName, "General", "Case Deleted",
                "Report and associated files deleted by " + requesterRole);
        // Clean up photos in S3 (best-effort)
        try {
            s3.deleteByPrefix("report-photos/" + sanitizeEmail(targetEmail) + "/");
        } catch (Exception e) {
            System.err.println("Failed to delete report photos from S3: " + e.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    /**
     * Serve a photo via a presigned S3 URL.
     * <ul>
     *   <li>{@code ?follow=true} (default) – returns a 302 redirect to the presigned URL;
     *       browser {@code <img>} tags follow this transparently.</li>
     *   <li>{@code ?follow=false} – returns the presigned URL as a plain-text JSON string
     *       so the frontend can use it directly (e.g. for canvas operations).</li>
     * </ul>
     */
    @GetMapping("/photos/{userEmail:.+}/{filename:.+}")
    public ResponseEntity<?> servePhoto(
            @PathVariable String userEmail,
            @PathVariable String filename,
            @RequestParam(value = "follow", defaultValue = "true") boolean follow,
            HttpServletRequest request) {

        try {
            String key = s3Key(sanitizeEmail(userEmail), filename);
            if (follow) {
                String presignedUrl = s3.generatePresignedUrl(key);
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(presignedUrl))
                        .build();
            } else {
                byte[] imageBytes = s3.downloadFile(key);
                String contentType = "image/jpeg";
                if (filename.toLowerCase().endsWith(".png")) {
                    contentType = "image/png";
                }
                return ResponseEntity.ok()
                        .header("Content-Type", contentType)
                        .body(imageBytes);
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Save PDF to disk without sending email (versioned).
     */
    @PostMapping("/save-pdf")
    public ResponseEntity<Map<String, String>> savePdf(
            @RequestParam("pdf") MultipartFile pdf,
            @RequestParam("caseNumber") String caseNumber,
            HttpServletRequest request) {

        String requesterEmail = (String) request.getAttribute("userEmail");
        String requesterRole = (String) request.getAttribute("userRole");
        String requesterName = (String) request.getAttribute("expertName");

        if (!canViewOwnVehicleValuations(requesterEmail, requesterRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Find report first to check permissions and get targetEmail
        Document report;
        if (canViewAllVehicleValuations(requesterEmail, requesterRole)) {
            report = collection.find(Filters.eq("caseNumber", caseNumber)).first();
        } else {
            report = collection.find(Filters.and(
                    Filters.eq("userEmail", requesterEmail),
                    Filters.eq("caseNumber", caseNumber))).first();
        }

        if (report == null) {
            return ResponseEntity.notFound().build();
        }

        String targetEmail = report.getString("userEmail");

        if (pdf.isEmpty() || caseNumber == null || caseNumber.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "PDF and caseNumber are required"));
        }

        try {
            String pdfRelativePath = handlePdfVersioning(caseNumber, pdf, targetEmail, requesterName);

            Document updateFields = new Document("pdfPath", pdfRelativePath);
            collection.updateOne(
                    Filters.and(Filters.eq("userEmail", targetEmail), Filters.eq("caseNumber", caseNumber)),
                    new Document("$set", updateFields));

            return ResponseEntity.ok(Map.of("message", "PDF saved successfully", "pdfPath", pdfRelativePath));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Failed to save PDF: " + e.getMessage()));
        }
    }

    /**
     * Save PDF to disk and email to customer.
     */
    @PostMapping("/send-pdf")
    public ResponseEntity<Map<String, String>> sendPdf(
            @RequestParam("pdf") MultipartFile pdf,
            @RequestParam("email") String email,
            @RequestParam("caseNumber") String caseNumber,
            @RequestParam("claimType") String claimType,
            @RequestParam("licensePlate") String licensePlate,
            HttpServletRequest request) {

        String requesterEmail = (String) request.getAttribute("userEmail");
        String requesterRole = (String) request.getAttribute("userRole");
        String requesterName = (String) request.getAttribute("expertName");

        if (!canViewOwnVehicleValuations(requesterEmail, requesterRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Find report first to check permissions and get targetEmail
        Document existingDoc;
        if (canViewAllVehicleValuations(requesterEmail, requesterRole)) {
            existingDoc = collection.find(Filters.eq("caseNumber", caseNumber)).first();
        } else {
            existingDoc = collection.find(Filters.and(
                    Filters.eq("userEmail", requesterEmail),
                    Filters.eq("caseNumber", caseNumber))).first();
        }

        if (existingDoc == null) {
            return ResponseEntity.notFound().build();
        }

        String targetEmail = existingDoc.getString("userEmail");

        System.out.println(
                "Sending PDF for case: " + caseNumber + ", email: " + email + ", licensePlate: [" + licensePlate + "]");

        if (pdf == null || pdf.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "PDF file is required and cannot be empty"));
        }
        if (email == null || !email.contains("@")) {
            return ResponseEntity.badRequest().body(Map.of("message", "A valid recipient email address is required"));
        }
        if (caseNumber == null || caseNumber.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Case number is required"));
        }

        // existingDoc already fetched above
        if (existingDoc != null) {
            // ReportDTO reportDTO = objectMapper.convertValue(existingDoc,
            // ReportDTO.class);
            // List<String> validationErrors =
            // com.mygutachter.validator.ReportValidator.validateStep2(reportDTO);
            // validationErrors.addAll(com.mygutachter.validator.ReportValidator.validateStep3(reportDTO));
            // validationErrors.addAll(com.mygutachter.validator.ReportValidator.validateStep4(reportDTO));
            // if (!validationErrors.isEmpty()) {
            // return ResponseEntity.badRequest()
            // .body(Map.of("message", "Validation failed: " + String.join(", ",
            // validationErrors)));
            // }
        }

        try {
            // Send Email
            emailService.sendReportEmail(email, caseNumber, pdf, claimType, licensePlate);

            // Save PDF with versioning
            String pdfRelativePath = handlePdfVersioning(caseNumber, pdf, targetEmail, requesterName);

            // Record Log entry in MongoDB
            SendLogDTO logEntry = new SendLogDTO();
            logEntry.setSentAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy, HH:mm")));
            logEntry.setRecipient(email);
            logEntry.setSender(targetEmail);

            Document logDoc = objectMapper.convertValue(logEntry, Document.class);

            // Mark as COMPLETED and store PDF path
            Document updateFields = new Document("status", "COMPLETED")
                    .append("pdfPath", pdfRelativePath);

            collection.updateOne(
                    Filters.and(Filters.eq("userEmail", targetEmail), Filters.eq("caseNumber", caseNumber)),
                    new Document("$push", new Document("sendLogs", logDoc))
                            .append("$set", updateFields));

            // Trigger OMT Sync
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String externalToken = jwtService.extractExternalToken(token);
                if (externalToken != null) {
                    try {
                        // 1. Upload PDF as attachment
                        String fileName = "Gutachten_" + caseNumber + ".pdf";
                        // 2. Update status to DNRX_Done (10)
                        Document reportDoc = existingDoc;
                        String customerNumber = reportDoc != null ? reportDoc.getString("customerNumber") : null;
                        String contractNumber = reportDoc != null ? reportDoc.getString("contractNumber") : null;
                        String vin = reportDoc != null ? reportDoc.getString("vin") : null;
                        externalOrderService.updateOrderStatus(caseNumber, customerNumber, contractNumber, vin,
                                externalToken);

                        collection.updateOne(
                                Filters.and(Filters.eq("userEmail", targetEmail), Filters.eq("caseNumber", caseNumber)),
                                new Document("$set", new Document("omtSyncStatus", "SUCCESS")
                                        .append("omtSyncError", null)));
                    } catch (Exception e) {
                        collection.updateOne(
                                Filters.and(Filters.eq("userEmail", targetEmail), Filters.eq("caseNumber", caseNumber)),
                                new Document("$set", new Document("omtSyncStatus", "FAILED")
                                        .append("omtSyncError", e.getMessage())));
                    }
                }
            }

            activityLogService.logChange(caseNumber, targetEmail, requesterName, "Shipping",
                    "PDF Sent", "Email sent to: " + email);

            return ResponseEntity.ok(Map.of("message", "PDF saved and email sent securely"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed: " + e.getMessage()));
        }
    }

    /**
     * Get the list of valid Claim Types from OMT backend.
     */
    @GetMapping("/claim-types")
    public ResponseEntity<?> getClaimTypes(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        String token = authHeader.substring(7);
        String externalToken = jwtService.extractExternalToken(token);

        if (externalToken == null) {
            // Return default list if token is missing (open URL session)
            List<Map<String, String>> defaultTypes = new ArrayList<>();
            for (String type : ALLOWED_CLAIM_TYPES) {
                defaultTypes.add(Map.of("label", type));
            }
            return ResponseEntity.ok(defaultTypes);
        }

        try {
            JsonNode types = externalOrderService.fetchClaimTypes(externalToken);
            List<JsonNode> filtered = new ArrayList<>();
            if (types.isArray()) {
                for (JsonNode node : types) {
                    String label = node.has("label") ? node.get("label").asText() : "";
                    final String trimmedLabel = label.trim();
                    boolean isAllowed = ALLOWED_CLAIM_TYPES.stream()
                            .anyMatch(allowed -> allowed.equalsIgnoreCase(trimmedLabel));
                    if (isAllowed) {
                        filtered.add(node);
                    }
                }
            }
            return ResponseEntity.ok(filtered);
        } catch (Exception e) {
            System.err.println("Failed to fetch claim types: " + e.getMessage());
            // Fallback to defaults on error
            List<Map<String, String>> defaultTypes = new ArrayList<>();
            for (String type : ALLOWED_CLAIM_TYPES) {
                defaultTypes.add(Map.of("label", type));
            }
            return ResponseEntity.ok(defaultTypes);
        }
    }

    /**
     * Get the list of Customer Contacts from OMT backend.
     */
    @GetMapping("/customer-contacts")
    public ResponseEntity<?> getCustomerContacts(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        String token = authHeader.substring(7);
        String externalToken = jwtService.extractExternalToken(token);

        if (externalToken == null) {
            return ResponseEntity.status(400).body(Map.of("error", "No external OMT token found in session"));
        }

        try {
            JsonNode contacts = externalOrderService.fetchCustomerContacts(externalToken);
            return ResponseEntity.ok(contacts);
        } catch (Exception e) {
            System.err.println("Failed to fetch customer contacts: " + e.getMessage());
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Failed to fetch customer contacts from OMT: " + e.getMessage()));
        }
    }

    /**
     * Sync the Video Expert screenshots into the report (T7.5) — a LOCAL operation now (no OMT).
     * The video screenshots already live on this same order (in {@code meetingData}); this performs
     * the fresh mapping of screenshots to their corresponding report slots and returns the updated document.
     */
    @PostMapping("/re-sync-photos")
    public ResponseEntity<?> reSyncPhotos(@RequestParam String caseNumber, HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        String userRole = (String) request.getAttribute("userRole");

        if (!canViewOwnVehicleValuations(userEmail, userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Document query = canViewAllVehicleValuations(userEmail, userRole)
                ? new Document("caseNumber", caseNumber)
                : new Document("userEmail", userEmail).append("caseNumber", caseNumber);
        Document order = collection.find(query).first();
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        Document updatedOrder = orderService.reSyncVideoExpertPhotos(caseNumber);
        if (updatedOrder != null) {
            updatedOrder.remove("_id");
            return ResponseEntity.ok(updatedOrder);
        }
        return ResponseEntity.status(500).body("Failed to re-sync photos");
    }

    /**
     * Manually retry OMT sync.
     */
    @PostMapping("/sync-omt")
    public ResponseEntity<?> retrySync(
            @RequestParam String caseNumber,
            HttpServletRequest request) {
        String requesterEmail = (String) request.getAttribute("userEmail");
        String requesterRole = (String) request.getAttribute("userRole");

        if (!canViewOwnVehicleValuations(requesterEmail, requesterRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Find report first to check permissions and get targetEmail
        Document report;
        if (canViewAllVehicleValuations(requesterEmail, requesterRole)) {
            report = collection.find(Filters.eq("caseNumber", caseNumber)).first();
        } else {
            report = collection.find(Filters.and(
                    Filters.eq("userEmail", requesterEmail),
                    Filters.eq("caseNumber", caseNumber))).first();
        }

        if (report == null) {
            return ResponseEntity.notFound().build();
        }

        String targetEmail = report.getString("userEmail");

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        String token = authHeader.substring(7);
        String externalToken = jwtService.extractExternalToken(token);

        if (externalToken == null) {
            return ResponseEntity.status(400).body(Map.of("error", "No external OMT token found"));
        }

        try {
            // report already fetched at line 727
            String pdfPathStr = report.getString("pdfPath");
            if (pdfPathStr == null) {
                return ResponseEntity.status(400).body(Map.of("error", "PDF not yet generated for this report"));
            }

            // Derive S3 key from the stored path
            // pdfPath is like /api/reports/photos/[userEmail]/[filename]
            String fileName = pdfPathStr.substring(pdfPathStr.lastIndexOf('/') + 1);
            String pdfKey = s3KeyFromStoredPath(pdfPathStr);

            if (!s3.exists(pdfKey)) {
                return ResponseEntity.status(404).body(Map.of("error", "PDF file not found in storage at " + pdfKey));
            }

            byte[] pdfBytes = s3.downloadFile(pdfKey);

            // 1. Upload PDF
            externalOrderService.uploadReportToOmt(caseNumber, pdfBytes, fileName, externalToken);

            // 2. Update Status
            String customerNumber = report.getString("customerNumber");
            String contractNumber = report.getString("contractNumber");
            String vin = report.getString("vin");
            externalOrderService.updateOrderStatus(caseNumber, customerNumber, contractNumber, vin, externalToken);

            collection.updateOne(
                    Filters.and(Filters.eq("userEmail", targetEmail), Filters.eq("caseNumber", caseNumber)),
                    new Document("$set", new Document("omtSyncStatus", "SUCCESS")
                            .append("omtSyncError", null)));
            return ResponseEntity.ok(Map.of("message", "OMT sync successful"));
        } catch (Exception e) {
            collection.updateOne(
                    Filters.and(Filters.eq("userEmail", targetEmail), Filters.eq("caseNumber", caseNumber)),
                    new Document("$set", new Document("omtSyncStatus", "FAILED")
                            .append("omtSyncError", e.getMessage())));
            return ResponseEntity.status(502).body(Map.of("error", "OMT sync failed: " + e.getMessage()));
        }
    }

    /**
     * Helper to handle PDF versioning. Renames current file and adds to versions
     * list.
     */
    private String handlePdfVersioning(String caseNumber, MultipartFile pdf, String userEmail, String userName)
            throws IOException {
        String mainFileName = "Gutachten_" + caseNumber + ".pdf";
        String mainKey = s3Key(sanitizeEmail(userEmail), mainFileName);

        // Fetch existing report to check for versioning
        Document existingReport = collection.find(Filters.and(
                Filters.eq("userEmail", userEmail),
                Filters.eq("caseNumber", caseNumber))).first();

        if (existingReport != null && s3.exists(mainKey)) {
            ReportDTO reportDTO = objectMapper.convertValue(existingReport, ReportDTO.class);
            List<ReportVersionDTO> versions = reportDTO.getVersions();
            if (versions == null) {
                versions = new ArrayList<>();
            }

            // Copy existing main object to a versioned key
            int versionNum = versions.size() + 1;
            String versionFileName = "Gutachten_" + caseNumber + "_v" + versionNum + ".pdf";
            String versionKey = s3Key(sanitizeEmail(userEmail), versionFileName);
            s3.copyFile(mainKey, versionKey);

            // Add to versions list
            ReportVersionDTO versionDTO = new ReportVersionDTO();
            versionDTO.setVersion(versionNum);
            versionDTO.setPdfPath("/api/reports/photos/" + sanitizeEmail(userEmail) + "/" + versionFileName);
            versionDTO.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy, HH:mm:ss")));
            versionDTO.setCreatedBy(userName);
            versions.add(versionDTO);

            // Update versions in DB
            collection.updateOne(
                    Filters.and(Filters.eq("userEmail", userEmail), Filters.eq("caseNumber", caseNumber)),
                    new Document("$set", new Document("versions", objectMapper.convertValue(versions, List.class))));

            activityLogService.logChange(caseNumber, userEmail, userName, "Report", "Neue Version erstellt",
                    "Version " + versionNum + " erstellt, vorherige Version gespeichert");
        }

        // Save new PDF to S3 (main key)
        s3.uploadFile(mainKey, pdf.getBytes(), "application/pdf");
        return "/api/reports/photos/" + sanitizeEmail(userEmail) + "/" + mainFileName;
    }

    /**
     * Process a list of base64 images, save them to disk, and return a list of file
     * paths.
     */
    private List<String> processBase64ImageList(List<String> images, String prefix, String userEmail) {
        if (images == null || images.isEmpty())
            return images;

        List<String> processed = new ArrayList<>();
        for (int i = 0; i < images.size(); i++) {
            String data = images.get(i);
            if (data != null && data.startsWith("data:image")) {
                try {
                    String base64 = data.contains(",") ? data.substring(data.indexOf(",") + 1) : data;
                    byte[] imageBytes = Base64.getDecoder().decode(base64);

                    String extension = "jpg";
                    String contentType = "image/jpeg";
                    if (data.contains("image/png")) {
                        extension = "png";
                        contentType = "image/png";
                    } else if (data.contains("image/webp")) {
                        extension = "webp";
                        contentType = "image/webp";
                    }

                    String fileName = prefix + "_" + i + "_" + System.currentTimeMillis() + "." + extension;
                    s3.uploadFile(s3Key(sanitizeEmail(userEmail), fileName), imageBytes, contentType);

                    processed.add("/api/reports/photos/" + sanitizeEmail(userEmail) + "/" + fileName);
                } catch (Exception e) {
                    processed.add(data); // Fallback: keep base64
                }
            } else {
                processed.add(data); // Keep as is if not base64
            }
        }
        return processed;
    }

    // ─── Private helpers ───

    /**
     * Save photo base64 data to disk, replace data with filePath in the DTO.
     */
    private void processPhotos(List<PhotoDTO> photos, String userEmail) {
        for (PhotoDTO photo : photos) {
            String data = photo.getData();
            if (data != null && data.startsWith("data:image")) {
                // It's a base64 data URI — upload to S3
                try {
                    String base64 = data.contains(",") ? data.substring(data.indexOf(",") + 1) : data;
                    byte[] imageBytes = Base64.getDecoder().decode(base64);

                    String extension = "jpg";
                    String contentType = "image/jpeg";
                    if (data.contains("image/png")) {
                        extension = "png";
                        contentType = "image/png";
                    } else if (data.contains("image/webp")) {
                        extension = "webp";
                        contentType = "image/webp";
                    }

                    String fileName = photo.getId() + "." + extension;
                    s3.uploadFile(s3Key(sanitizeEmail(userEmail), fileName), imageBytes, contentType);

                    // Replace base64 data with the file path
                    photo.setFilePath("/api/reports/photos/" + sanitizeEmail(userEmail) + "/" + fileName);
                    photo.setData(null); // Don't store base64 in DB
                } catch (Exception e) {
                    // If saving fails, keep the base64 data in DB as fallback
                    System.err.println("Failed to save photo to S3: " + e.getMessage());
                }
            } else if (data != null && data.startsWith("/api/reports/photos/")) {
                // Already a file path — just keep it
                photo.setFilePath(data);
                photo.setData(null);
            }
        }
    }

    /**
     * Save signature base64 data to disk.
     */
    private void processSignatures(ReportDTO report, String userEmail) {
        var sigs = report.getSignatures();
        if (sigs.getDriver() != null && sigs.getDriver().startsWith("data:image")) {
            sigs.setDriver(saveSignatureFile(sigs.getDriver(), "sig_driver", userEmail));
        }
        if (sigs.getInspector() != null && sigs.getInspector().startsWith("data:image")) {
            sigs.setInspector(saveSignatureFile(sigs.getInspector(), "sig_inspector", userEmail));
        }
        if (sigs.getReceiver() != null && sigs.getReceiver().startsWith("data:image")) {
            sigs.setReceiver(saveSignatureFile(sigs.getReceiver(), "sig_receiver", userEmail));
        }
    }

    private String saveSignatureFile(String dataUri, String name, String userEmail) {
        try {
            String base64 = dataUri.contains(",") ? dataUri.substring(dataUri.indexOf(",") + 1) : dataUri;
            byte[] imageBytes = Base64.getDecoder().decode(base64);
            String fileName = name + ".png";
            s3.uploadFile(s3Key(sanitizeEmail(userEmail), fileName), imageBytes, "image/png");
            return "/api/reports/photos/" + sanitizeEmail(userEmail) + "/" + fileName;
        } catch (Exception e) {
            return dataUri; // Fallback: keep base64
        }
    }

    /**
     * When reading a report, rebuild the photo data URLs from file paths.
     */
    @SuppressWarnings("unchecked")
    private void enrichPhotosWithData(Document report, String userEmail) {
        List<Document> photos = (List<Document>) report.get("photos");
        if (photos != null) {
            for (Document photo : photos) {
                String filePath = photo.getString("filePath");
                if (filePath != null && !filePath.isEmpty()) {
                    // Set data to the server URL so frontend can display it
                    photo.put("data", filePath);
                }
            }
        }

        // Paint measurements
        List<Document> paintMeasurements = (List<Document>) report.get("paintMeasurements");
        if (paintMeasurements != null) {
            for (Document pm : paintMeasurements) {
                enrichImageList(pm, "images");
            }
        }

        // Other image fields

        enrichImageList(report, "lastRegistrationImages");
        enrichImageList(report, "mileageImages");
        enrichImageList(report, "nextHUImages");
        enrichImageList(report, "identificationImages");
        enrichImageList(report, "serviceheftImages");
        enrichImageList(report, "bordliteraturImages");
        enrichImageList(report, "keysImages");
        enrichImageList(report, "maintenanceImages");
        enrichImageList(report, "chargingCableImages");
        enrichImageList(report, "fzScheinImages");
        enrichImageList(report, "inspectedOnLiftImages");
        enrichImageList(report, "errorMemoryReadImages");
        enrichImageList(report, "hybridBatteryCheckedImages");
        enrichImageList(report, "noLiftingPlatformAvailableImages");
        enrichImageList(report, "inspectionFromAboveNotPossibleImages");
        enrichImageList(report, "inspectionFromBelowNotPossibleImages");
        enrichImageList(report, "vehicleWetImages");
        enrichImageList(report, "vehicleDirtyImages");
        enrichImageList(report, "testRunCarriedOutImages");
        enrichImageList(report, "equipmentListAvailableImages");
        enrichImageList(report, "deliveryConfirmationAvailableImages");
        enrichImageList(report, "environmentalBadgeImages");
        enrichImageList(report, "vehicleConditionImages");
        enrichImageList(report, "engineRunPerformedImages");
        enrichImageList(report, "inspectionFromAboveImages");
        enrichImageList(report, "inspectionFromBelowImages");

        // Tires
        List<Document> tires = (List<Document>) report.get("tires");
        if (tires != null) {
            for (Document tire : tires) {
                enrichImageList(tire, "images");
            }
        }

        // Second Tires
        List<Document> secondTires = (List<Document>) report.get("secondTires");
        if (secondTires != null) {
            for (Document tire : secondTires) {
                enrichImageList(tire, "images");
            }
        }

        // Minderwert rows
        List<Document> minderwertRows = (List<Document>) report.get("minderwertRows");
        if (minderwertRows != null) {
            for (Document row : minderwertRows) {
                enrichImageList(row, "images");
            }
        }

        // Damages
        List<Document> damages = (List<Document>) report.get("damages");
        if (damages != null) {
            for (Document d : damages) {
                enrichImageList(d, "images");
            }
        }

        // Spare tire
        Document spareTire = (Document) report.get("spareTire");
        if (spareTire != null) {
            enrichImageList(spareTire, "images");
        }

        // Equipment
        for (String eqField : new String[] { "breakdownKit", "firstAidKit", "safetyVest", "warningTriangle" }) {
            Document eq = (Document) report.get(eqField);
            if (eq != null) {
                enrichImageList(eq, "images");
            }
        }

        // Also enrich signatures
        Document sigs = (Document) report.get("signatures");
        if (sigs != null) {
            // Signatures stored as file paths — keep as-is since frontend will load via URL
            for (String key : new String[] { "driver", "inspector", "receiver" }) {
                String val = sigs.getString(key);
                if (val != null && val.startsWith("/api/")) {
                    // Already a path — keep it
                    sigs.put(key, val);
                }
            }
        }

        // Enrich authorized person photo
        String authPhoto = report.getString("authorizedPersonPhoto");
        if (authPhoto != null && authPhoto.startsWith("/api/")) {
            report.put("authorizedPersonPhoto", authPhoto);
        }
    }

    private void enrichImageList(Document doc, String fieldName) {
        List<String> images = (List<String>) doc.get(fieldName);
        if (images != null) {
            // MongoDB might return it as a different list type, but it handles paths fine.
            // If we need to convert paths to absolute, we'd do it here.
        }
    }

    private String sanitizeEmail(String email) {
        if (email == null)
            return "unknown";
        return email.toLowerCase().replaceAll("[^a-z0-9_-]", "_");
    }
}
