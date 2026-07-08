package com.mygutachter.model;

public class EquipmentItemDTO {
    private String status;
    private String expirationDate;
    private java.util.List<String> images;
    private Double price;

    public EquipmentItemDTO() {}

    public EquipmentItemDTO(String status, String expirationDate) {
        this.status = status;
        this.expirationDate = expirationDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getExpirationDate() {
        return expirationDate;
    }

    public void setExpirationDate(String expirationDate) {
        this.expirationDate = expirationDate;
    }

    public java.util.List<String> getImages() {
        return images;
    }

    public void setImages(java.util.List<String> images) {
        this.images = images;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }
}
