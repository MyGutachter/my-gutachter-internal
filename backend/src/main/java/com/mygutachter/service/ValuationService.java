package com.mygutachter.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mygutachter.model.DamageItemDTO;
import com.mygutachter.model.EquipmentItemDTO;
import com.mygutachter.model.MinderwertRowDTO;
import com.mygutachter.model.PaintMeasurementDTO;
import com.mygutachter.model.RateConfig;
import com.mygutachter.model.ReportDTO;
import com.mygutachter.model.TireInfoDTO;

@Service
public class ValuationService {

    private final MongoCollection<Document> collection;
    private final ObjectMapper objectMapper;
    private final DepreciationCalculationService depreciationService;

    @Autowired
    public ValuationService(MongoDatabase database,
                            ObjectMapper objectMapper,
                            DepreciationCalculationService depreciationService,
                            @Value("${mongodb.collections.rateConfig}") String collectionName) {
        this.collection = database.getCollection(collectionName);
        this.objectMapper = objectMapper;
        this.depreciationService = depreciationService;
    }

    /**
     * Calculates automatic depreciation rows based on vehicle state (keys, etc.)
     */
    public void clearPriceAndValuationFields(ReportDTO report) {
        report.setVehicleBaseValue(null);
        report.setPriceCategory(null);
        report.setMileageBucket(null);
        report.setDepreciationMatrixFactor(null);
        report.setFinalVehicleValue(null);
        report.setMaintenancePrice(null);

        if (report.getBreakdownKit() != null) {
            report.getBreakdownKit().setPrice(null);
        }
        if (report.getFirstAidKit() != null) {
            report.getFirstAidKit().setPrice(null);
        }
        if (report.getSafetyVest() != null) {
            report.getSafetyVest().setPrice(null);
        }
        if (report.getWarningTriangle() != null) {
            report.getWarningTriangle().setPrice(null);
        }
        if (report.getSpareTire() != null) {
            report.getSpareTire().setDepreciationValue(null);
            report.getSpareTire().setHubCapDepreciation(null);
        }
        if (report.getTires() != null) {
            for (TireInfoDTO tire : report.getTires()) {
                if (tire != null) {
                    tire.setDepreciationValue(null);
                    tire.setHubCapDepreciation(null);
                }
            }
        }
        if (report.getSecondTires() != null) {
            for (TireInfoDTO tire : report.getSecondTires()) {
                if (tire != null) {
                    tire.setDepreciationValue(null);
                    tire.setHubCapDepreciation(null);
                }
            }
        }
        if (report.getPaintMeasurements() != null) {
            for (PaintMeasurementDTO pm : report.getPaintMeasurements()) {
                if (pm != null) {
                    pm.setDepreciationValue(null);
                }
            }
        }
        if (report.getMinderwertRows() != null) {
            for (MinderwertRowDTO row : report.getMinderwertRows()) {
                if (row != null) {
                    row.setRepairCost(0.0);
                    row.setMinderwertBrutto(0.0);
                    row.setMinderwertNetto(0.0);
                    row.setSpareParts(0.0);
                }
            }
        }
        if (report.getSystemMinderwertRows() != null) {
            report.getSystemMinderwertRows().clear();
        } else {
            report.setSystemMinderwertRows(new ArrayList<>());
        }
        if (report.getDamages() != null) {
            for (DamageItemDTO dmg : report.getDamages()) {
                if (dmg != null) {
                    dmg.setRepairCostBrutto(0.0);
                    dmg.setMinderwertBrutto(0.0);
                    dmg.setMinderwertNetto(0.0);
                    dmg.setSpareParts(0.0);
                }
            }
        }
    }

