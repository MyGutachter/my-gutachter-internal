package com.mygutachter.service;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;

import java.io.IOException;
import java.time.Duration;

/**
 * Unified S3 storage service (ported from VideoExpert).
 *
 * <p>This is the single file-storage backend for the merged app — video screenshots,
 * recordings (VideoExpert) and report photos (VehicleReport, migrated in T1.3) all
 * live in the same bucket. Presigned GET URLs are cached (see {@link com.mygutachter.config.CacheConfig}).
 */
@Service
public class S3Service {

    @Value("${aws.accessKeyId}")
    private String accessKeyId;

    @Value("${aws.secretAccessKey}")
    private String secretAccessKey;

    @Value("${aws.region}")
    private String region;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    private S3Client s3Client;
    private S3Presigner s3Presigner;

    @PostConstruct
    public void init() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKeyId, secretAccessKey);

        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();

        this.s3Presigner = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }

    /** Upload a multipart file (e.g. a report photo or screenshot) under the given key. */
    public String uploadFile(String key, MultipartFile file) throws IOException {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(file.getContentType())
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        return key;
    }

    /** Upload raw bytes (e.g. a video recording or an image downloaded from OMT) under the given key. */
    public String uploadFile(String key, byte[] content, String contentType) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(content));
        return key;
    }

    /** Download an object's bytes (used where the app must stream a file itself rather than redirect). */
    public byte[] downloadFile(String key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
        ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(getObjectRequest);
        return objectBytes.asByteArray();
    }

    public void deleteFile(String key) {
        DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        s3Client.deleteObject(deleteObjectRequest);
    }

    /** Whether an object exists at the given key. */
    public boolean exists(String key) {
        try {
            s3Client.headObject(b -> b.bucket(bucketName).key(key));
            return true;
        } catch (software.amazon.awssdk.services.s3.model.NoSuchKeyException e) {
            return false;
        }
    }

    /** Server-side copy from one key to another (used for PDF version history). */
    public void copyFile(String sourceKey, String destKey) {
        CopyObjectRequest copyReq = CopyObjectRequest.builder()
                .sourceBucket(bucketName).sourceKey(sourceKey)
                .destinationBucket(bucketName).destinationKey(destKey)
                .build();
        s3Client.copyObject(copyReq);
    }

    /** Delete every object under the given key prefix (best-effort cleanup). */
    public void deleteByPrefix(String prefix) {
        ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                .bucket(bucketName).prefix(prefix).build();
        ListObjectsV2Response listRes;
        do {
            listRes = s3Client.listObjectsV2(listReq);
            for (S3Object obj : listRes.contents()) {
                deleteFile(obj.key());
            }
            listReq = listReq.toBuilder().continuationToken(listRes.nextContinuationToken()).build();
        } while (Boolean.TRUE.equals(listRes.isTruncated()));
    }

    /**
     * Generate a presigned GET URL (valid 60 min). Results are cached for 50 min
     * (Caffeine) so repeated reads of the same key don't re-sign.
     */
    @Cacheable(value = "presignedUrls", key = "#key")
    public String generatePresignedUrl(String key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest getObjectPresignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(60))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedGetObjectRequest = s3Presigner.presignGetObject(getObjectPresignRequest);
        return presignedGetObjectRequest.url().toString();
    }
}
