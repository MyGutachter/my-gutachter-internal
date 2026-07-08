package com.mygutachter.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

/**
 * Slim response DTO returned by the VIN-lookup API endpoint.
 *
 * <p>
 * Contains only the fields required by the front-end:
 * 
 * <pre>
 * {
 *   "manufacturer":       "BMW",
 *   "baseModel":          "M4 Coupe (G82)(2020->)",
 *   "subModel":           "xDrive Competition",
 *   "datECode":           "011305320040001",
 *   "kbaNumbers":         "7909/ADA, 7909/ADB",
 *   "constructionTime":   "2021",
 *   "standardEquipment":  [ "Ablage-Paket", ... ],
 *   "optionalEquipment":  [ "Aktive Sitzbelüftung vorn", ... ],
 *   "standardColor":      "9",
 *   "colorData":          { "A1": "475", "I1": "LKSW", ... }
 * }
 * </pre>
 *
 * Built from a fully-parsed {@link VehicleIdentification} via
 * {@link VehicleResponse#from(VehicleIdentification)}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VehicleResponse {

    private String manufacturer;
    private String baseModel;
    private String subModel;
    private String datECode;
    private String kbaNumbers; // comma-joined list
    private String constructionTime;
    private List<String> standardEquipment;
    private List<String> optionalEquipment;
    private String standardColor;
    private Map<String, String> colorData;
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

    // ── Factory ───────────────────────────────────────────────────────────────

    /**
     * Copies all fields directly from the flat {@link VehicleIdentification} DTO.
     * All joining / color-data extraction is already done in
     * {@link com.mygutachter.service.DatService#parseVehicleXml}.
     *
     * @param vi source object (never {@code null})
     * @return populated {@link VehicleResponse}
     */
    public static VehicleResponse from(VehicleIdentification vi) {
        VehicleResponse r = new VehicleResponse();

        r.manufacturer = vi.getManufacturer();
        r.baseModel = vi.getBaseModel();
        r.subModel = vi.getSubModel();
        r.datECode = vi.getDatECode();
        r.constructionTime = vi.getConstructionTime();
        r.kbaNumbers = vi.getKbaNumbers();
        r.standardEquipment = vi.getStandardEquipment();
        r.optionalEquipment = vi.getOptionalEquipment();
        r.standardColor = vi.getStandardColor();
        r.colorData = vi.getColorData();

        r.powerKw = vi.getPowerKw();
        r.displacement = vi.getDisplacement();
        r.cylinders = vi.getCylinders();
        r.fuelType = vi.getFuelType();
        r.transmission = vi.getTransmission();
        r.driveType = vi.getDriveType();
        r.emissionClass = vi.getEmissionClass();
        r.bodyType = vi.getBodyType();
        r.doors = vi.getDoors();
        r.seats = vi.getSeats();

        return r;
    }

    // ── Getters / Setters ─────────────────────────────────────────────────────

    public String getManufacturer() {
        return manufacturer;
    }

    public void setManufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public String getBaseModel() {
        return baseModel;
    }

    public void setBaseModel(String baseModel) {
        this.baseModel = baseModel;
    }

    public String getSubModel() {
        return subModel;
    }

    public void setSubModel(String subModel) {
        this.subModel = subModel;
    }

    public String getDatECode() {
        return datECode;
    }

    public void setDatECode(String datECode) {
        this.datECode = datECode;
    }

    public String getKbaNumbers() {
        return kbaNumbers;
    }

    public void setKbaNumbers(String kbaNumbers) {
        this.kbaNumbers = kbaNumbers;
    }

    public String getConstructionTime() {
        return constructionTime;
    }

    public void setConstructionTime(String constructionTime) {
        this.constructionTime = constructionTime;
    }

    public List<String> getStandardEquipment() {
        return standardEquipment;
    }

    public void setStandardEquipment(List<String> standardEquipment) {
        this.standardEquipment = standardEquipment;
    }

    public List<String> getOptionalEquipment() {
        return optionalEquipment;
    }

    public void setOptionalEquipment(List<String> optionalEquipment) {
        this.optionalEquipment = optionalEquipment;
    }

    public String getStandardColor() {
        return standardColor;
    }

    public void setStandardColor(String standardColor) {
        this.standardColor = standardColor;
    }

    public Map<String, String> getColorData() {
        return colorData;
    }

    public void setColorData(Map<String, String> colorData) {
        this.colorData = colorData;
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
