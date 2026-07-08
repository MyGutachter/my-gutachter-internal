package com.mygutachter.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DepreciationCalculateRequest {
    private String customerId;
    private String vehicleType;
    private String firstRegistration;
    private String inspectionDate;
    private Integer mileage;
    private Integer priceCategory;
    private Integer calculationType;
    private Double damageAmount;

    public DepreciationCalculateRequest() {}

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public String getFirstRegistration() { return firstRegistration; }
    public void setFirstRegistration(String firstRegistration) { this.firstRegistration = firstRegistration; }

    public String getInspectionDate() { return inspectionDate; }
    public void setInspectionDate(String inspectionDate) { this.inspectionDate = inspectionDate; }

    public Integer getMileage() { return mileage; }
    public void setMileage(Integer mileage) { this.mileage = mileage; }

    public Integer getPriceCategory() { return priceCategory; }
    public void setPriceCategory(Integer priceCategory) { this.priceCategory = priceCategory; }

    public Integer getCalculationType() { return calculationType; }
    public void setCalculationType(Integer calculationType) { this.calculationType = calculationType; }

    public Double getDamageAmount() { return damageAmount; }
    public void setDamageAmount(Double damageAmount) { this.damageAmount = damageAmount; }
}
