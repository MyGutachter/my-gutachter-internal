package com.mygutachter.model;

import java.util.List;
import java.util.Map;

public class QuickRegisterRequest {
    private String email;
    private String name;
    private String apiKey;
    private List<String> roles;
    private Map<String, Boolean> permissions;

    public QuickRegisterRequest() {}

    public QuickRegisterRequest(String email, String name, String apiKey, List<String> roles) {
        this.email = email;
        this.name = name;
        this.apiKey = apiKey;
        this.roles = roles;
    }

    public QuickRegisterRequest(String email, String name, String apiKey, List<String> roles, Map<String, Boolean> permissions) {
        this.email = email;
        this.name = name;
        this.apiKey = apiKey;
        this.roles = roles;
        this.permissions = permissions;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }

    public Map<String, Boolean> getPermissions() { return permissions; }
    public void setPermissions(Map<String, Boolean> permissions) { this.permissions = permissions; }
}
