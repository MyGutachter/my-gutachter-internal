package com.mygutachter.model;

import java.util.List;

public class PaintMeasurementDTO {
    private String id;
    private String bodyPart;
    private Double measuredMicrons; // Renamed from maxMicrons, removed minMicrons
    private Boolean damageKnown;
    private Boolean damageUnknown;
    private String repairDamage;
    private Double depreciationValue;
    private List<String> images;

    public PaintMeasurementDTO() {
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

    public Double getMeasuredMicrons() {
        return measuredMicrons;
    }

    public void setMeasuredMicrons(Double measuredMicrons) {
        this.measuredMicrons = measuredMicrons;
    }

    public Boolean getDamageKnown() {
        return damageKnown;
    }

    public void setDamageKnown(Boolean damageKnown) {
        this.damageKnown = damageKnown;
    }

    public Boolean getDamageUnknown() {
        return damageUnknown;
    }

    public void setDamageUnknown(Boolean damageUnknown) {
        this.damageUnknown = damageUnknown;
    }

    public String getRepairDamage() {
        return repairDamage;
    }

    public void setRepairDamage(String repairDamage) {
        this.repairDamage = repairDamage;
    }

    public Double getDepreciationValue() {
        return depreciationValue;
    }

    public void setDepreciationValue(Double depreciationValue) {
        this.depreciationValue = depreciationValue;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }
}