    /**
     * Calculates automatic depreciation rows based on vehicle state (keys, etc.)
     */
    public void calculateAutomaticDevaluations(ReportDTO report) {
        if ("Fahrzeugbewertung".equalsIgnoreCase(report.getClaimType())) {
            clearPriceAndValuationFields(report);
            return;
        }

        RateConfig config = fetchConfig(report.getCustomerNumber());
        Map<String, Double> settings = config.getSystemSettings();

        // Default values if not in config
        double primaryDeduction = settings != null && settings.containsKey("primaryKeyDeduction") ? settings.get("primaryKeyDeduction") : 100.0;
        double spareDeduction = settings != null && settings.containsKey("spareKeyDeduction") ? settings.get("spareKeyDeduction") : 50.0;
        int requiredPrimary = settings != null && settings.containsKey("requiredPrimaryKeys") ? settings.get("requiredPrimaryKeys").intValue() : 2;
        int requiredSpare = settings != null && settings.containsKey("requiredSpareKeys") ? settings.get("requiredSpareKeys").intValue() : 1;

        List<MinderwertRowDTO> rows = report.getSystemMinderwertRows();
        if (rows == null) {
            rows = new ArrayList<>();
        } else {
            // Clear existing system-generated rows to avoid duplicates on re-save
            rows = new ArrayList<>(rows);
            rows.removeIf(row -> row.getId() != null && row.getId().startsWith("sys-"));
        }

        // 1. Keys Devaluation Calculation
        if (report.getActualKeysCount() != null) {
            int target = report.getTargetKeysCount() != null ? report.getTargetKeysCount() : 2;
            int actual = report.getActualKeysCount();
            if (actual > 0 && actual != target) {
                int missing = Math.max(0, target - actual);
                double deduction = missing > 0 ? missing * primaryDeduction : primaryDeduction;
                if (missing > 0) {
                    rows.add(createSystemRow("sys-keys-mismatch", "Schlüssel", "Abweichung",
                            "Tatsächlich: " + actual + " / Soll: " + target, deduction));
                }
            }
        } else {
            // Legacy Keys Logic
            // 1. Primary Keys
            int primaryPresent = report.getPrimaryKeysCount() != null ? report.getPrimaryKeysCount() : 0;
            if (primaryPresent < requiredPrimary) {
                int missing = requiredPrimary - primaryPresent;
                for (int i = 0; i < missing; i++) {
                    rows.add(createSystemRow("sys-key-primary-" + i, "Schlüssel", "Primärschlüssel",
                            "Fehlend", primaryDeduction));
                }
            }

            // 2. Spare Keys
            int sparePresent = report.getSpareKeysCount() != null ? report.getSpareKeysCount() : 0;
            if (sparePresent < requiredSpare) {
                rows.add(createSystemRow("sys-key-spare", "Schlüssel", "Ersatzschlüssel",
                        "Fehlend", spareDeduction));
            }
        }

        // 3. Equipment Deductions
        Map<String, Double> ep = config.getEquipmentPrices();
        if (ep != null) {
            addEquipmentRow(rows, report.getBreakdownKit(), "Breakdown Kit", "breakdown_kit", ep);
            addEquipmentRow(rows, report.getFirstAidKit(), "Verbandkasten", "first_aid_kit", ep);
            addEquipmentRow(rows, report.getSafetyVest(), "Warnweste", "safety_vest", ep);
            addEquipmentRow(rows, report.getWarningTriangle(), "Warndreieck", "warning_triangle", ep);
        }

        // 4. Maintenance Overdue
        Map<String, Double> mr = config.getMaintenanceRules();
        if (mr != null) {
            double maintenanceDepreciation = report.getMaintenancePrice() != null ? report.getMaintenancePrice() : 0;

            // Handle new flexible maintenance types
            if ("mileage".equals(report.getNextMaintenanceType()) && report.getNextMaintenanceIntervalValue() != null) {
                if (report.getNextMaintenanceIntervalValue() < 0) {
                    double overdueKmFactor = mr.getOrDefault("overdueKmFactor", 0.05);
                    maintenanceDepreciation += Math.abs(report.getNextMaintenanceIntervalValue()) * overdueKmFactor;
                }
            } else if ("days".equals(report.getNextMaintenanceType()) && report.getNextMaintenanceIntervalValue() != null) {
                if (report.getNextMaintenanceIntervalValue() < 0) {
                    double overdueDayFactor = mr.getOrDefault("overdueDayFactor", 1.0);
                    maintenanceDepreciation += Math.abs(report.getNextMaintenanceIntervalValue()) * overdueDayFactor;
                }
            } else if ("months".equals(report.getNextMaintenanceType()) && report.getNextMaintenanceIntervalValue() != null) {
                if (report.getNextMaintenanceIntervalValue() < 0) {
                    double overdueDayFactor = mr.getOrDefault("overdueDayFactor", 1.0);
                    maintenanceDepreciation += Math.abs(report.getNextMaintenanceIntervalValue()) * 30 * overdueDayFactor;
                }
            } else {
                // Fallback to legacy date/mileage fields if type is 'date' or not set
                // Mileage check
                if (report.getNextMaintenanceMileage() != null && report.getMileage() != null
                    && report.getNextMaintenanceMileage() < report.getMileage()) {
                    double overdueKmFactor = mr.getOrDefault("overdueKmFactor", 0.05);
                    maintenanceDepreciation += (report.getMileage() - report.getNextMaintenanceMileage()) * overdueKmFactor;
                }

                // Date check
                if (report.getNextMaintenanceDate() != null && !report.getNextMaintenanceDate().isEmpty()) {
                    try {
                        LocalDate nextDate = LocalDate.parse(report.getNextMaintenanceDate(), DateTimeFormatter.ISO_DATE);
                        LocalDate now = LocalDate.now();
                        if (nextDate.isBefore(now)) {
                            long daysOverdue = ChronoUnit.DAYS.between(nextDate, now);
                            double overdueDayFactor = mr.getOrDefault("overdueDayFactor", 1.0);
                            maintenanceDepreciation += daysOverdue * overdueDayFactor;
                        }
                    } catch (Exception e) {
                        // Ignore date parsing errors
                    }
                }
            }

            if (maintenanceDepreciation > 0) {
                rows.add(createSystemRow("sys-maint", "Wartung", "Service fällig", "Überfällig", maintenanceDepreciation));
            }
        }


        report.setSystemMinderwertRows(rows);

        // 6. Dynamic Vehicle Value Calculation
        calculateVehicleValue(report, config);
    }

