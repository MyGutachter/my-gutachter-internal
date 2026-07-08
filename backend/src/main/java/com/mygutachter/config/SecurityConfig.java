package com.mygutachter.config;

import java.util.Arrays;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.mygutachter.security.ApiKeyAuthenticationFilter;
import com.mygutachter.security.JwtAuthenticationFilter;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Stateless JWT security (replaces the old {@code AuthInterceptor}).
 *
 * <p>Auth is validated by {@link JwtAuthenticationFilter}, which also sets the
 * {@code userEmail}/{@code expertName}/{@code userRole} request attributes the controllers read.
 */
@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
            ApiKeyAuthenticationFilter apiKeyAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.apiKeyAuthenticationFilter = apiKeyAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    // CORS preflight
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    // Public auth endpoints (login, OMT login, verify, reset, etc.)
                    .requestMatchers("/api/auth/**").permitAll()
                    // Health/root
                    .requestMatchers("/", "/error").permitAll()
                    // Video module (T4.1): the per-order damages listing stays authenticated;
                    // it MUST be matched before the /api/screenshots/** permitAll below.
                    .requestMatchers(HttpMethod.GET, "/api/screenshots/order/**").authenticated()
                    // WebRTC signaling (auth done in the join message), screenshot & recording
                    // upload/serve are public — matching VideoExpert's contract.
                    .requestMatchers("/signal", "/api/screenshots/**", "/api/reports/photos/**", "/api/recordings/**").permitAll()
                    // Everything else requires a valid JWT.
                    .anyRequest().authenticated())
            // Return 401 (not Spring's default 403) for unauthenticated requests, matching
            // the old AuthInterceptor contract the frontend relies on to redirect to login.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(
                    (request, response, authException) -> response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            // API-key auth (X-API-KEY) runs first so OMT's inbound order push authenticates;
            // the JWT filter then covers normal user sessions. Each no-ops if auth is already set.
            .addFilterBefore(apiKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        config.addAllowedOriginPattern("*");
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setExposedHeaders(Arrays.asList("Content-Length", "Content-Disposition", "Content-Type"));
        config.setAllowCredentials(true);

        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
