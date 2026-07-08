package com.mygutachter.dto;

/**
 * Payload for {@code PATCH /api/orders/{caseNumber}/uvv} — the result of a UVV Digital
 * inspection run during the video call (Decision Q9, ported as-is from VideoExpert).
 */
public class UvvInspectionResultRequest {

    private String uvvResult;     // PASSED or FAILED
    private String inspectorName;
    private String pdfBase64;

    public String getUvvResult() {
        return uvvResult;
    }

    public void setUvvResult(String uvvResult) {
        this.uvvResult = uvvResult;
    }

    public String getInspectorName() {
        return inspectorName;
    }

    public void setInspectorName(String inspectorName) {
        this.inspectorName = inspectorName;
    }

    public String getPdfBase64() {
        return pdfBase64;
    }

    public void setPdfBase64(String pdfBase64) {
        this.pdfBase64 = pdfBase64;
    }
}