    private void calculateVehicleValue(ReportDTO report, RateConfig config) {
        if (report.getVehicleBaseValue() == null || report.getVehicleBaseValue() <= 0) {
            return;
        }

        // Calculate Age in Months using the new centralized service
        int ageMonths = depreciationService.calculateVehicleAgeInMonths(report.getFirstRegistration(), report.getInspectionDate());
        if (ageMonths < 0) ageMonths = 0;

        int mileage = report.getMileage() != null ? report.getMileage() : 0;
        // Determine Mileage Bucket for traceability
        RateConfig.MileageBucket bucket = depreciationService.determineMileageBucket(mileage, config.getMileageBuckets());
        if (bucket != null) {
            report.setMileageBucket(bucket.getLabel());
        }

        // Find Matrix Factor using the new centralized service
        double matrixFactor = depreciationService.determineMatrixFactor(mileage, ageMonths, config.getDepreciationMatrix());

        // Find Price Category Factor
        double priceFactor = 1.0;
        Map<String, Double> priceFactors = config.getPriceCategoryFactors();
        if (priceFactors != null && report.getPriceCategory() != null) {
            priceFactor = priceFactors.getOrDefault(report.getPriceCategory(), 1.0);
        }

        double finalValue = report.getVehicleBaseValue() * matrixFactor * priceFactor;

        report.setDepreciationMatrixFactor(matrixFactor);
        report.setFinalVehicleValue(Math.round(finalValue * 100.0) / 100.0);
    }

    private void addEquipmentRow(List<MinderwertRowDTO> rows, EquipmentItemDTO item, String label, String keyPrefix, Map<String, Double> ep) {
        if (item == null) return;

        if ("Not available".equalsIgnoreCase(item.getStatus())) {
            double price = 0.0;
            if (item.getPrice() != null && item.getPrice() > 0.0) {
                price = item.getPrice();
            } else {
                price = ep.getOrDefault(keyPrefix + "_missing", 0.0);
                if (price == 0.0) {
                    if ("breakdown_kit".equals(keyPrefix)) price = 50.0;
                    else if ("first_aid_kit".equals(keyPrefix)) price = 25.0;
                    else if ("safety_vest".equals(keyPrefix)) price = 10.0;
                    else if ("warning_triangle".equals(keyPrefix)) price = 15.0;
                }
            }
            if (price > 0) {
                rows.add(createSystemRow("sys-equip-" + keyPrefix, "Zubehör", label, "Fehlend", price));
            }
        } else if ("Available".equalsIgnoreCase(item.getStatus()) && item.getExpirationDate() != null && !item.getExpirationDate().isEmpty()) {
             try {
                String dateStr = item.getExpirationDate().trim();
                if (dateStr.length() == 7) {
                    dateStr += "-01";
                }
                LocalDate expDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_DATE);
                if (expDate.isBefore(LocalDate.now())) {
                    double price = 0.0;
                    if (item.getPrice() != null && item.getPrice() > 0.0) {
                        price = item.getPrice();
                    } else {
                        price = ep.getOrDefault(keyPrefix + "_expired", 0.0);
                        if (price == 0.0) {
                            if ("breakdown_kit".equals(keyPrefix)) price = 30.0;
                            else if ("first_aid_kit".equals(keyPrefix)) {
                                double missingPrice = ep.getOrDefault("first_aid_kit_missing", 25.0);
                                if (missingPrice == 25.0 || missingPrice == 0.0) {
                                    price = 20.0;
                                } else {
                                    price = missingPrice;
                                }
                            }
                        }
                    }
                    if (price > 0) {
                        rows.add(createSystemRow("sys-equip-" + keyPrefix + "-exp", "Zubehör", label, "Abgelaufen", price));
                    }
                }
            } catch (Exception e) { /* ignore */ }
        }
    }

    private RateConfig fetchConfig(String customerNumber) {
        Document doc = null;
        if (customerNumber != null && !customerNumber.trim().isEmpty()) {
            doc = collection.find(Filters.and(
                    Filters.eq("type", "customer"),
                    Filters.eq("customerNumber", customerNumber),
                    Filters.eq("isActive", true)
            )).first();
        }

        if (doc == null) {
            doc = collection.find(Filters.eq("type", "global")).first();
        }

        if (doc == null) {
            return new RateConfig();
        }

        return objectMapper.convertValue(doc, RateConfig.class);
    }

    private MinderwertRowDTO createSystemRow(String id, String bodyPart, String label, String damage, double deduction) {
        MinderwertRowDTO row = new MinderwertRowDTO();
        row.setId(id);
        row.setBodyPart(bodyPart);
        row.setDamage(label + " " + damage);
        row.setRepairMethod("erneuern");
        row.setRepairCost(deduction / 1.19);
        row.setRepairCostBrutto(deduction);
        row.setMinderwertBrutto(deduction);
        row.setMinderwertNetto(deduction / 1.19);
        row.setAnrechnung("voll");
        row.setPresetType(2); // 100% full deduction
        row.setCustom(false);
        row.setReparaturweg("");
        row.setRepairCodeIndex(0);
        return row;
    }
}
