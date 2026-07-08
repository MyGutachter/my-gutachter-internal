package com.mygutachter.model;

public class QuickRegisterResponse {
    private String userId;
    private String apiKey;

    public QuickRegisterResponse() {}

    public QuickRegisterResponse(String userId, String apiKey) {
        this.userId = userId;
        this.apiKey = apiKey;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
}
