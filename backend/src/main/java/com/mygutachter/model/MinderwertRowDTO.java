package com.mygutachter.model;

public class MinderwertRowDTO {
    private String id;
    private String bodyPart;
    private String damage;
    private String repairMethod;
    private double repairCost;
    private int presetType;
    private boolean isCustom;
    private int repairCodeIndex;
    private java.util.List<String> images;
    private String anrechnung;
    private double minderwertBrutto;
    private double minderwertNetto;
    private double spareParts;
    private String reparaturweg;
    private String estimateRepairCodeId;

    public MinderwertRowDTO() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getBodyPart() {
        return bodyPart;
    }

    public void setBodyPart(String bodyPart) {
        this.bodyPart = bodyPart;
    }

    public String getDamage() {
        return damage;
    }

    public void setDamage(String damage) {
        this.damage = damage;
    }

    public String getRepairMethod() {
        return repairMethod;
    }

    public void setRepairMethod(String repairMethod) {
        this.repairMethod = repairMethod;
    }

    public double getRepairCost() {
        return repairCost;
    }

    public void setRepairCost(double repairCost) {
        this.repairCost = repairCost;
    }

    public int getPresetType() {
        return presetType;
    }

    public void setPresetType(int presetType) {
        this.presetType = presetType;
    }

    public boolean isCustom() {
        return isCustom;
    }

    public void setCustom(boolean isCustom) {
        this.isCustom = isCustom;
    }

    public int getRepairCodeIndex() {
        return repairCodeIndex;
    }

    public void setRepairCodeIndex(int repairCodeIndex) {
        this.repairCodeIndex = repairCodeIndex;
    }

    public java.util.List<String> getImages() {
        return images;
    }

    public void setImages(java.util.List<String> images) {
        this.images = images;
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

    public double getSpareParts() {
        return spareParts;
    }

    public void setSpareParts(double spareParts) {
        this.spareParts = spareParts;
    }

    public String getReparaturweg() {
        return reparaturweg;
    }

    public void setReparaturweg(String reparaturweg) {
        this.reparaturweg = reparaturweg;
    }

    private String repairType;
    private Double repairCostBrutto;
    private Double sparePartsBrutto;

    public String getRepairType() {
        return repairType;
    }

    public void setRepairType(String repairType) {
        this.repairType = repairType;
    }

    public Double getRepairCostBrutto() {
        return repairCostBrutto;
    }

    public void setRepairCostBrutto(Double repairCostBrutto) {
        this.repairCostBrutto = repairCostBrutto;
    }

    public Double getSparePartsBrutto() {
        return sparePartsBrutto;
    }

    public void setSparePartsBrutto(Double sparePartsBrutto) {
        this.sparePartsBrutto = sparePartsBrutto;
    }

    public String getEstimateRepairCodeId() {
        return estimateRepairCodeId;
    }

    public void setEstimateRepairCodeId(String estimateRepairCodeId) {
        this.estimateRepairCodeId = estimateRepairCodeId;
    }
}
