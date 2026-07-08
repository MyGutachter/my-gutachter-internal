package com.mygutachter.model;

import java.util.List;

public class QuickRegisterRequest {
    private String email;
    private String name;
    private String apiKey;
    private List<String> roles;

    public QuickRegisterRequest() {}

    public QuickRegisterRequest(String email, String name, String apiKey, List<String> roles) {
        this.email = email;
        this.name = name;
        this.apiKey = apiKey;
        this.roles = roles;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }
}
