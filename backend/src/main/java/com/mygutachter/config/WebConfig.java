package com.mygutachter.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC config. Authentication is handled by Spring Security
 * ({@link SecurityConfig} + {@link com.mygutachter.security.JwtAuthenticationFilter}) —
 * the old {@code AuthInterceptor} has been removed.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
}
