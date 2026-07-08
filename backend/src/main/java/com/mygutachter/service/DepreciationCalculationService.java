package com.mygutachter.service;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mygutachter.model.DepreciationCalculateRequest;
import com.mygutachter.model.DepreciationCalculateResponse;
import com.mygutachter.model.RateConfig;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class DepreciationCalculationService {

    private static final DateTimeFormatter[] DATE_FORMATS = {
            DateTimeFormatter.ISO_DATE,
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd")
    };

    private final MongoCollection<Document> rateConfigCollection;
    private final ActivityLogService activityLogService;

    @Autowired
    public DepreciationCalculationService(MongoDatabase database,
            @Value("${mongodb.collections.rateConfig:rateConfig}") String rateConfigCollectionName,
            ActivityLogService activityLogService) {
        this.rateConfigCollection = database.getCollection(rateConfigCollectionName);
        this.activityLogService = activityLogService;
    }

    public DepreciationCalculateResponse calculateDepreciation(DepreciationCalculateRequest request) {
        // 1. Calculate Vehicle Age
        int vehicleAgeMonths = calculateVehicleAgeInMonths(request.getFirstRegistration(), request.getInspectionDate());

        // 2. Load Configuration (Multi-Tenant with Fallback)
        RateConfig config = loadConfig(request.getCustomerId());

        // 3. Find Mileage Bucket
        RateConfig.MileageBucket bucket = determineMileageBucket(request.getMileage(), config.getMileageBuckets());
        String mileageBucket = bucket != null ? bucket.getLabel() : "Unknown";

        double matrixFactor = determineMatrixFactor(request.getMileage(), vehicleAgeMonths,
                config.getDepreciationMatrix());

        // 5. Apply Price Category Factor
        double priceCategoryFactor = determinePriceCategoryFactor(request.getPriceCategory(),
                config.getPriceCategoryFactors());

        // 6. Apply Calculation Type & Calculate Final Factor
        double finalFactor = calculateFinalFactor(request.getCalculationType(), matrixFactor, priceCategoryFactor);

        // 7. Final Depreciation Amount
        double depreciationAmount = 0.0;
        if (request.getCalculationType() != null && request.getCalculationType() != 3) {
            depreciationAmount = request.getDamageAmount() != null ? request.getDamageAmount() * finalFactor : 0.0;
        }

        DepreciationCalculateResponse response = new DepreciationCalculateResponse();
        response.setVehicleAgeMonths(vehicleAgeMonths);
        response.setMileageBucket(mileageBucket);
        response.setMatrixFactor(matrixFactor);
        response.setPriceCategoryFactor(priceCategoryFactor);
        response.setFinalFactor(finalFactor);
        response.setDepreciationAmount(depreciationAmount);

        // 8. Logging
        logCalculationActivity(request, response);

        return response;
    }

    private RateConfig loadConfig(String customerId) {
        Document configDoc = null;

        if (customerId != null && !customerId.isEmpty()) {
            configDoc = rateConfigCollection.find(Filters.and(
                    Filters.eq("type", "customer"),
                    Filters.eq("customerNumber", customerId))).first();
        }

        if (configDoc == null || (configDoc.containsKey("isActive") && !configDoc.getBoolean("isActive"))) {
            configDoc = rateConfigCollection.find(Filters.eq("type", "global")).first();
        }

        if (configDoc != null) {
            try {
                // Manually map fields needed
                RateConfig config = new RateConfig();

                // Map mileage buckets
                if (configDoc.containsKey("mileageBuckets")) {
                    List<Document> mbDocs = configDoc.getList("mileageBuckets", Document.class);
                    if (mbDocs != null) {
                        List<RateConfig.MileageBucket> buckets = mbDocs.stream()
                                .map(d -> new RateConfig.MileageBucket(d.getInteger("from"), d.getInteger("to"),
                                        d.getString("label")))
                                .toList();
                        config.setMileageBuckets(buckets);
                    }
                }

                // Map depreciation matrix
                if (configDoc.containsKey("depreciationMatrix")) {
                    List<Document> dmDocs = configDoc.getList("depreciationMatrix", Document.class);
                    if (dmDocs != null) {
                        List<RateConfig.DepreciationEntry> matrix = dmDocs.stream()
                                .map(d -> {
                                    RateConfig.DepreciationEntry e = new RateConfig.DepreciationEntry();
                                    e.setVehicleType(d.getString("vehicleType"));
                                    e.setAgeFrom(d.getInteger("ageFrom"));
                                    e.setAgeTo(d.getInteger("ageTo"));
                                    e.setMileageFrom(d.getInteger("mileageFrom"));
                                    e.setMileageTo(d.getInteger("mileageTo"));
                                    Object factorObj = d.get("factor");
                                    if (factorObj instanceof Double)
                                        e.setFactor((Double) factorObj);
                                    else if (factorObj instanceof Integer)
                                        e.setFactor(((Integer) factorObj).doubleValue());
                                    return e;
                                })
                                .toList();
                        config.setDepreciationMatrix(matrix);
                    }
                }

                // Map price category factors
                if (configDoc.containsKey("priceCategoryFactors")) {
                    Document pcfDoc = (Document) configDoc.get("priceCategoryFactors");
                    if (pcfDoc != null) {
                        Map<String, Double> factors = new java.util.HashMap<>();
                        for (String key : pcfDoc.keySet()) {
                            Object val = pcfDoc.get(key);
                            if (val instanceof Double)
                                factors.put(key, (Double) val);
                            else if (val instanceof Integer)
                                factors.put(key, ((Integer) val).doubleValue());
                        }
                        config.setPriceCategoryFactors(factors);
                    }
                }
                return config;
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return new RateConfig();
    }

    private double determinePriceCategoryFactor(Integer priceCategory, Map<String, Double> factors) {
        if (priceCategory == null || factors == null)
            return 1.0;
        return factors.getOrDefault(String.valueOf(priceCategory), 1.0);
    }

    private double calculateFinalFactor(Integer calculationType, double matrixFactor, double priceCategoryFactor) {
        if (calculationType == null)
            return matrixFactor * priceCategoryFactor;

        switch (calculationType) {
            case 2: // Type 2 -> 100%
                return 1.0;
            case 3: // Type 3 -> Text Only
                return 0.0;
            case 1: // Type 1 -> Normal
            default:
                return matrixFactor * priceCategoryFactor;
        }
    }

    private void logCalculationActivity(DepreciationCalculateRequest request, DepreciationCalculateResponse response) {
        try {
            String additionalInfo = String.format("Request: %s, Response: Age=%d, Bucket=%s, Factor=%.3f, Amount=%.2f",
                    request.getCustomerId(), response.getVehicleAgeMonths(), response.getMileageBucket(),
                    response.getFinalFactor(), response.getDepreciationAmount());

            activityLogService.logChange("System", "System", "System", "Depreciation", "Calculate", additionalInfo);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public int calculateVehicleAgeInMonths(String firstRegistration, String inspectionDate) {
        if (firstRegistration == null || firstRegistration.isEmpty())
            return 0;

        LocalDate reg = parseDate(firstRegistration);
        LocalDate insp = inspectionDate != null && !inspectionDate.isEmpty() ? parseDate(inspectionDate)
                : LocalDate.now();

        if (reg == null)
            return 0;

        long months = ChronoUnit.MONTHS.between(reg.withDayOfMonth(1), insp.withDayOfMonth(1));

        return (int) Math.max(0, months);
    }

    public RateConfig.MileageBucket determineMileageBucket(Integer mileage, List<RateConfig.MileageBucket> buckets) {
        if (buckets == null || buckets.isEmpty() || mileage == null)
            return null;

        return buckets.stream()
                .filter(b -> (b.getFrom() == null || mileage >= b.getFrom())
                        && (b.getTo() == null || mileage <= b.getTo()))
                .findFirst()
                .orElse(null);
    }

    public double determineMatrixFactor(Integer mileage, int ageMonths,
            List<RateConfig.DepreciationEntry> matrix) {
        if (matrix == null || matrix.isEmpty() || mileage == null)
            return 1.0;

        Optional<RateConfig.DepreciationEntry> match = matrix.stream()
                .filter(entry -> {
                    boolean ageMatch = (entry.getAgeFrom() == null || ageMonths >= entry.getAgeFrom())
                            && (entry.getAgeTo() == null || ageMonths <= entry.getAgeTo());
                    boolean mileageMatch = (entry.getMileageFrom() == null || mileage >= entry.getMileageFrom())
                            && (entry.getMileageTo() == null || mileage <= entry.getMileageTo());
                    return ageMatch && mileageMatch;
                })
                .findFirst();

        return match.map(RateConfig.DepreciationEntry::getFactor).orElse(1.0);
    }

    private LocalDate parseDate(String dateStr) {
        for (DateTimeFormatter dtf : DATE_FORMATS) {
            try {
                return LocalDate.parse(dateStr, dtf);
            } catch (Exception e) {
                // Try next format
            }
        }
        return null;
    }
}
