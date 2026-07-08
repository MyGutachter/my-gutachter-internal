package com.mygutachter.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.bson.types.ObjectId;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DepreciationMatrix {
    private ObjectId id;
    private String customerId;
    private String vehicleType;
    private Integer kmFrom;
    private Integer kmTo;
    private Integer monthFrom;
    private Integer monthTo;
    private Double factorPercent;

    public DepreciationMatrix() {}

    public ObjectId getId() { return id; }
    public void setId(ObjectId id) { this.id = id; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public Integer getKmFrom() { return kmFrom; }
    public void setKmFrom(Integer kmFrom) { this.kmFrom = kmFrom; }

    public Integer getKmTo() { return kmTo; }
    public void setKmTo(Integer kmTo) { this.kmTo = kmTo; }

    public Integer getMonthFrom() { return monthFrom; }
    public void setMonthFrom(Integer monthFrom) { this.monthFrom = monthFrom; }

    public Integer getMonthTo() { return monthTo; }
    public void setMonthTo(Integer monthTo) { this.monthTo = monthTo; }

    public Double getFactorPercent() { return factorPercent; }
    public void setFactorPercent(Double factorPercent) { this.factorPercent = factorPercent; }
}
