package com.mygutachter.service;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.mygutachter.dto.UvvInspectionResultRequest;
import com.mygutachter.model.OrderSource;

/**
 * Outbound UVV Digital calls to OMT (Decision Q9 — kept as-is from VideoExpert).
 *
 * <p>The OMT contract is unchanged: {@code CompleteUvvInspection} authenticates with the
 * shared {@code omt.api-key} sent in the request body (NOT the user's bearer token), and the
 * certificate is fetched as a raw PDF. The target OMT server is chosen from the order's
 * {@code source} ({@code OMT_DEV} → dev, otherwise prod) so the call lands on the right
 * backend once dev/prod run side by side (Decision Q11).
 */
@Service
public class OmtIntegrationService {

    private static final Logger log = LoggerFactory.getLogger(OmtIntegrationService.class);

    private final RestTemplate restTemplate;

    @Value("${omt.dev-backend-url:https://backend.dev.omt-mygutachter.com}")
    private String omtDevBackendUrl;

    @Value("${omt.prod-backend-url:https://backend.omt-mygutachter.com}")
    private String omtProdBackendUrl;

    @Value("${omt.api-key:}")
    private String apiKey;

    public OmtIntegrationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    private String getBaseUrl(String source) {
        if (OrderSource.OMT_DEV.name().equals(source)) {
            return omtDevBackendUrl;
        }
        return omtProdBackendUrl;
    }

    /**
     * Report the UVV result to OMT. {@code omtOrderId} is the OMT-side order id (== the
     * order's {@code caseNumber} by convention). Returns {@code true} when OMT reports that a
     * certificate was generated (i.e. it is now fetchable via {@link #fetchUvvCertificate}).
     */
    @SuppressWarnings("rawtypes")
    public boolean completeUvvInspection(String omtOrderId, String source, UvvInspectionResultRequest request) {
        try {
            String baseUrl = getBaseUrl(source);
            String url = baseUrl.replaceAll("/$", "") + "/api/services/app/Order/CompleteUvvInspection";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = new HashMap<>();
            payload.put("orderId", omtOrderId);
            payload.put("uvvResult", request.getUvvResult());
            payload.put("inspectorName", request.getInspectorName());
            payload.put("apiKey", apiKey);
            if (request.getPdfBase64() != null) {
                payload.put("pdfBase64", request.getPdfBase64());
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            log.info("Sending CompleteUvvInspection to OMT for order: {}, url: {}", omtOrderId, url);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully completed UVV inspection on OMT for order: {}", omtOrderId);
                Map body = response.getBody();
                if (body != null && body.containsKey("result")) {
                    Map result = (Map) body.get("result");
                    if (result != null) {
                        Object cert = result.get("certificateGenerated");
                        if (cert == null) {
                            cert = result.get("CertificateGenerated");
                        }
                        if (cert == null) {
                            cert = result.get("certificateAvailable");
                        }
                        if (cert == null) {
                            cert = result.get("CertificateAvailable");
                        }
                        if (cert instanceof Boolean) {
                            return (Boolean) cert;
                        }
                    }
                }
            } else {
                log.error("Failed to complete UVV inspection on OMT. Status: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Error communicating with OMT for completeUvvInspection", e);
        }
        return false;
    }

    /**
     * Fetch the generated UVV certificate PDF from OMT. {@code videoCallId} is the OMT-side
     * order id (== {@code caseNumber}). Returns {@code null} if the response is missing or not
     * a PDF.
     */
    public byte[] fetchUvvCertificate(String videoCallId, String source) {
        try {
            String baseUrl = getBaseUrl(source);
            String url = baseUrl.replaceAll("/$", "") + "/api/uvv-certificate/" + videoCallId + "?apiKey=" + apiKey;
            log.info("Fetching UVV certificate from OMT for videoCallId: {}, url: {}", videoCallId, url);

            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(MediaType.parseMediaTypes("application/pdf"));
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    byte[].class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("Failed to fetch UVV certificate from OMT. Status: {}", response.getStatusCode());
                return null;
            }

            byte[] body = response.getBody();
            if (!isPdf(body)) {
                String preview = body == null ? "null" : new String(body, 0, Math.min(body.length, 200));
                log.error("OMT certificate response is not a PDF for videoCallId {}. Preview: {}", videoCallId, preview);
                return null;
            }

            return body;
        } catch (Exception e) {
            log.error("Error fetching UVV certificate from OMT", e);
        }
        return null;
    }

    private static boolean isPdf(byte[] body) {
        return body != null
                && body.length >= 4
                && body[0] == '%'
                && body[1] == 'P'
                && body[2] == 'D'
                && body[3] == 'F';
    }
}
