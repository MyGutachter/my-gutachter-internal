package com.mygutachter.model;

import java.util.List;
import java.util.Map;

public class VehicleIdentification {
    private String manufacturer;
    private String baseModel;
    private String subModel;
    private String datECode;
    private String constructionTime;
    private String kbaNumbers;
    private List<String> standardEquipment;
    private List<String> optionalEquipment;
    private Map<String, String> colorData;
    private String standardColor;
    private Integer powerKw;
    private Integer displacement;
    private Integer cylinders;
    private String fuelType;
    private String transmission;
    private String driveType;
    private String emissionClass;
    private String bodyType;
    private Integer doors;
    private Integer seats;

    public String getManufacturer() {
        return manufacturer;
    }

    public void setManufacturer(String v) {
        this.manufacturer = v;
    }

    public String getBaseModel() {
        return baseModel;
    }

    public void setBaseModel(String v) {
        this.baseModel = v;
    }

    public String getSubModel() {
        return subModel;
    }

    public void setSubModel(String v) {
        this.subModel = v;
    }

    public String getDatECode() {
        return datECode;
    }

    public void setDatECode(String v) {
        this.datECode = v;
    }

    public String getConstructionTime() {
        return constructionTime;
    }

    public void setConstructionTime(String v) {
        this.constructionTime = v;
    }

    public String getKbaNumbers() {
        return kbaNumbers;
    }

    public void setKbaNumbers(String v) {
        this.kbaNumbers = v;
    }

    public List<String> getStandardEquipment() {
        return standardEquipment;
    }

    public void setStandardEquipment(List<String> v) {
        this.standardEquipment = v;
    }

    public List<String> getOptionalEquipment() {
        return optionalEquipment;
    }

    public void setOptionalEquipment(List<String> v) {
        this.optionalEquipment = v;
    }

    public Map<String, String> getColorData() {
        return colorData;
    }

    public void setColorData(Map<String, String> v) {
        this.colorData = v;
    }

    public String getStandardColor() {
        return standardColor;
    }

    public void setStandardColor(String v) {
        this.standardColor = v;
    }

    public Integer getPowerKw() {
        return powerKw;
    }

    public void setPowerKw(Integer powerKw) {
        this.powerKw = powerKw;
    }

    public Integer getDisplacement() {
        return displacement;
    }

    public void setDisplacement(Integer displacement) {
        this.displacement = displacement;
    }

    public Integer getCylinders() {
        return cylinders;
    }

    public void setCylinders(Integer cylinders) {
        this.cylinders = cylinders;
    }

    public String getFuelType() {
        return fuelType;
    }

    public void setFuelType(String fuelType) {
        this.fuelType = fuelType;
    }

    public String getTransmission() {
        return transmission;
    }

    public void setTransmission(String transmission) {
        this.transmission = transmission;
    }

    public String getDriveType() {
        return driveType;
    }

    public void setDriveType(String driveType) {
        this.driveType = driveType;
    }

    public String getEmissionClass() {
        return emissionClass;
    }

    public void setEmissionClass(String emissionClass) {
        this.emissionClass = emissionClass;
    }

    public String getBodyType() {
        return bodyType;
    }

    public void setBodyType(String bodyType) {
        this.bodyType = bodyType;
    }

    public Integer getDoors() {
        return doors;
    }

    public void setDoors(Integer doors) {
        this.doors = doors;
    }

    public Integer getSeats() {
        return seats;
    }

    public void setSeats(Integer seats) {
        this.seats = seats;
    }
}
