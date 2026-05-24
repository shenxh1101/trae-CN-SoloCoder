package com.company.knowledge.service.impl;

import com.company.knowledge.common.enums.ResultCode;
import com.company.knowledge.common.exception.BusinessException;
import com.company.knowledge.service.FileStorageService;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileStorageServiceImpl implements FileStorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name:knowledge}")
    private String bucketName;

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.file-size-limit:10485760}")
    private long fileSizeLimit;

    @Value("${minio.allowed-extensions:.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx}")
    private String allowedExtensions;

    private final Map<String, Long> uploadProgress = new ConcurrentHashMap<>();

    @Override
    public String uploadFile(MultipartFile file, String folder) {
        validateFile(file);

        try {
            String objectName = generateObjectName(file.getOriginalFilename(), folder);

            ByteArrayInputStream bais = new ByteArrayInputStream(file.getBytes());
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(bais, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            log.info("File uploaded successfully: {}", objectName);
            return objectName;

        } catch (Exception e) {
            log.error("Failed to upload file", e);
            throw new BusinessException(ResultCode.INTERNAL_ERROR, "文件上传失败: " + e.getMessage());
        }
    }

    @Override
    public String uploadImage(MultipartFile file) {
        validateImage(file);
        return uploadFile(file, "images");
    }

    @Override
    public String saveBase64Image(String base64Data, String folder) {
        try {
            String imageData = base64Data;
            if (base64Data.contains(",")) {
                imageData = base64Data.split(",")[1];
            }

            byte[] imageBytes = Base64.getDecoder().decode(imageData);
            String extension = detectImageExtension(imageBytes);
            String objectName = folder + "/" + UUID.randomUUID().toString() + extension;

            ByteArrayInputStream bais = new ByteArrayInputStream(imageBytes);
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(bais, imageBytes.length, -1)
                            .contentType("image/" + extension.substring(1))
                            .build()
            );

            log.info("Base64 image saved successfully: {}", objectName);
            return objectName;

        } catch (Exception e) {
            log.error("Failed to save base64 image", e);
            throw new BusinessException(ResultCode.INTERNAL_ERROR, "图片保存失败: " + e.getMessage());
        }
    }

    @Override
    public void deleteFile(String objectName) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build()
            );
            log.info("File deleted successfully: {}", objectName);
        } catch (Exception e) {
            log.error("Failed to delete file: {}", objectName, e);
            throw new BusinessException(ResultCode.INTERNAL_ERROR, "文件删除失败");
        }
    }

    @Override
    public String getFileUrl(String objectName) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .method(Method.GET)
                            .expiry(3600 * 24)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to get file URL: {}", objectName, e);
            throw new BusinessException(ResultCode.INTERNAL_ERROR, "获取文件URL失败");
        }
    }

    @Override
    public Map<String, Object> getUploadProgress(String uploadId) {
        Map<String, Object> progress = new HashMap<>();
        Long uploaded = uploadProgress.getOrDefault(uploadId, 0L);
        progress.put("uploaded", uploaded);
        progress.put("complete", uploaded >= 100);
        return progress;
    }

    @Override
    public long getFileSizeLimit() {
        return fileSizeLimit;
    }

    @Override
    public String getAllowedExtensions() {
        return allowedExtensions;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "文件不能为空");
        }

        if (file.getSize() > fileSizeLimit) {
            throw new BusinessException(ResultCode.BAD_REQUEST,
                    "文件大小不能超过 " + (fileSizeLimit / 1024 / 1024) + " MB");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            boolean allowed = false;
            for (String ext : allowedExtensions.split(",")) {
                if (ext.trim().equalsIgnoreCase(extension)) {
                    allowed = true;
                    break;
                }
            }
            if (!allowed) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "不支持的文件类型");
            }
        }
    }

    private void validateImage(MultipartFile file) {
        validateFile(file);

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "只能上传图片文件");
        }
    }

    private String generateObjectName(String originalFilename, String folder) {
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return folder + "/" + UUID.randomUUID().toString() + extension;
    }

    private String detectImageExtension(byte[] bytes) {
        if (bytes.length >= 3) {
            if (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF) {
                return ".jpg";
            }
            if (bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 && bytes[2] == (byte) 0x4E) {
                return ".png";
            }
            if (bytes[0] == (byte) 0x47 && bytes[1] == (byte) 0x49 && bytes[2] == (byte) 0x46) {
                return ".gif";
            }
            if (bytes[0] == (byte) 0x52 && bytes[1] == (byte) 0x49 && bytes[2] == (byte) 0x46) {
                return ".webp";
            }
        }
        return ".png";
    }
}
