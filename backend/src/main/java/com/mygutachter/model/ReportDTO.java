package com.mygutachter.model;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Master DTO for all report data — mirrors frontend ReportData type.
 * A single document per user in the 'reports' collection.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ReportDTO {

    // ─── Internal ───
    private String userEmail;
    private String createdAt;

    // ─── Step 1: Order Info ───
    private String caseNumber;
    private String licensePlate;
    private String customerNumber;
    private String customerEmail;
    private String contractNumber;
    private String claimType;
    private String concernType;
    private String concernCompany;
    private String clientName;
    private String contactPersonName;
    private String clientAddress;
    private String clientStreet;
    private String clientHouseNumber;
    private String clientZip;
    private String clientCity;
    private String orderDate;
    private String inspectionDate;
    private String inspectionTime;
    private String inspectionLocation;
    private String inspectorName;
    private String valuationDate;
    private String intranetCustomerId;

    // ─── Step 2: Vehicle Identification ───
    private String vin;
    private String manufacturer;
    private String baseModel;
    private String subModel;
    private String datECode;
    private String kbaNumbers;
    private String firstRegistration;
    private String lastRegistration;
    private String bodyType;
    private Integer doors;
    private Integer seats;
    private String keyNumber;
    private Integer mileage;
    private String nextHU;
    private String fuelType;
    private Integer cylinders;
    private Integer powerKw;
    private Integer displacement;
    private String emissionClass;
    private String driveType;
    private String transmission;
    private String wheels;
    private String colorDescription;
    private String upholsteryDescription;
    private List<String> standardEquipment;
    private List<String> optionalEquipment;

    private List<String> lastRegistrationImages;
    private List<String> mileageImages;
    private List<String> nextHUImages;
    private List<String> identificationImages;

    // ─── Config ───

    private String vehicleCategory;
    private String audatexHaupttyp;

    // ─── Step 3: Condition ───
    private String testDriveDone;
    private String liftingPlatformStatus;
    private Boolean errorMemoryRead;
    private Boolean hybridBatteryChecked;
    private Integer keysPresent;
    private Integer primaryKeysCount;
    private Integer spareKeysCount;
    private Integer targetKeysCount;
    private Integer actualKeysCount;
    private Integer workshopKeysCount;
    private Integer remoteControlsCount;
    private List<String> documentsPresent;
    private String registrationCertificateStatus;
    private Boolean registrationCertificateSubmittedLater;
    private String serviceBookletStatus;
    private Boolean serviceBookletSubmittedLater;
    private String operatingManualStatus;
    private Boolean operatingManualSubmittedLater;
    private String environmentalBadgeStatus;
    private Boolean environmentalBadgeSubmittedLater;
    private List<String> environmentalBadgeImages;
    private String additionalNotes;
    private Boolean noPaintIssuesDetected;
    private List<PaintMeasurementDTO> paintMeasurements;
    private List<TireInfoDTO> tires;
    private SpareTireDTO spareTire;
    private EquipmentItemDTO breakdownKit;
    private EquipmentItemDTO firstAidKit;
    private EquipmentItemDTO safetyVest;
    private EquipmentItemDTO warningTriangle;
    private String nextMaintenanceDate;
    private Integer nextMaintenanceMileage;
    private String nextMaintenanceType;
    private Integer nextMaintenanceIntervalValue;
    private String maintenanceStatus;
    private Double maintenancePrice;
    private String tireConfiguration; // '2-axle', '3-axle', '2-axle-twin', '3-axle-twin'
    private String chargingCable;
    private List<String> fzScheinImages;
    private List<String> errorMemoryReadImages;
    private List<String> hybridBatteryCheckedImages;
    private List<String> inspectionFromAboveImages;
    private List<String> inspectionFromBelowImages;
    private List<String> vehicleConditionImages;
    private List<String> equipmentListAvailableImages;
    private List<String> deliveryConfirmationAvailableImages;
    private List<String> serviceheftImages;
    private List<String> bordliteraturImages;
    private List<String> keysImages;
    private List<String> maintenanceImages;
    private List<String> engineRunPerformedImages;

    private Boolean inspectionFromAbove;
    private Boolean inspectionFromBelow;
    private String vehicleConditionStatus;
    private String engineRunPerformed;
    private String engineRunStatus;
    private String engineRunNoise;
    private String engineRunRoughRunning;
    private String engineRunWarningLightsActive;
    private String engineRunWarningLightsDetails;
    private String engineRunOtherIssues;
    private String equipmentListAvailable;
    private Boolean deliveryConfirmationAvailable;

    // ─── Step 3b: Body Diagram ───
    private Map<String, BodyPartDamageDTO> bodyPartDamages;

    // ─── Step 3c: Minderwert ───
    private List<MinderwertRowDTO> minderwertRows;
    private List<MinderwertRowDTO> systemMinderwertRows;

    // ─── Step 4: Damages ───
    private List<DamageItemDTO> damages;

    // ─── Photos ───
    private List<PhotoDTO> photos;

    // ─── Signatures ───
    private SignaturesDTO signatures;
    private SignatureNamesDTO signatureNames;
    private String expertAssessmentStatus;
    private List<SendLogDTO> sendLogs;
    private List<ReportVersionDTO> versions;

    private Boolean hasSecondTireSet;
    private String secondTireSetSelection;
    private List<TireInfoDTO> secondTires;

    // ─── New Signature Metadata ───
    private Boolean isAuthorizedPerson;
    private String authorizedPersonName;
    private String authorizedPersonPhoto;
    private Boolean customerPresent;

    // ─── Status & Sync ───
    private String status; // OPEN, COMPLETED
    private String omtSyncStatus; // PENDING, SUCCESS, FAILED
    private String omtSyncError;
    private String omtId;
    private String pdfPath;
    private Double vehicleBaseValue;
    private String priceCategory;
    private String mileageBucket;
    private Double depreciationMatrixFactor;
    private Double finalVehicleValue;
    private List<String> videoExpertImages;

    public ReportDTO() {
    }

    // ─── Getters & Setters ───

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getCaseNumber() {
        return caseNumber;
    }

    public void setCaseNumber(String caseNumber) {
        this.caseNumber = caseNumber;
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public void setLicensePlate(String licensePlate) {
        this.licensePlate = licensePlate;
    }

    public String getCustomerNumber() {
        return customerNumber;
    }

    public void setCustomerNumber(String customerNumber) {
        this.customerNumber = customerNumber;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getContractNumber() {
        return contractNumber;
    }

    public void setContractNumber(String contractNumber) {
        this.contractNumber = contractNumber;
    }

    public String getClaimType() {
        return claimType;
    }

    public void setClaimType(String claimType) {
        this.claimType = claimType;
    }

    public String getConcernType() {
        return concernType;
    }

    public void setConcernType(String concernType) {
        this.concernType = concernType;
    }

    public String getConcernCompany() {
        return concernCompany;
    }

    public void setConcernCompany(String concernCompany) {
        this.concernCompany = concernCompany;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getClientAddress() {
        return clientAddress;
    }

    public void setClientAddress(String clientAddress) {
        this.clientAddress = clientAddress;
    }

    public String getClientStreet() {
        return clientStreet;
    }

    public void setClientStreet(String clientStreet) {
        this.clientStreet = clientStreet;
    }

    public String getClientHouseNumber() {
        return clientHouseNumber;
    }

    public void setClientHouseNumber(String clientHouseNumber) {
        this.clientHouseNumber = clientHouseNumber;
    }

    public String getClientZip() {
        return clientZip;
    }

    public void setClientZip(String clientZip) {
        this.clientZip = clientZip;
    }

    public String getClientCity() {
        return clientCity;
    }

    public void setClientCity(String clientCity) {
        this.clientCity = clientCity;
    }

    public String getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(String orderDate) {
        this.orderDate = orderDate;
    }

    public String getInspectionDate() {
        return inspectionDate;
    }

    public void setInspectionDate(String inspectionDate) {
        this.inspectionDate = inspectionDate;
    }

    public String getInspectionTime() {
        return inspectionTime;
    }

    public void setInspectionTime(String inspectionTime) {
        this.inspectionTime = inspectionTime;
    }

    public String getInspectionLocation() {
        return inspectionLocation;
    }

    public void setInspectionLocation(String inspectionLocation) {
        this.inspectionLocation = inspectionLocation;
    }

    public String getInspectorName() {
        return inspectorName;
    }

    public void setInspectorName(String inspectorName) {
        this.inspectorName = inspectorName;
    }

    public String getValuationDate() {
        return valuationDate;
    }

    public void setValuationDate(String valuationDate) {
        this.valuationDate = valuationDate;
    }

    public String getVin() {
        return vin;
    }

    public void setVin(String vin) {
        this.vin = vin != null ? vin.toUpperCase() : null;
    }

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

    public String getFirstRegistration() {
        return firstRegistration;
    }

    public void setFirstRegistration(String firstRegistration) {
        this.firstRegistration = firstRegistration;
    }

    public String getLastRegistration() {
        return lastRegistration;
    }

    public void setLastRegistration(String lastRegistration) {
        this.lastRegistration = lastRegistration;
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

    public String getKeyNumber() {
        return keyNumber;
    }

    public void setKeyNumber(String keyNumber) {
        this.keyNumber = keyNumber;
    }

    public Integer getMileage() {
        return mileage;
    }

    public void setMileage(Integer mileage) {
        this.mileage = mileage;
    }

    public String getNextHU() {
        return nextHU;
    }

    public void setNextHU(String nextHU) {
        this.nextHU = nextHU;
    }

    public String getFuelType() {
        return fuelType;
    }

    public void setFuelType(String fuelType) {
        this.fuelType = fuelType;
    }

    public Integer getCylinders() {
        return cylinders;
    }

    public void setCylinders(Integer cylinders) {
        this.cylinders = cylinders;
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

    public String getEmissionClass() {
        return emissionClass;
    }

    public void setEmissionClass(String emissionClass) {
        this.emissionClass = emissionClass;
    }

    public String getDriveType() {
        return driveType;
    }

    public void setDriveType(String driveType) {
        this.driveType = driveType;
    }

    public String getTransmission() {
        return transmission;
    }

    public void setTransmission(String transmission) {
        this.transmission = transmission;
    }

    public String getWheels() {
        return wheels;
    }

    public void setWheels(String wheels) {
        this.wheels = wheels;
    }

    public String getColorDescription() {
        return colorDescription;
    }

    public void setColorDescription(String colorDescription) {
        this.colorDescription = colorDescription;
    }

    public String getUpholsteryDescription() {
        return upholsteryDescription;
    }

    public void setUpholsteryDescription(String upholsteryDescription) {
        this.upholsteryDescription = upholsteryDescription;
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

    public List<String> getLastRegistrationImages() {
        return lastRegistrationImages;
    }

    public void setLastRegistrationImages(List<String> lastRegistrationImages) {
        this.lastRegistrationImages = lastRegistrationImages;
    }

    public List<String> getMileageImages() {
        return mileageImages;
    }

    public void setMileageImages(List<String> mileageImages) {
        this.mileageImages = mileageImages;
    }

    public List<String> getNextHUImages() {
        return nextHUImages;
    }

    public void setNextHUImages(List<String> nextHUImages) {
        this.nextHUImages = nextHUImages;
    }

    public List<String> getIdentificationImages() {
        return identificationImages;
    }

    public void setIdentificationImages(List<String> identificationImages) {
        this.identificationImages = identificationImages;
    }



    public String getVehicleCategory() {
        return vehicleCategory;
    }

    public void setVehicleCategory(String vehicleCategory) {
        this.vehicleCategory = vehicleCategory;
    }

    public String getAudatexHaupttyp() {
        return audatexHaupttyp;
    }

    public void setAudatexHaupttyp(String audatexHaupttyp) {
        this.audatexHaupttyp = audatexHaupttyp;
    }

    public String getTestDriveDone() {
        return testDriveDone;
    }

    public void setTestDriveDone(String testDriveDone) {
        this.testDriveDone = testDriveDone;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("testDriveDone")
    public void setTestDriveDoneLegacy(Object val) {
        if (val instanceof Boolean) {
            if ((Boolean) val) {
                this.testDriveDone = "carried_out";
            } else {
                this.testDriveDone = "not_possible";
            }
        } else if (val instanceof String) {
            this.testDriveDone = (String) val;
        }
    }

    public String getLiftingPlatformStatus() {
        return liftingPlatformStatus;
    }

    public void setLiftingPlatformStatus(String liftingPlatformStatus) {
        this.liftingPlatformStatus = liftingPlatformStatus;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("inspectedOnLift")
    public void setInspectedOnLift(Boolean val) {
        if (val != null && val && (this.liftingPlatformStatus == null || this.liftingPlatformStatus.isEmpty())) {
            this.liftingPlatformStatus = "available_used";
        }
    }

    @com.fasterxml.jackson.annotation.JsonProperty("noLiftingPlatformAvailable")
    public void setNoLiftingPlatformAvailable(Boolean val) {
        if (val != null && val && (this.liftingPlatformStatus == null || this.liftingPlatformStatus.isEmpty())) {
            this.liftingPlatformStatus = "not_available";
        }
    }

    public Boolean getErrorMemoryRead() {
        return errorMemoryRead;
    }

    public void setErrorMemoryRead(Boolean errorMemoryRead) {
        this.errorMemoryRead = errorMemoryRead;
    }

    public Boolean getHybridBatteryChecked() {
        return hybridBatteryChecked;
    }

    public void setHybridBatteryChecked(Boolean hybridBatteryChecked) {
        this.hybridBatteryChecked = hybridBatteryChecked;
    }

    public Integer getKeysPresent() {
        return keysPresent;
    }

    public void setKeysPresent(Integer keysPresent) {
        this.keysPresent = keysPresent;
    }

    public Integer getPrimaryKeysCount() {
        return primaryKeysCount;
    }

    public void setPrimaryKeysCount(Integer primaryKeysCount) {
        this.primaryKeysCount = primaryKeysCount;
        updateLegacyKeysPresent();
    }

    public Integer getSpareKeysCount() {
        return spareKeysCount;
    }

    public void setSpareKeysCount(Integer spareKeysCount) {
        this.spareKeysCount = spareKeysCount;
        updateLegacyKeysPresent();
    }

    public Integer getWorkshopKeysCount() {
        return workshopKeysCount;
    }

    public void setWorkshopKeysCount(Integer workshopKeysCount) {
        this.workshopKeysCount = workshopKeysCount;
    }

    public Integer getRemoteControlsCount() {
        return remoteControlsCount;
    }

    public void setRemoteControlsCount(Integer remoteControlsCount) {
        this.remoteControlsCount = remoteControlsCount;
    }

    public Integer getTargetKeysCount() {
        return targetKeysCount;
    }

    public void setTargetKeysCount(Integer targetKeysCount) {
        this.targetKeysCount = targetKeysCount;
    }

    public Integer getActualKeysCount() {
        return actualKeysCount;
    }

    public void setActualKeysCount(Integer actualKeysCount) {
        this.actualKeysCount = actualKeysCount;
        updateLegacyKeysPresent();
    }

    private void updateLegacyKeysPresent() {
        if (actualKeysCount != null) {
            this.keysPresent = actualKeysCount;
        } else {
            // Backward compatibility: keysPresent usually refers to ignition keys (primary + spare)
            int primary = primaryKeysCount != null ? primaryKeysCount : 0;
            int spare = spareKeysCount != null ? spareKeysCount : 0;
            this.keysPresent = primary + spare;
        }
    }

    public List<String> getDocumentsPresent() {
        return documentsPresent;
    }

    public void setDocumentsPresent(List<String> documentsPresent) {
        this.documentsPresent = documentsPresent;
    }

    public String getRegistrationCertificateStatus() {
        return registrationCertificateStatus;
    }

    public void setRegistrationCertificateStatus(String registrationCertificateStatus) {
        this.registrationCertificateStatus = registrationCertificateStatus;
    }

    public Boolean getRegistrationCertificateSubmittedLater() {
        return registrationCertificateSubmittedLater;
    }

    public void setRegistrationCertificateSubmittedLater(Boolean registrationCertificateSubmittedLater) {
        this.registrationCertificateSubmittedLater = registrationCertificateSubmittedLater;
    }

    public String getServiceBookletStatus() {
        return serviceBookletStatus;
    }

    public void setServiceBookletStatus(String serviceBookletStatus) {
        this.serviceBookletStatus = serviceBookletStatus;
    }

    public Boolean getServiceBookletSubmittedLater() {
        return serviceBookletSubmittedLater;
    }

    public void setServiceBookletSubmittedLater(Boolean serviceBookletSubmittedLater) {
        this.serviceBookletSubmittedLater = serviceBookletSubmittedLater;
    }

    public String getOperatingManualStatus() {
        return operatingManualStatus;
    }

    public void setOperatingManualStatus(String operatingManualStatus) {
        this.operatingManualStatus = operatingManualStatus;
    }

    public Boolean getOperatingManualSubmittedLater() {
        return operatingManualSubmittedLater;
    }

    public void setOperatingManualSubmittedLater(Boolean operatingManualSubmittedLater) {
        this.operatingManualSubmittedLater = operatingManualSubmittedLater;
    }

    public String getEnvironmentalBadgeStatus() {
        return environmentalBadgeStatus;
    }

    public void setEnvironmentalBadgeStatus(String environmentalBadgeStatus) {
        this.environmentalBadgeStatus = environmentalBadgeStatus;
    }

    public Boolean getEnvironmentalBadgeSubmittedLater() {
        return environmentalBadgeSubmittedLater;
    }

    public void setEnvironmentalBadgeSubmittedLater(Boolean environmentalBadgeSubmittedLater) {
        this.environmentalBadgeSubmittedLater = environmentalBadgeSubmittedLater;
    }

    public List<String> getEnvironmentalBadgeImages() {
        return environmentalBadgeImages;
    }

    public void setEnvironmentalBadgeImages(List<String> environmentalBadgeImages) {
        this.environmentalBadgeImages = environmentalBadgeImages;
    }

    public String getAdditionalNotes() {
        return additionalNotes;
    }

    public void setAdditionalNotes(String additionalNotes) {
        this.additionalNotes = additionalNotes;
    }

    public Boolean getNoPaintIssuesDetected() {
        return noPaintIssuesDetected;
    }

    public void setNoPaintIssuesDetected(Boolean noPaintIssuesDetected) {
        this.noPaintIssuesDetected = noPaintIssuesDetected;
    }

    public List<PaintMeasurementDTO> getPaintMeasurements() {
        return paintMeasurements;
    }

    public void setPaintMeasurements(List<PaintMeasurementDTO> paintMeasurements) {
        this.paintMeasurements = paintMeasurements;
    }

    public List<TireInfoDTO> getTires() {
        return tires;
    }

    public void setTires(List<TireInfoDTO> tires) {
        this.tires = tires;
    }

    public SpareTireDTO getSpareTire() {
        return spareTire;
    }

    public void setSpareTire(SpareTireDTO spareTire) {
        this.spareTire = spareTire;
    }

    public EquipmentItemDTO getBreakdownKit() {
        return breakdownKit;
    }

    public void setBreakdownKit(EquipmentItemDTO breakdownKit) {
        this.breakdownKit = breakdownKit;
    }

    public EquipmentItemDTO getFirstAidKit() {
        return firstAidKit;
    }

    public void setFirstAidKit(EquipmentItemDTO firstAidKit) {
        this.firstAidKit = firstAidKit;
    }

    public EquipmentItemDTO getSafetyVest() {
        return safetyVest;
    }

    public void setSafetyVest(EquipmentItemDTO safetyVest) {
        this.safetyVest = safetyVest;
    }

    public EquipmentItemDTO getWarningTriangle() {
        return warningTriangle;
    }

    public void setWarningTriangle(EquipmentItemDTO warningTriangle) {
        this.warningTriangle = warningTriangle;
    }

    public String getNextMaintenanceDate() {
        return nextMaintenanceDate;
    }

    public void setNextMaintenanceDate(String nextMaintenanceDate) {
        this.nextMaintenanceDate = nextMaintenanceDate;
    }

    public Integer getNextMaintenanceMileage() {
        return nextMaintenanceMileage;
    }

    public void setNextMaintenanceMileage(Integer nextMaintenanceMileage) {
        this.nextMaintenanceMileage = nextMaintenanceMileage;
    }

    public String getNextMaintenanceType() {
        return nextMaintenanceType;
    }

    public void setNextMaintenanceType(String nextMaintenanceType) {
        this.nextMaintenanceType = nextMaintenanceType;
    }

    public Integer getNextMaintenanceIntervalValue() {
        return nextMaintenanceIntervalValue;
    }

    public void setNextMaintenanceIntervalValue(Integer nextMaintenanceIntervalValue) {
        this.nextMaintenanceIntervalValue = nextMaintenanceIntervalValue;
    }

    public String getMaintenanceStatus() {
        return maintenanceStatus;
    }

    public void setMaintenanceStatus(String maintenanceStatus) {
        this.maintenanceStatus = maintenanceStatus;
    }

    public Double getMaintenancePrice() {
        return maintenancePrice;
    }

    public void setMaintenancePrice(Double maintenancePrice) {
        this.maintenancePrice = maintenancePrice;
    }

    public String getTireConfiguration() {
        return tireConfiguration;
    }

    public void setTireConfiguration(String tireConfiguration) {
        this.tireConfiguration = tireConfiguration;
    }

    public Map<String, BodyPartDamageDTO> getBodyPartDamages() {
        return bodyPartDamages;
    }

    public void setBodyPartDamages(Map<String, BodyPartDamageDTO> bodyPartDamages) {
        this.bodyPartDamages = bodyPartDamages;
    }

    public List<MinderwertRowDTO> getMinderwertRows() {
        return minderwertRows;
    }

    public void setMinderwertRows(List<MinderwertRowDTO> minderwertRows) {
        this.minderwertRows = minderwertRows;
    }

    public List<MinderwertRowDTO> getSystemMinderwertRows() {
        return systemMinderwertRows;
    }

    public void setSystemMinderwertRows(List<MinderwertRowDTO> systemMinderwertRows) {
        this.systemMinderwertRows = systemMinderwertRows;
    }

    public List<DamageItemDTO> getDamages() {
        return damages;
    }

    public void setDamages(List<DamageItemDTO> damages) {
        this.damages = damages;
    }

    public List<PhotoDTO> getPhotos() {
        return photos;
    }

    public void setPhotos(List<PhotoDTO> photos) {
        this.photos = photos;
    }

    public SignaturesDTO getSignatures() {
        return signatures;
    }

    public void setSignatures(SignaturesDTO signatures) {
        this.signatures = signatures;
    }

    public SignatureNamesDTO getSignatureNames() {
        return signatureNames;
    }

    public void setSignatureNames(SignatureNamesDTO signatureNames) {
        this.signatureNames = signatureNames;
    }

    public String getExpertAssessmentStatus() {
        return expertAssessmentStatus;
    }

    public void setExpertAssessmentStatus(String expertAssessmentStatus) {
        this.expertAssessmentStatus = expertAssessmentStatus;
    }

    public List<SendLogDTO> getSendLogs() {
        return sendLogs;
    }

    public void setSendLogs(List<SendLogDTO> sendLogs) {
        this.sendLogs = sendLogs;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getOmtSyncStatus() {
        return omtSyncStatus;
    }

    public void setOmtSyncStatus(String omtSyncStatus) {
        this.omtSyncStatus = omtSyncStatus;
    }

    public String getOmtSyncError() {
        return omtSyncError;
    }

    public void setOmtSyncError(String omtSyncError) {
        this.omtSyncError = omtSyncError;
    }

    public String getOmtId() {
        return omtId;
    }

    public void setOmtId(String omtId) {
        this.omtId = omtId;
    }

    public String getPdfPath() {
        return pdfPath;
    }

    public void setPdfPath(String pdfPath) {
        this.pdfPath = pdfPath;
    }

    public String getChargingCable() {
        return chargingCable;
    }

    public void setChargingCable(String chargingCable) {
        this.chargingCable = chargingCable;
    }



    public Boolean getInspectionFromAbove() {
        return inspectionFromAbove;
    }

    public void setInspectionFromAbove(Boolean inspectionFromAbove) {
        this.inspectionFromAbove = inspectionFromAbove;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("inspectionFromAboveNotPossible")
    public void setInspectionFromAboveNotPossible(Boolean val) {
        if (val != null && this.inspectionFromAbove == null) {
            this.inspectionFromAbove = val;
        }
    }

    public Boolean getInspectionFromBelow() {
        return inspectionFromBelow;
    }

    public void setInspectionFromBelow(Boolean inspectionFromBelow) {
        this.inspectionFromBelow = inspectionFromBelow;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("inspectionFromBelowNotPossible")
    public void setInspectionFromBelowNotPossible(Boolean val) {
        if (val != null && this.inspectionFromBelow == null) {
            this.inspectionFromBelow = val;
        }
    }

    public String getVehicleConditionStatus() {
        return vehicleConditionStatus;
    }

    public void setVehicleConditionStatus(String vehicleConditionStatus) {
        this.vehicleConditionStatus = vehicleConditionStatus;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("vehicleDirty")
    public void setVehicleDirty(Boolean val) {
        if (val != null && val && (this.vehicleConditionStatus == null || this.vehicleConditionStatus.isEmpty())) {
            this.vehicleConditionStatus = "dirty";
        }
    }

    @com.fasterxml.jackson.annotation.JsonProperty("vehicleWet")
    public void setVehicleWet(Boolean val) {
        if (val != null && val && (this.vehicleConditionStatus == null || this.vehicleConditionStatus.isEmpty())) {
            this.vehicleConditionStatus = "wet";
        }
    }



    public String getEngineRunPerformed() {
        return engineRunPerformed;
    }

    public void setEngineRunPerformed(String engineRunPerformed) {
        this.engineRunPerformed = engineRunPerformed;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("engineRunPerformed")
    public void setEngineRunPerformedLegacy(Object val) {
        if (val instanceof Boolean) {
            if ((Boolean) val) {
                this.engineRunPerformed = "carried_out";
            } else {
                this.engineRunPerformed = "not_occurred";
            }
        } else if (val instanceof String) {
            this.engineRunPerformed = (String) val;
        }
    }

    public String getEngineRunStatus() {
        return engineRunStatus;
    }

    public void setEngineRunStatus(String engineRunStatus) {
        this.engineRunStatus = engineRunStatus;
    }

    public String getEngineRunNoise() {
        return engineRunNoise;
    }

    public void setEngineRunNoise(String engineRunNoise) {
        this.engineRunNoise = engineRunNoise;
    }

    public String getEngineRunRoughRunning() {
        return engineRunRoughRunning;
    }

    public void setEngineRunRoughRunning(String engineRunRoughRunning) {
        this.engineRunRoughRunning = engineRunRoughRunning;
    }

    public String getEngineRunWarningLightsActive() {
        return engineRunWarningLightsActive;
    }

    public void setEngineRunWarningLightsActive(String engineRunWarningLightsActive) {
        this.engineRunWarningLightsActive = engineRunWarningLightsActive;
    }

    public String getEngineRunWarningLightsDetails() {
        return engineRunWarningLightsDetails;
    }

    public void setEngineRunWarningLightsDetails(String engineRunWarningLightsDetails) {
        this.engineRunWarningLightsDetails = engineRunWarningLightsDetails;
    }

    public String getEngineRunOtherIssues() {
        return engineRunOtherIssues;
    }

    public void setEngineRunOtherIssues(String engineRunOtherIssues) {
        this.engineRunOtherIssues = engineRunOtherIssues;
    }

    public String getEquipmentListAvailable() {
        return equipmentListAvailable;
    }

    public void setEquipmentListAvailable(Object equipmentListAvailable) {
        if (equipmentListAvailable == null) {
            this.equipmentListAvailable = null;
        } else if (equipmentListAvailable instanceof Boolean) {
            this.equipmentListAvailable = ((Boolean) equipmentListAvailable) ? "true" : "false";
        } else {
            this.equipmentListAvailable = equipmentListAvailable.toString();
        }
    }

    public Boolean getDeliveryConfirmationAvailable() {
        return deliveryConfirmationAvailable;
    }

    public void setDeliveryConfirmationAvailable(Boolean deliveryConfirmationAvailable) {
        this.deliveryConfirmationAvailable = deliveryConfirmationAvailable;
    }

    private List<String> chargingCableImages;

    public List<String> getChargingCableImages() {
        return chargingCableImages;
    }

    public void setChargingCableImages(List<String> chargingCableImages) {
        this.chargingCableImages = chargingCableImages;
    }

    public List<String> getServiceheftImages() {
        return serviceheftImages;
    }

    public void setServiceheftImages(List<String> serviceheftImages) {
        this.serviceheftImages = serviceheftImages;
    }

    public List<String> getBordliteraturImages() {
        return bordliteraturImages;
    }

    public void setBordliteraturImages(List<String> bordliteraturImages) {
        this.bordliteraturImages = bordliteraturImages;
    }

    public List<String> getKeysImages() {
        return keysImages;
    }

    public void setKeysImages(List<String> keysImages) {
        this.keysImages = keysImages;
    }

    public List<String> getMaintenanceImages() {
        return maintenanceImages;
    }

    public void setMaintenanceImages(List<String> maintenanceImages) {
        this.maintenanceImages = maintenanceImages;
    }

    public List<String> getFzScheinImages() {
        return fzScheinImages;
    }

    public void setFzScheinImages(List<String> fzScheinImages) {
        this.fzScheinImages = fzScheinImages;
    }



    public List<String> getErrorMemoryReadImages() {
        return errorMemoryReadImages;
    }

    public void setErrorMemoryReadImages(List<String> errorMemoryReadImages) {
        this.errorMemoryReadImages = errorMemoryReadImages;
    }

    public List<String> getHybridBatteryCheckedImages() {
        return hybridBatteryCheckedImages;
    }

    public void setHybridBatteryCheckedImages(List<String> hybridBatteryCheckedImages) {
        this.hybridBatteryCheckedImages = hybridBatteryCheckedImages;
    }



    public List<String> getInspectionFromAboveImages() {
        return inspectionFromAboveImages;
    }

    public void setInspectionFromAboveImages(List<String> inspectionFromAboveImages) {
        this.inspectionFromAboveImages = inspectionFromAboveImages;
    }

    public List<String> getInspectionFromBelowImages() {
        return inspectionFromBelowImages;
    }

    public void setInspectionFromBelowImages(List<String> inspectionFromBelowImages) {
        this.inspectionFromBelowImages = inspectionFromBelowImages;
    }

    public List<String> getVehicleConditionImages() {
        return vehicleConditionImages;
    }

    public void setVehicleConditionImages(List<String> vehicleConditionImages) {
        this.vehicleConditionImages = vehicleConditionImages;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("vehicleDirtyImages")
    public void setVehicleDirtyImages(List<String> val) {
        if (val != null && !val.isEmpty() && (this.vehicleConditionImages == null || this.vehicleConditionImages.isEmpty())) {
            this.vehicleConditionImages = val;
        }
    }

    @com.fasterxml.jackson.annotation.JsonProperty("vehicleWetImages")
    public void setVehicleWetImages(List<String> val) {
        if (val != null && !val.isEmpty() && (this.vehicleConditionImages == null || this.vehicleConditionImages.isEmpty())) {
            this.vehicleConditionImages = val;
        }
    }



    public List<String> getEquipmentListAvailableImages() {
        return equipmentListAvailableImages;
    }

    public void setEquipmentListAvailableImages(List<String> equipmentListAvailableImages) {
        this.equipmentListAvailableImages = equipmentListAvailableImages;
    }

    public List<String> getDeliveryConfirmationAvailableImages() {
        return deliveryConfirmationAvailableImages;
    }

    public void setDeliveryConfirmationAvailableImages(List<String> deliveryConfirmationAvailableImages) {
        this.deliveryConfirmationAvailableImages = deliveryConfirmationAvailableImages;
    }

    public List<ReportVersionDTO> getVersions() {
        return versions;
    }

    public void setVersions(List<ReportVersionDTO> versions) {
        this.versions = versions;
    }

    public Boolean getHasSecondTireSet() {
        return hasSecondTireSet;
    }

    public void setHasSecondTireSet(Boolean hasSecondTireSet) {
        this.hasSecondTireSet = hasSecondTireSet;
    }

    public List<TireInfoDTO> getSecondTires() {
        return secondTires;
    }

    public void setSecondTires(List<TireInfoDTO> secondTires) {
        this.secondTires = secondTires;
    }

    public String getSecondTireSetSelection() {
        return secondTireSetSelection;
    }

    public void setSecondTireSetSelection(String secondTireSetSelection) {
        this.secondTireSetSelection = secondTireSetSelection;
    }

    public String getIntranetCustomerId() {
        return intranetCustomerId;
    }

    public void setIntranetCustomerId(String intranetCustomerId) {
        this.intranetCustomerId = intranetCustomerId;
    }

    public Boolean getIsAuthorizedPerson() {
        return isAuthorizedPerson;
    }

    public void setIsAuthorizedPerson(Boolean isAuthorizedPerson) {
        this.isAuthorizedPerson = isAuthorizedPerson;
    }

    public String getAuthorizedPersonName() {
        return authorizedPersonName;
    }

    public void setAuthorizedPersonName(String authorizedPersonName) {
        this.authorizedPersonName = authorizedPersonName;
    }

    public String getAuthorizedPersonPhoto() {
        return authorizedPersonPhoto;
    }

    public void setAuthorizedPersonPhoto(String authorizedPersonPhoto) {
        this.authorizedPersonPhoto = authorizedPersonPhoto;
    }

    public Boolean getCustomerPresent() {
        return customerPresent;
    }

    public void setCustomerPresent(Boolean customerPresent) {
        this.customerPresent = customerPresent;
    }

    public List<String> getEngineRunPerformedImages() {
        return engineRunPerformedImages;
    }

    public void setEngineRunPerformedImages(List<String> engineRunPerformedImages) {
        this.engineRunPerformedImages = engineRunPerformedImages;
    }

    public Double getVehicleBaseValue() { return vehicleBaseValue; }
    public void setVehicleBaseValue(Double vehicleBaseValue) { this.vehicleBaseValue = vehicleBaseValue; }

    public String getPriceCategory() { return priceCategory; }
    public void setPriceCategory(String priceCategory) { this.priceCategory = priceCategory; }

    public String getMileageBucket() { return mileageBucket; }
    public void setMileageBucket(String mileageBucket) { this.mileageBucket = mileageBucket; }

    public Double getDepreciationMatrixFactor() { return depreciationMatrixFactor; }
    public void setDepreciationMatrixFactor(Double depreciationMatrixFactor) { this.depreciationMatrixFactor = depreciationMatrixFactor; }

    public Double getFinalVehicleValue() { return finalVehicleValue; }
    public void setFinalVehicleValue(Double finalVehicleValue) { this.finalVehicleValue = finalVehicleValue; }

    public List<String> getVideoExpertImages() { return videoExpertImages; }
    public void setVideoExpertImages(List<String> videoExpertImages) { this.videoExpertImages = videoExpertImages; }
}
