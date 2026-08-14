package com.mygutachter.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

import com.mygutachter.controller.SignalingHandler;

/**
 * Registers the WebRTC signaling WebSocket at {@code /signal} (plain WebSocket, not STOMP).
 *
 * <p>Handshake origins are set here directly ({@code setAllowedOriginPatterns("*")}) because
 * WebSocket upgrades do NOT pass through Spring Security's {@code http.cors()} / the MVC
 * {@code CorsConfigurationSource}. Auth is performed per-message inside the {@code join}
 * payload (see {@link SignalingHandler}), and {@code /signal} is {@code permitAll} in
 * {@code SecurityConfig}.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final SignalingHandler signalingHandler;

    public WebSocketConfig(SignalingHandler signalingHandler) {
        this.signalingHandler = signalingHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(signalingHandler, "/signal")
                .setAllowedOriginPatterns("*");
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean c = new ServletServerContainerFactoryBean();
        c.setMaxTextMessageBufferSize(262144);   // 256 KB (was ~8 KB default)
        c.setMaxBinaryMessageBufferSize(262144);
        return c;
    }
}
