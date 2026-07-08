package com.mygutachter.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * Enables Spring's caching (Caffeine). The store spec is set via
 * {@code spring.cache.caffeine.spec} in application.yml. Used to cache S3
 * presigned URLs — see {@link com.mygutachter.service.S3Service}.
 */
@Configuration
@EnableCaching
public class CacheConfig {
}
