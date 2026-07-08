package com.mygutachter.repository;

import com.mygutachter.model.ApiKey;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data Mongo repository for {@link ApiKey} (collection {@code api_keys}).
 * Uses the Spring Data infrastructure autoconfigured from {@code spring.data.mongodb.*}.
 */
@Repository
public interface ApiKeyRepository extends MongoRepository<ApiKey, String> {

    Optional<ApiKey> findByKey(String key);

    List<ApiKey> findByUserEmail(String userEmail);
}
