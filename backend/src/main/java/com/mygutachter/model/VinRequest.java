package com.mygutachter.model;

public class VinRequest {
    private String vin;

    public VinRequest() {}

    public VinRequest(String vin) {
        this.vin = vin;
    }

    public String getVin() { return vin; }
    public void setVin(String vin) { this.vin = vin; }
}
