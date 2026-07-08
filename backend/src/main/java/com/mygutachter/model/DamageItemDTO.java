package com.mygutachter.model;

public class DamageItemDTO {
    private String id;
    private String description;
    private String repairMethod;
    private double repairCostBrutto;
    private String anrechnung;
    private double minderwertBrutto;
    private double minderwertNetto;
    private String imageRef;
    private java.util.List<String> images;
    private double spareParts;
    private String bodyPart;
    private String reparaturweg;
    private String estimateRepairCodeId;
    private int repairCodeIndex;
    private int presetType;
    private String type;

    public DamageItemDTO() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getRepairMethod() {
        return repairMethod;
    }

    public void setRepairMethod(String repairMethod) {
        this.repairMethod = repairMethod;
    }

    public double getRepairCostBrutto() {
        return repairCostBrutto;
    }

    public void setRepairCostBrutto(double repairCostBrutto) {
        this.repairCostBrutto = repairCostBrutto;
    }

    public String getAnrechnung() {
        return anrechnung;
    }

    public void setAnrechnung(String anrechnung) {
        this.anrechnung = anrechnung;
    }

    public double getMinderwertBrutto() {
        return minderwertBrutto;
    }

    public void setMinderwertBrutto(double minderwertBrutto) {
        this.minderwertBrutto = minderwertBrutto;
    }

    public double getMinderwertNetto() {
        return minderwertNetto;
    }

    public void setMinderwertNetto(double minderwertNetto) {
        this.minderwertNetto = minderwertNetto;
    }

    public String getImageRef() {
        return imageRef;
    }

    public void setImageRef(String imageRef) {
        this.imageRef = imageRef;
    }

    public java.util.List<String> getImages() {
        return images;
    }

    public void setImages(java.util.List<String> images) {
        this.images = images;
    }

    public double getSpareParts() {
        return spareParts;
    }

    public void setSpareParts(double spareParts) {
        this.spareParts = spareParts;
    }

    public String getBodyPart() {
        return bodyPart;
    }

    public void setBodyPart(String bodyPart) {
        this.bodyPart = bodyPart;
    }

    public String getReparaturweg() {
        return reparaturweg;
    }

    public void setReparaturweg(String reparaturweg) {
        this.reparaturweg = reparaturweg;
    }

    public int getRepairCodeIndex() {
        return repairCodeIndex;
    }

    public void setRepairCodeIndex(int repairCodeIndex) {
        this.repairCodeIndex = repairCodeIndex;
    }

    public int getPresetType() {
        return presetType;
    }

    public void setPresetType(int presetType) {
        this.presetType = presetType;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    private String repairType;

    public String getRepairType() {
        return repairType;
    }

    public void setRepairType(String repairType) {
        this.repairType = repairType;
    }

    public String getEstimateRepairCodeId() {
        return estimateRepairCodeId;
    }

    public void setEstimateRepairCodeId(String estimateRepairCodeId) {
        this.estimateRepairCodeId = estimateRepairCodeId;
    }
}
