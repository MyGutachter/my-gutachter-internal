package com.mygutachter.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mygutachter.service.EmailService;
import com.mygutachter.service.SmsService;

/**
 * Sends video-call meeting invites by email (Mailgun) and/or SMS (Twilio). The "meeting" is
 * just a room id / join link created on the frontend; the backend only fans out the invite.
 * Requires authentication (falls under {@code SecurityConfig}'s {@code anyRequest().authenticated()}).
 */
@RestController
@RequestMapping("/api/meeting")
public class MeetingController {

    private final EmailService emailService;
    private final SmsService smsService;

    public MeetingController(EmailService emailService, SmsService smsService) {
        this.emailService = emailService;
        this.smsService = smsService;
    }

    @PostMapping("/invite")
    public ResponseEntity<?> sendInvite(@RequestBody MeetingInviteRequest request) {
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            emailService.sendMeetingInvite(request.getEmail(), request.getMeetingLink(),
                    request.getName(), request.getDate(), request.getTime());
        }
        if (request.getMobile() != null && !request.getMobile().isEmpty()) {
            smsService.sendMeetingInvite(request.getMobile(), request.getMeetingLink(),
                    request.getName(), request.getDate(), request.getTime());
        }
        return ResponseEntity.ok().body("Invite sent successfully");
    }

    public static class MeetingInviteRequest {
        private String email;
        private String name;
        private String date;
        private String time;
        private String mobile;
        private String meetingLink;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }

        public String getTime() { return time; }
        public void setTime(String time) { this.time = time; }

        public String getMobile() { return mobile; }
        public void setMobile(String mobile) { this.mobile = mobile; }

        public String getMeetingLink() { return meetingLink; }
        public void setMeetingLink(String meetingLink) { this.meetingLink = meetingLink; }
    }
}
