package com.mygutachter.model;

public class PhotoDTO {
    private String id;
    private String data;      // base64 on upload, file path after save
    private String label;
    private String fileName;
    private String filePath;  // server-side file path (set by backend after saving to disk)
    private String damageId;
    private String mandatoryPhotoId;
    private Boolean isExternal;

    private String caption;

    public PhotoDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getData() { return data; }
    public void setData(String data) { this.data = data; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public String getDamageId() { return damageId; }
    public void setDamageId(String damageId) { this.damageId = damageId; }
    public String getMandatoryPhotoId() { return mandatoryPhotoId; }
    public void setMandatoryPhotoId(String mandatoryPhotoId) { this.mandatoryPhotoId = mandatoryPhotoId; }
    public Boolean getIsExternal() { return isExternal; }
    public void setIsExternal(Boolean isExternal) { this.isExternal = isExternal; }
}
