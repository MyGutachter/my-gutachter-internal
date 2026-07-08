package com.mygutachter.model;

public class SpareTireDTO {
    private boolean present;
    private String designation;
    private String manufacturer;
    private String tireModel;
    private String type;
    private String treadDepth;
    private String dotNumber;
    private Double depreciationValue;
    private String rimType;
    private java.util.List<String> rimDamage;
    private String rimDamageDescription;
    private Double hubCapDepreciation;
    private java.util.List<String> images;

    private Boolean damaged;

    public SpareTireDTO() {
    }

    public Boolean getDamaged() {
        return damaged;
    }

    public void setDamaged(Boolean damaged) {
        this.damaged = damaged;
    }

    public String getRimType() {
        return rimType;
    }

    public void setRimType(String rimType) {
        this.rimType = rimType;
    }

    public java.util.List<String> getRimDamage() {
        return rimDamage;
    }

    public void setRimDamage(java.util.List<String> rimDamage) {
        this.rimDamage = rimDamage;
    }

    public boolean isPresent() {
        return present;
    }

    public void setPresent(boolean present) {
        this.present = present;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public void setManufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public String getTireModel() {
        return tireModel;
    }

    public void setTireModel(String tireModel) {
        this.tireModel = tireModel;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTreadDepth() {
        return treadDepth;
    }

    public void setTreadDepth(String treadDepth) {
        this.treadDepth = treadDepth;
    }

    public String getDotNumber() {
        return dotNumber;
    }

    public void setDotNumber(String dotNumber) {
        this.dotNumber = dotNumber;
    }

    public Double getDepreciationValue() {
        return depreciationValue;
    }

    public void setDepreciationValue(Double depreciationValue) {
        this.depreciationValue = depreciationValue;
    }

    public java.util.List<String> getImages() {
        return images;
    }

    public void setImages(java.util.List<String> images) {
        this.images = images;
    }

    public Double getHubCapDepreciation() {
        return hubCapDepreciation;
    }

    public void setHubCapDepreciation(Double hubCapDepreciation) {
        this.hubCapDepreciation = hubCapDepreciation;
    }

    public String getRimDamageDescription() {
        return rimDamageDescription;
    }

    public void setRimDamageDescription(String rimDamageDescription) {
        this.rimDamageDescription = rimDamageDescription;
    }
}
