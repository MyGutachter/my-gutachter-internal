package com.mygutachter.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;

@Service
public class EmailService {

    @Value("${mailgun.api-key}")
    private String apiKey;

    @Value("${mailgun.domain}")
    private String domain;

    @Value("${mailgun.region}")
    private String region;

    @Value("${mailgun.from-email}")
    private String fromAddress;

    /**
     * Sends a password-reset email via Mailgun (same mechanism/config as
     * {@link #sendReportEmail}). The {@code resetLink} already includes the token.
     */
    public void sendPasswordResetEmail(String toAddress, String resetLink) {
        if (toAddress == null || toAddress.trim().isEmpty()) {
            System.err.println("Cannot send password reset email: toAddress is null or empty.");
            return;
        }

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            String auth = "api:" + apiKey;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());
            headers.set("Authorization", "Basic " + encodedAuth);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("from", fromAddress);
            body.add("to", toAddress);
            body.add("subject", "Passwort zurücksetzen – MyGutachter");
            body.add("text", "Sehr geehrte(r) Kundin/Kunde,\n\n" +
                    "Sie haben angefordert, Ihr Passwort zurückzusetzen. " +
                    "Bitte öffnen Sie den folgenden Link, um ein neues Passwort zu vergeben " +
                    "(gültig für eine Stunde):\n\n" +
                    resetLink + "\n\n" +
                    "Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.\n\n" +
                    "Mit freundlichen Grüßen,\n" +
                    "Ihr MyGutachter-Team");

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            String url = "https://" + region + "/v3/" + domain + "/messages";

            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Mailgun API Error: " + response.getBody());
            }
        } catch (org.springframework.web.client.RestClientException e) {
            System.err.println("Mailgun API call failed for " + toAddress + ": " + e.getMessage());
            throw new RuntimeException("Mailgun API error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Unexpected error sending reset email to " + toAddress + ": " + e.getMessage());
            throw new RuntimeException("Unexpected error: " + e.getMessage());
        }
    }

    /**
     * Sends a video-call meeting invite via Mailgun (same mechanism/config as the other
     * mails). {@code meetingLink} is the join URL; {@code name}/{@code date}/{@code time}
     * are optional and only used to personalize the body.
     */
    public void sendMeetingInvite(String toAddress, String meetingLink, String name, String date, String time) {
        if (toAddress == null || toAddress.trim().isEmpty()) {
            System.err.println("Cannot send meeting invite: toAddress is null or empty.");
            return;
        }

        String greetingName = (name != null && !name.trim().isEmpty()) ? name.trim() : "Kundin/Kunde";
        StringBuilder when = new StringBuilder();
        if (date != null && !date.trim().isEmpty()) {
            when.append(" am ").append(date.trim());
        }
        if (time != null && !time.trim().isEmpty()) {
            when.append(" um ").append(time.trim()).append(" Uhr");
        }

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            String auth = "api:" + apiKey;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());
            headers.set("Authorization", "Basic " + encodedAuth);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("from", fromAddress);
            body.add("to", toAddress);
            body.add("subject", "Ihre Einladung zur Video-Begutachtung – MyGutachter");
            body.add("text", "Sehr geehrte(r) " + greetingName + ",\n\n" +
                    "Sie sind zu einer Video-Begutachtung" + when + " eingeladen.\n\n" +
                    "Bitte treten Sie über den folgenden Link bei:\n\n" +
                    meetingLink + "\n\n" +
                    "Mit freundlichen Grüßen,\n" +
                    "Ihr MyGutachter-Team");

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            String url = "https://" + region + "/v3/" + domain + "/messages";

            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Mailgun API Error: " + response.getBody());
            }
        } catch (org.springframework.web.client.RestClientException e) {
            System.err.println("Mailgun API call failed for " + toAddress + ": " + e.getMessage());
            throw new RuntimeException("Mailgun API error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Unexpected error sending meeting invite to " + toAddress + ": " + e.getMessage());
            throw new RuntimeException("Unexpected error: " + e.getMessage());
        }
    }

    public void sendReportEmail(String toAddress, String caseNumber, MultipartFile pdfFile, String claimType,
            String licensePlate) {
        System.out.println("EmailService.sendReportEmail: toAddress=" + toAddress + ", caseNumber=" + caseNumber
                + ", licensePlate=[" + licensePlate + "]");
        if (toAddress == null || toAddress.trim().isEmpty()) {
            System.err.println("Cannot send email: toAddress is null or empty.");
            return;
        }

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            String auth = "api:" + apiKey;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());
            headers.set("Authorization", "Basic " + encodedAuth);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("from", fromAddress);
            body.add("to", toAddress);
            body.add("subject", "Ihr Produkt zum Auftrag " + claimType + " – Kennzeichen " + licensePlate);
            body.add("text", "Sehr geehrte(r) Kundin/Kunde,\n\n" +
                    "anbei erhalten Sie Ihr Produkt zu dem Auftrag mit dem Kennzeichen " + licensePlate + ".\n\n" +
                    "Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.\n\n" +
                    "Mit freundlichen Grüßen,\n" +
                    "Ihr MyGutachter-Team");

            ByteArrayResource pdfResource = new ByteArrayResource(pdfFile.getBytes()) {
                @Override
                public String getFilename() {
                    return "Gutachten_" + caseNumber + ".pdf";
                }
            };
            body.add("attachment", pdfResource);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            String url = "https://" + region + "/v3/" + domain + "/messages";

            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Mailgun API Error: " + response.getBody());
            }
        } catch (java.io.IOException e) {
            System.err.println("Failed to read PDF file for " + toAddress + ": " + e.getMessage());
            throw new RuntimeException("Local file error: Could not read PDF attachment. " + e.getMessage());
        } catch (org.springframework.web.client.RestClientException e) {
            System.err.println("Mailgun API call failed for " + toAddress + ": " + e.getMessage());
            throw new RuntimeException("Mailgun API error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Unexpected error sending email to " + toAddress + ": " + e.getMessage());
            throw new RuntimeException("Unexpected error: " + e.getMessage());
        }
    }
}
