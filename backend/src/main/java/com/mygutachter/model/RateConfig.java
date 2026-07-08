package com.mygutachter.model;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RateConfig {

    @JsonProperty("isActive")
    private Boolean isActive;

    @JsonProperty("customerNumber")
    private String customerNumber;

    @JsonProperty("customerName")
    private String customerName;

    @JsonProperty("type")
    private String type; // "global" or "customer"

    // New dynamic fields
    private List<String> vehicleCategories;
    private Map<String, Double> minderwertFactors;
    private Map<String, List<Double>> karosserieFactors;
    private Map<String, List<Double>> kunststoffFactors;
    private Map<String, Double> equipmentPrices;
    private Map<String, Double> maintenanceRules;
    private Map<String, Map<String, List<MinderwertRange>>> componentMinderwertTables; // Component -> Category ->
                                                                                       // Ranges

    private Map<String, Double> systemSettings;
    private List<String> allowedRolesToViewAllOrders;
    private List<RepairPosition> repairPositions;
    private List<RepairType> repairTypes;
    private List<RepairTableEntry> repairTable;

    // --- Dynamic Depreciation Matrix ---
    private List<DepreciationEntry> depreciationMatrix;
    private List<MileageBucket> mileageBuckets;
    private Map<String, Double> priceCategoryFactors;

    private String calculationType;
    private String calculationTypeText;
    private List<PriceCategoryEntry> priceCategoryEntries;

    // ── New Estimate Configuration (flat-price per component + repair code) ──
    private EstimateConfig estimateConfig;
    private List<DamageTypeOption> damageTypes;

    // ── Nested classes for EstimateConfig ────────────────────────────────────

    public static class EstimateConfig {
        private List<EstimateComponentConfig> components;
        private List<CustomRepairCode> customRepairCodes;

        public EstimateConfig() {}

        public List<EstimateComponentConfig> getComponents() { return components; }
        public void setComponents(List<EstimateComponentConfig> components) { this.components = components; }

        public List<CustomRepairCode> getCustomRepairCodes() { return customRepairCodes; }
        public void setCustomRepairCodes(List<CustomRepairCode> customRepairCodes) { this.customRepairCodes = customRepairCodes; }
    }

    public static class CustomRepairCode {
        private String id;
        private String labelDe;
        private String labelEn;

        public CustomRepairCode() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getLabelDe() { return labelDe; }
        public void setLabelDe(String labelDe) { this.labelDe = labelDe; }

        public String getLabelEn() { return labelEn; }
        public void setLabelEn(String labelEn) { this.labelEn = labelEn; }
    }

    public static class DamageTypeOption {
        private String value;
        private String labelDe;
        private String labelEn;

        public DamageTypeOption() {}

        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }

        public String getLabelDe() { return labelDe; }
        public void setLabelDe(String labelDe) { this.labelDe = labelDe; }

        public String getLabelEn() { return labelEn; }
        public void setLabelEn(String labelEn) { this.labelEn = labelEn; }
    }

    public static class EstimateComponentConfig {
        private String componentId;
        private String description;
        private List<EstimateRepairCodePrice> repairCodes;

        public EstimateComponentConfig() {}

        public String getComponentId() { return componentId; }
        public void setComponentId(String componentId) { this.componentId = componentId; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public List<EstimateRepairCodePrice> getRepairCodes() { return repairCodes; }
        public void setRepairCodes(List<EstimateRepairCodePrice> repairCodes) { this.repairCodes = repairCodes; }
    }

    public static class EstimateRepairCodePrice {
        private String repairCodeId;
        private Map<String, Double> priceByCategory;

        public EstimateRepairCodePrice() {}

        public String getRepairCodeId() { return repairCodeId; }
        public void setRepairCodeId(String repairCodeId) { this.repairCodeId = repairCodeId; }

        public Map<String, Double> getPriceByCategory() { return priceByCategory; }
        public void setPriceByCategory(Map<String, Double> priceByCategory) { this.priceByCategory = priceByCategory; }
    }

    public static class PriceCategoryEntry {
        private String key;
        private String label;
        private Double factor;

        public PriceCategoryEntry() {
        }

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public Double getFactor() {
            return factor;
        }

        public void setFactor(Double factor) {
            this.factor = factor;
        }
    }

    public static class DepreciationEntry {
        private String vehicleType;
        private Integer ageFrom; // months
        private Integer ageTo;
        private Integer mileageFrom; // km
        private Integer mileageTo;
        private Double factor;

        public DepreciationEntry() {
        }

        public String getVehicleType() {
            return vehicleType;
        }

        public void setVehicleType(String vehicleType) {
            this.vehicleType = vehicleType;
        }

        public Integer getAgeFrom() {
            return ageFrom;
        }

        public void setAgeFrom(Integer ageFrom) {
            this.ageFrom = ageFrom;
        }

        public Integer getAgeTo() {
            return ageTo;
        }

        public void setAgeTo(Integer ageTo) {
            this.ageTo = ageTo;
        }

        public Integer getMileageFrom() {
            return mileageFrom;
        }

        public void setMileageFrom(Integer mileageFrom) {
            this.mileageFrom = mileageFrom;
        }

        public Integer getMileageTo() {
            return mileageTo;
        }

        public void setMileageTo(Integer mileageTo) {
            this.mileageTo = mileageTo;
        }

        public Double getFactor() {
            return factor;
        }

        public void setFactor(Double factor) {
            this.factor = factor;
        }
    }

    public static class MileageBucket {
        private Integer from;
        private Integer to;
        private String label;

        public MileageBucket() {
        }

        public MileageBucket(Integer from, Integer to, String label) {
            this.from = from;
            this.to = to;
            this.label = label;
        }

        public Integer getFrom() {
            return from;
        }

        public void setFrom(Integer from) {
            this.from = from;
        }

        public Integer getTo() {
            return to;
        }

        public void setTo(Integer to) {
            this.to = to;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }
    }

    public static class RepairPosition {
        private String id;
        private String name;
        private Boolean active;

        public RepairPosition() {
        }

        public RepairPosition(String id, String name, Boolean active) {
            this.id = id;
            this.name = name;
            this.active = active;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Boolean getActive() {
            return active;
        }

        public void setActive(Boolean active) {
            this.active = active;
        }
    }

    public static class RepairType {
        private String id;
        private String name;
        private Boolean active;

        public RepairType() {
        }

        public RepairType(String id, String name, Boolean active) {
            this.id = id;
            this.name = name;
            this.active = active;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Boolean getActive() {
            return active;
        }

        public void setActive(Boolean active) {
            this.active = active;
        }
    }

    public static class RepairTableEntry {
        private String id;
        private String vehicleCategory;
        private String positionId;
        private String typeId;
        private Double defaultAmount;
        private String calculationRule; // "fixed", "percentage", "formula", etc.
        private Boolean active;

        public RepairTableEntry() {
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getVehicleCategory() {
            return vehicleCategory;
        }

        public void setVehicleCategory(String vehicleCategory) {
            this.vehicleCategory = vehicleCategory;
        }

        public String getPositionId() {
            return positionId;
        }

        public void setPositionId(String positionId) {
            this.positionId = positionId;
        }

        public String getTypeId() {
            return typeId;
        }

        public void setTypeId(String typeId) {
            this.typeId = typeId;
        }

        public Double getDefaultAmount() {
            return defaultAmount;
        }

        public void setDefaultAmount(Double defaultAmount) {
            this.defaultAmount = defaultAmount;
        }

        public String getCalculationRule() {
            return calculationRule;
        }

        public void setCalculationRule(String calculationRule) {
            this.calculationRule = calculationRule;
        }

        public Boolean getActive() {
            return active;
        }

        public void setActive(Boolean active) {
            this.active = active;
        }
    }

    public static class MinderwertRange {
        private Double min;
        private Double max;
        private Double value;

        public MinderwertRange() {
        }

        public MinderwertRange(Double min, Double max, Double value) {
            this.min = min;
            this.max = max;
            this.value = value;
        }

        public Double getMin() {
            return min;
        }

        public void setMin(Double min) {
            this.min = min;
        }

        public Double getMax() {
            return max;
        }

        public void setMax(Double max) {
            this.max = max;
        }

        public Double getValue() {
            return value;
        }

        public void setValue(Double value) {
            this.value = value;
        }
    }

    public RateConfig() {
    }

    public List<String> getVehicleCategories() {
        return vehicleCategories;
    }

    public void setVehicleCategories(List<String> vehicleCategories) {
        this.vehicleCategories = vehicleCategories;
    }

    public Map<String, Double> getMinderwertFactors() {
        return minderwertFactors;
    }

    public void setMinderwertFactors(Map<String, Double> minderwertFactors) {
        this.minderwertFactors = minderwertFactors;
    }

    public Map<String, List<Double>> getKarosserieFactors() {
        return karosserieFactors;
    }

    public void setKarosserieFactors(Map<String, List<Double>> karosserieFactors) {
        this.karosserieFactors = karosserieFactors;
    }

    public Map<String, List<Double>> getKunststoffFactors() {
        return kunststoffFactors;
    }

    public void setKunststoffFactors(Map<String, List<Double>> kunststoffFactors) {
        this.kunststoffFactors = kunststoffFactors;
    }

    public Map<String, Double> getEquipmentPrices() {
        return equipmentPrices;
    }

    public void setEquipmentPrices(Map<String, Double> equipmentPrices) {
        this.equipmentPrices = equipmentPrices;
    }

    public Map<String, Double> getMaintenanceRules() {
        return maintenanceRules;
    }

    public void setMaintenanceRules(Map<String, Double> maintenanceRules) {
        this.maintenanceRules = maintenanceRules;
    }

    public Map<String, Map<String, List<MinderwertRange>>> getComponentMinderwertTables() {
        return componentMinderwertTables;
    }

    public void setComponentMinderwertTables(
            Map<String, Map<String, List<MinderwertRange>>> componentMinderwertTables) {
        this.componentMinderwertTables = componentMinderwertTables;
    }

    public Map<String, Double> getSystemSettings() {
        return systemSettings;
    }

    public void setSystemSettings(Map<String, Double> systemSettings) {
        this.systemSettings = systemSettings;
    }

    public List<RepairPosition> getRepairPositions() {
        return repairPositions;
    }

    public void setRepairPositions(List<RepairPosition> repairPositions) {
        this.repairPositions = repairPositions;
    }

    public List<RepairType> getRepairTypes() {
        return repairTypes;
    }

    public void setRepairTypes(List<RepairType> repairTypes) {
        this.repairTypes = repairTypes;
    }

    public List<RepairTableEntry> getRepairTable() {
        return repairTable;
    }

    public void setRepairTable(List<RepairTableEntry> repairTable) {
        this.repairTable = repairTable;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public String getCustomerNumber() {
        return customerNumber;
    }

    public void setCustomerNumber(String customerNumber) {
        this.customerNumber = customerNumber;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<DepreciationEntry> getDepreciationMatrix() {
        return depreciationMatrix;
    }

    public void setDepreciationMatrix(List<DepreciationEntry> depreciationMatrix) {
        this.depreciationMatrix = depreciationMatrix;
    }

    public List<MileageBucket> getMileageBuckets() {
        return mileageBuckets;
    }

    public void setMileageBuckets(List<MileageBucket> mileageBuckets) {
        this.mileageBuckets = mileageBuckets;
    }

    public Map<String, Double> getPriceCategoryFactors() {
        return priceCategoryFactors;
    }

    public void setPriceCategoryFactors(Map<String, Double> priceCategoryFactors) {
        this.priceCategoryFactors = priceCategoryFactors;
    }

    public String getCalculationType() {
        return calculationType;
    }

    public void setCalculationType(String calculationType) {
        this.calculationType = calculationType;
    }

    public String getCalculationTypeText() {
        return calculationTypeText;
    }

    public void setCalculationTypeText(String calculationTypeText) {
        this.calculationTypeText = calculationTypeText;
    }

    public List<PriceCategoryEntry> getPriceCategoryEntries() {
        return priceCategoryEntries;
    }

    public void setPriceCategoryEntries(List<PriceCategoryEntry> priceCategoryEntries) {
        this.priceCategoryEntries = priceCategoryEntries;
    }

    public EstimateConfig getEstimateConfig() {
        return estimateConfig;
    }

    public void setEstimateConfig(EstimateConfig estimateConfig) {
        this.estimateConfig = estimateConfig;
    }

    public List<DamageTypeOption> getDamageTypes() {
        return damageTypes;
    }

    public void setDamageTypes(List<DamageTypeOption> damageTypes) {
        this.damageTypes = damageTypes;
    }

    public List<String> getAllowedRolesToViewAllOrders() {
        return allowedRolesToViewAllOrders;
    }

    public void setAllowedRolesToViewAllOrders(List<String> allowedRolesToViewAllOrders) {
        this.allowedRolesToViewAllOrders = allowedRolesToViewAllOrders;
    }

}
