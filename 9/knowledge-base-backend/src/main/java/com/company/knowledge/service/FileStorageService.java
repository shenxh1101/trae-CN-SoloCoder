package com.company.knowledge.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface FileStorageService {

    String uploadFile(MultipartFile file, String folder);

    String uploadImage(MultipartFile file);

    String saveBase64Image(String base64Data, String folder);

    void deleteFile(String objectName);

    String getFileUrl(String objectName);

    Map<String, Object> getUploadProgress(String uploadId);

    long getFileSizeLimit();

    String getAllowedExtensions();
}
