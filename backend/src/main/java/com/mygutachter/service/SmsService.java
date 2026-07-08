package com.mygutachter.service;

import org.springframework.stereotype.Service;

import com.mygutachter.config.TwilioConfig;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;

import jakarta.annotation.PostConstruct;

/**
 * Sends SMS via Twilio Programmable Messaging (Messaging Service). Currently used for
 * video-call meeting invites. If Twilio credentials are not configured, {@link #sendMeetingInvite}
 * logs and no-ops rather than throwing, so the rest of an invite (e.g. the email) still succeeds.
 */
@Service
public class SmsService {

    private final TwilioConfig twilioConfig;
    private boolean initialized = false;

    public SmsService(TwilioConfig twilioConfig) {
        this.twilioConfig = twilioConfig;
    }

    @PostConstruct
    public void init() {
        if (isConfigured()) {
            Twilio.init(twilioConfig.getAccountSid(), twilioConfig.getAuthToken());
            initialized = true;
        }
    }

    private boolean isConfigured() {
        return twilioConfig.getAccountSid() != null && !twilioConfig.getAccountSid().isBlank()
                && twilioConfig.getAuthToken() != null && !twilioConfig.getAuthToken().isBlank()
                && twilioConfig.getMessagingServiceSid() != null && !twilioConfig.getMessagingServiceSid().isBlank();
    }

    public void sendMeetingInvite(String toMobile, String meetingLink, String name, String date, String time) {
        if (toMobile == null || toMobile.trim().isEmpty()) {
            return;
        }
        if (!initialized) {
            System.err.println("Skipping SMS invite to " + toMobile + " - Twilio is not configured.");
            return;
        }

        StringBuilder when = new StringBuilder();
        if (date != null && !date.trim().isEmpty()) {
            when.append(" am ").append(date.trim());
        }
        if (time != null && !time.trim().isEmpty()) {
            when.append(" um ").append(time.trim()).append(" Uhr");
        }

        String body = "Einladung zur Video-Begutachtung" + when + ": " + meetingLink;

        try {
            Message.creator(new PhoneNumber(toMobile.trim()),
                    twilioConfig.getMessagingServiceSid(), body).create();
        } catch (Exception e) {
            System.err.println("Failed to send SMS invite to " + toMobile + ": " + e.getMessage());
            throw new RuntimeException("SMS send failed: " + e.getMessage());
        }
    }
}
