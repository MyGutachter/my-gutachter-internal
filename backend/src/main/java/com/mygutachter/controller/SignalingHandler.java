package com.mygutachter.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mygutachter.service.JwtService;

/**
 * WebRTC signaling relay over a plain WebSocket ({@code /signal}). Ported from VideoExpert;
 * adapted to authenticate {@code join} messages via the merged app's {@link JwtService}
 * (instead of VideoExpert's {@code JwtUtil} + {@code UserDetailsService}).
 *
 * <p>Transport only — it never touches the order document or S3 (screenshots/recordings are
 * uploaded via their own REST controllers). State is in-memory, so this is single-instance;
 * scale-out would require externalizing room state.
 *
 * <p>Message envelope: {@code { type, data, token?, role?, target?, sender? }}. {@code role:"guest"}
 * joins without a token; any other role requires a valid (non-temp) JWT in {@code token}.
 * Rooms are 1-to-1 (max 2 sessions). The first authenticated joiner is the organizer, the only
 * one allowed to restart a room after {@code end-meeting}.
 */
@Component
public class SignalingHandler extends TextWebSocketHandler {

    // Map<RoomID, Set<Session>>
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    // Map<SessionID, RoomID>
    private final Map<String, String> sessionRoomMap = new ConcurrentHashMap<>();
    // RoomIDs explicitly ended by the organizer (blocks re-join until the organizer restarts).
    private final Set<String> endedRooms = ConcurrentHashMap.newKeySet();
    // Map<RoomID, organizerUsername>
    private final Map<String, String> roomOrganizers = new ConcurrentHashMap<>();
    // Map<SessionID, username>
    private final Map<String, String> sessionUsernames = new ConcurrentHashMap<>();
    // Per-room lock to make join atomic
    private final Map<String, Object> roomLocks = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final JwtService jwtService;

