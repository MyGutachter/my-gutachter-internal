package com.mygutachter.model;

public class AuthResponse {
    private String jwt;
    private String expertName;
    private UserRole role;
    private String caseNumber;
    private boolean isVideoxpert;

    public AuthResponse(String jwt, String expertName, UserRole role) {
        this.jwt = jwt;
        this.expertName = expertName;
        this.role = role;
    }

    public AuthResponse(String jwt, String expertName, UserRole role, String caseNumber) {
        this.jwt = jwt;
        this.expertName = expertName;
        this.role = role;
        this.caseNumber = caseNumber;
    }

    public AuthResponse(String jwt, String expertName, UserRole role, String caseNumber, boolean isVideoxpert) {
        this.jwt = jwt;
        this.expertName = expertName;
        this.role = role;
        this.caseNumber = caseNumber;
        this.isVideoxpert = isVideoxpert;
    }

    // Getters and Setters
    public String getJwt() {
        return jwt;
    }

    public void setJwt(String jwt) {
        this.jwt = jwt;
    }

    public String getExpertName() {
        return expertName;
    }

    public void setExpertName(String expertName) {
        this.expertName = expertName;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public String getCaseNumber() {
        return caseNumber;
    }

    public void setCaseNumber(String caseNumber) {
        this.caseNumber = caseNumber;
    }

    public boolean isVideoxpert() {
        return isVideoxpert;
    }

    public void setVideoxpert(boolean isVideoxpert) {
        this.isVideoxpert = isVideoxpert;
    }
}
