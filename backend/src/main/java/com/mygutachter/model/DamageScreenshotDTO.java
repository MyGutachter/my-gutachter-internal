package com.mygutachter.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DamageScreenshotDTO {
    private String part;
    private String screenshotKey;
    private String url;
    private Long timestamp;

    public DamageScreenshotDTO() {}

    public String getPart() {
        return part;
    }

    public void setPart(String part) {
        this.part = part;
    }

    public String getScreenshotKey() {
        return screenshotKey;
    }

    public void setScreenshotKey(String screenshotKey) {
        this.screenshotKey = screenshotKey;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
}