    public SignalingHandler(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    private void sendErrorAndClose(WebSocketSession session, String code, String message) {
        try {
            if (session.isOpen()) {
                synchronized (session) {
                    ObjectNode err = objectMapper.createObjectNode();
                    err.put("type", "error");
                    ObjectNode data = objectMapper.createObjectNode();
                    data.put("code", code);
                    data.put("message", message);
                    err.set("data", data);
                    session.sendMessage(new TextMessage(Objects.requireNonNull(objectMapper.writeValueAsString(err))));
                }
            }
        } catch (Exception ignored) {
        }
        try {
            session.close(CloseStatus.POLICY_VIOLATION);
        } catch (Exception ignored) {
        }
    }

    private String extractBearerToken(JsonNode jsonMessage) {
        JsonNode tokenNode = jsonMessage.get("token");
        if (tokenNode != null && !tokenNode.asText("").isBlank()) {
            String token = tokenNode.asText();
            if (token.startsWith("Bearer ")) {
                token = token.substring("Bearer ".length());
            }
            return token;
        }
        return null;
    }

    private String extractRole(JsonNode jsonMessage) {
        JsonNode roleNode = jsonMessage.get("role");
        if (roleNode != null && !roleNode.asText("").isBlank()) {
            return roleNode.asText();
        }
        return "organizer";
    }

    /** Validate a (non-temp) JWT and return its username, or null if invalid. */
    private String authenticate(String token) {
        if (token == null) {
            return null;
        }
        try {
            if (Boolean.TRUE.equals(jwtService.validateToken(token)) && !jwtService.isTempToken(token)) {
                return jwtService.extractUsername(token);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        System.out.println("New Session Connected: " + session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String roomId = sessionRoomMap.remove(session.getId());
        sessionUsernames.remove(session.getId());
        if (roomId != null) {
            Set<WebSocketSession> roomSessions = rooms.get(roomId);
            if (roomSessions != null) {
                roomSessions.remove(session);
                for (WebSocketSession s : roomSessions) {
                    if (s.isOpen()) {
                        synchronized (s) {
                            ObjectNode leaveNode = objectMapper.createObjectNode();
                            leaveNode.put("type", "user-left");
                            leaveNode.put("data", session.getId());
                            s.sendMessage(new TextMessage(
                                    Objects.requireNonNull(objectMapper.writeValueAsString(leaveNode))));
                        }
                    }
                }
                if (roomSessions.isEmpty()) {
                    rooms.remove(roomId);
                }
            }
        }
        System.out.println("Session Closed: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            JsonNode jsonMessage = objectMapper.readTree(message.getPayload());
            String type = jsonMessage.get("type").asText();

            if ("join".equals(type)) {
                JsonNode dataNode = jsonMessage.get("data");
                if (dataNode == null || dataNode.asText("").isBlank()) {
                    sendErrorAndClose(session, "INVALID_JOIN", "Missing room id");
                    return;
                }
                String roomId = dataNode.asText();

                String role = extractRole(jsonMessage);
                String username = null;
                if (!"guest".equalsIgnoreCase(role)) {
                    String token = extractBearerToken(jsonMessage);
                    if (token == null) {
                        sendErrorAndClose(session, "UNAUTHORIZED", "Missing bearer token");
                        return;
                    }
                    username = authenticate(token);
                    if (username == null) {
                        sendErrorAndClose(session, "UNAUTHORIZED", "Invalid bearer token");
                        return;
                    }
                }

                Object lock = roomLocks.computeIfAbsent(roomId, k -> new Object());
                synchronized (lock) {
                    // Room explicitly ended: only the original organizer may restart it.
                    if (endedRooms.contains(roomId)) {
                        boolean isOrganizer = false;
                        if (username != null) {
                            String storedOrganizer = roomOrganizers.get(roomId);
                            if (storedOrganizer == null || storedOrganizer.equals(username)) {
                                isOrganizer = true;
                                roomOrganizers.put(roomId, username);
                            }
                        }
                        if (!isOrganizer) {
                            sendErrorAndClose(session, "MEETING_ENDED", "This meeting has already ended");
                            return;
                        }
                        endedRooms.remove(roomId);
                        rooms.remove(roomId);
                        System.out.println("Meeting restarted by organizer: " + roomId);
                    }

                    Set<WebSocketSession> roomSessions = rooms.computeIfAbsent(roomId,
                            k -> new CopyOnWriteArraySet<>());
                    roomSessions.removeIf(s -> !s.isOpen());

                    // 1v1 rule: max 2 sessions per room
                    if (roomSessions.size() >= 2) {
                        sendErrorAndClose(session, "ROOM_FULL", "Meeting already has 2 participants");
                        return;
                    }

                    sessionRoomMap.put(session.getId(), roomId);

                    if (username != null) {
                        sessionUsernames.put(session.getId(), username);
                        roomOrganizers.putIfAbsent(roomId, username);
                    }

                    List<String> existingUsers = new ArrayList<>();
                    for (WebSocketSession s : roomSessions) {
                        if (s.isOpen() && !s.getId().equals(session.getId())) {
                            existingUsers.add(s.getId());
                        }
                    }

                    roomSessions.add(session);
                    System.out.println("Session " + session.getId() + " joined room: " + roomId);

                    synchronized (session) {
                        ObjectNode existingUsersNode = objectMapper.createObjectNode();
                        existingUsersNode.put("type", "existing-users");
                        existingUsersNode.putPOJO("data", existingUsers);
                        session.sendMessage(new TextMessage(
                                Objects.requireNonNull(objectMapper.writeValueAsString(existingUsersNode))));
                    }

                    for (WebSocketSession s : roomSessions) {
                        if (s.isOpen() && !s.getId().equals(session.getId())) {
                            synchronized (s) {
                                ObjectNode joinNode = objectMapper.createObjectNode();
                                joinNode.put("type", "user-joined");
                                joinNode.put("data", session.getId());
                                s.sendMessage(new TextMessage(
                                        Objects.requireNonNull(objectMapper.writeValueAsString(joinNode))));
                            }
                        }
                    }
                }
            } else if ("end-meeting".equals(type)) {
                String roomId = sessionRoomMap.get(session.getId());
                if (roomId != null) {
                    Object lock = roomLocks.computeIfAbsent(roomId, k -> new Object());
                    synchronized (lock) {
                        endedRooms.add(roomId);
                        System.out.println("Room ended by organizer: " + roomId);

                        Set<WebSocketSession> roomSessions = rooms.get(roomId);
                        if (roomSessions != null) {
                            for (WebSocketSession s : roomSessions) {
                                if (s.isOpen() && !s.getId().equals(session.getId())) {
                                    synchronized (s) {
                                        try {
                                            ObjectNode endNode = objectMapper.createObjectNode();
                                            endNode.put("type", "end-meeting");
                                            endNode.putObject("data");
                                            s.sendMessage(new TextMessage(
                                                    Objects.requireNonNull(objectMapper.writeValueAsString(endNode))));
                                        } catch (Exception ignored) {
                                        }
                                    }
                                }
                            }
                            for (WebSocketSession s : roomSessions) {
                                try {
                                    s.close(CloseStatus.NORMAL);
                                } catch (Exception ignored) {
                                }
                            }
                            rooms.remove(roomId);
                        }
                    }
                }
            } else {
                // Relay branch: offer/answer/ice/candidate/etc.
                JsonNode targetNode = jsonMessage.get("target");
                String roomId = sessionRoomMap.get(session.getId());
                if (roomId == null) {
                    return;
                }
                Set<WebSocketSession> roomSessions = rooms.get(roomId);
                if (roomSessions == null) {
                    return;
                }
                if (targetNode != null && !targetNode.asText().isEmpty()) {
                    String targetSessionId = targetNode.asText();
                    for (WebSocketSession s : roomSessions) {
                        if (s.getId().equals(targetSessionId) && s.isOpen()) {
                            synchronized (s) {
                                if (jsonMessage instanceof ObjectNode) {
                                    ((ObjectNode) jsonMessage).put("sender", session.getId());
                                }
                                s.sendMessage(new TextMessage(
                                        Objects.requireNonNull(objectMapper.writeValueAsString(jsonMessage))));
                            }
                            break;
                        }
                    }
                } else {
                    for (WebSocketSession s : roomSessions) {
                        if (s.isOpen() && !s.getId().equals(session.getId())) {
                            synchronized (s) {
                                if (jsonMessage instanceof ObjectNode) {
                                    ((ObjectNode) jsonMessage).put("sender", session.getId());
                                }
                                s.sendMessage(new TextMessage(
                                        Objects.requireNonNull(objectMapper.writeValueAsString(jsonMessage))));
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
