package com.mygutachter.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DepreciationCalculateResponse {
    private Integer vehicleAgeMonths;
    private String mileageBucket;
    private Double matrixFactor;
    private Double priceCategoryFactor;
    private Double finalFactor;
    private Double depreciationAmount;

    public DepreciationCalculateResponse() {}

    public Integer getVehicleAgeMonths() { return vehicleAgeMonths; }
    public void setVehicleAgeMonths(Integer vehicleAgeMonths) { this.vehicleAgeMonths = vehicleAgeMonths; }

    public String getMileageBucket() { return mileageBucket; }
    public void setMileageBucket(String mileageBucket) { this.mileageBucket = mileageBucket; }

    public Double getMatrixFactor() { return matrixFactor; }
    public void setMatrixFactor(Double matrixFactor) { this.matrixFactor = matrixFactor; }

    public Double getPriceCategoryFactor() { return priceCategoryFactor; }
    public void setPriceCategoryFactor(Double priceCategoryFactor) { this.priceCategoryFactor = priceCategoryFactor; }

    public Double getFinalFactor() { return finalFactor; }
    public void setFinalFactor(Double finalFactor) { this.finalFactor = finalFactor; }

    public Double getDepreciationAmount() { return depreciationAmount; }
    public void setDepreciationAmount(Double depreciationAmount) { this.depreciationAmount = depreciationAmount; }
}
