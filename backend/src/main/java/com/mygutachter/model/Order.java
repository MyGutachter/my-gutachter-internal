package com.mygutachter.model;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Unified order document (Decision Q6/Q7). One {@code orders} collection holds a single
 * document per order that BOTH modes work on:
 * <ul>
 *   <li><b>identity / import</b> fields pushed by OMT ({@code omtOrderId}, {@code dispatchOrOrderNo},
 *       {@code source}, vehicle/contact basics);</li>
 *   <li><b>video-mode</b> fields ({@code meetingData}, {@code videoRecordingKeys}, UVV);</li>
 *   <li><b>report-mode</b> payload — the ~190 VehicleReport report fields.</li>
 * </ul>
 *
 * <p>The report-grade fields and any other keys OMT sends are captured verbatim by
 * {@link #getExtra()} ({@code @JsonAnySetter}) and flattened back to the top level on
 * serialize ({@code @JsonAnyGetter}). Keeping the report payload <b>flat</b> (not nested
 * under a {@code report} sub-object) means the existing {@code ReportController} $set merges,
 * which key on flat {@code caseNumber}/{@code userEmail}, keep working unchanged.
 *
 * <p>The document is persisted as a raw {@code org.bson.Document} (via Jackson) exactly like
 * the rest of the codebase — this POJO is the typed/import view of that same shape.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Order {

    // ===== identity / import (from OMT push) =====
    private String omtOrderId;
    private String dispatchOrOrderNo;
    private String caseNumber;      // == omtOrderId by convention; the report docs key on this
    private String source;          // OrderSource: OMT | OMT_DEV | MANUAL
    private String orderStatus;     // OrderStatus: PENDING | DONE | CANCEL | ARCHIVE
    private String claimType;
    private String userEmail;       // assigned expert — aligns with {userEmail, caseNumber} report keying
    private List<String> additionalUserIds;

    // Which app(s) this order belongs to (OrderMode: VIDEO_EXPERT | VEHICLE_REPORT).
    // `modes` is the stored set (unioned across imports); `mode` is the singular import
    // hint OMT sends per push — importOrder $addToSets it into `modes` and does not store it.
    private List<String> modes;
    private String mode;

    // ===== contact / vehicle basics =====
    private String clientName;
    private String contactPersonName;
    private String contactPersonMobile;
    private String contactPersonEmail;
    private String vehicleExpertName;
    private String vehicleMake;
    private String vehicleModel;
    private String licensePlateNumber;
    private String vinNumber;
    private String registrationNumber;
    private Integer mileage;
    private String lastVehicleInspectionDate;

    // ===== video-mode data =====
    private Map<String, String> meetingData;
    private List<String> videoRecordingKeys;

    // ===== UVV =====
    private String uvvResult;
    private String uvvInspectionDate;
    private Boolean uvvCertificateAvailable;

    // ===== passthrough: report-grade + any other OMT-pushed fields, kept flat =====
    private final Map<String, Object> extra = new HashMap<>();

    @JsonAnySetter
    public void set(String key, Object value) {
        this.extra.put(key, value);
    }

    @JsonAnyGetter
    public Map<String, Object> getExtra() {
        return extra;
    }

    public String getOmtOrderId() { return omtOrderId; }
    public void setOmtOrderId(String omtOrderId) { this.omtOrderId = omtOrderId; }

    public String getDispatchOrOrderNo() { return dispatchOrOrderNo; }
    public void setDispatchOrOrderNo(String dispatchOrOrderNo) { this.dispatchOrOrderNo = dispatchOrOrderNo; }

    public String getCaseNumber() { return caseNumber; }
    public void setCaseNumber(String caseNumber) { this.caseNumber = caseNumber; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getOrderStatus() { return orderStatus; }
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }

    public String getClaimType() { return claimType; }
    public void setClaimType(String claimType) { this.claimType = claimType; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public List<String> getAdditionalUserIds() { return additionalUserIds; }
    public void setAdditionalUserIds(List<String> additionalUserIds) { this.additionalUserIds = additionalUserIds; }

    public List<String> getModes() { return modes; }
    public void setModes(List<String> modes) { this.modes = modes; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public String getContactPersonName() { return contactPersonName; }
    public void setContactPersonName(String contactPersonName) { this.contactPersonName = contactPersonName; }

    public String getContactPersonMobile() { return contactPersonMobile; }
    public void setContactPersonMobile(String contactPersonMobile) { this.contactPersonMobile = contactPersonMobile; }

    public String getContactPersonEmail() { return contactPersonEmail; }
    public void setContactPersonEmail(String contactPersonEmail) { this.contactPersonEmail = contactPersonEmail; }

    public String getVehicleExpertName() { return vehicleExpertName; }
    public void setVehicleExpertName(String vehicleExpertName) { this.vehicleExpertName = vehicleExpertName; }

    public String getVehicleMake() { return vehicleMake; }
    public void setVehicleMake(String vehicleMake) { this.vehicleMake = vehicleMake; }

    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }

    public String getLicensePlateNumber() { return licensePlateNumber; }
    public void setLicensePlateNumber(String licensePlateNumber) { this.licensePlateNumber = licensePlateNumber; }

    public String getVinNumber() { return vinNumber; }
    public void setVinNumber(String vinNumber) { this.vinNumber = vinNumber; }

    public String getRegistrationNumber() { return registrationNumber; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }

    public Integer getMileage() { return mileage; }
    public void setMileage(Integer mileage) { this.mileage = mileage; }

    public String getLastVehicleInspectionDate() { return lastVehicleInspectionDate; }
    public void setLastVehicleInspectionDate(String lastVehicleInspectionDate) { this.lastVehicleInspectionDate = lastVehicleInspectionDate; }

    public Map<String, String> getMeetingData() { return meetingData; }
    public void setMeetingData(Map<String, String> meetingData) { this.meetingData = meetingData; }

    public List<String> getVideoRecordingKeys() { return videoRecordingKeys; }
    public void setVideoRecordingKeys(List<String> videoRecordingKeys) { this.videoRecordingKeys = videoRecordingKeys; }

    public String getUvvResult() { return uvvResult; }
    public void setUvvResult(String uvvResult) { this.uvvResult = uvvResult; }

    public String getUvvInspectionDate() { return uvvInspectionDate; }
    public void setUvvInspectionDate(String uvvInspectionDate) { this.uvvInspectionDate = uvvInspectionDate; }

    public Boolean getUvvCertificateAvailable() { return uvvCertificateAvailable; }
    public void setUvvCertificateAvailable(Boolean uvvCertificateAvailable) { this.uvvCertificateAvailable = uvvCertificateAvailable; }
}
