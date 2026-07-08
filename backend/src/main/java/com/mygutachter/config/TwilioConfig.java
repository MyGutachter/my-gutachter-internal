package com.mygutachter.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Twilio Programmable SMS credentials (used only for meeting-invite SMS — there is no
 * Twilio Video / TURN here; WebRTC signaling is handled by the app's own {@code /signal}
 * WebSocket). Bound from {@code twilio.*} config; secrets come from env vars.
 */
@Configuration
@ConfigurationProperties(prefix = "twilio")
public class TwilioConfig {

    private String accountSid;
    private String authToken;
    private String messagingServiceSid;

    public String getAccountSid() { return accountSid; }
    public void setAccountSid(String accountSid) { this.accountSid = accountSid; }

    public String getAuthToken() { return authToken; }
    public void setAuthToken(String authToken) { this.authToken = authToken; }

    public String getMessagingServiceSid() { return messagingServiceSid; }
    public void setMessagingServiceSid(String messagingServiceSid) { this.messagingServiceSid = messagingServiceSid; }
}
