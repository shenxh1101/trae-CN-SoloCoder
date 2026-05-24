package com.company.knowledge.common.utils;

import com.company.knowledge.common.enums.FileType;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

public class FileUtils {

    private static final List<String> PDF_EXTENSIONS = Arrays.asList("pdf");
    private static final List<String> WORD_EXTENSIONS = Arrays.asList("doc", "docx");
    private static final List<String> EXCEL_EXTENSIONS = Arrays.asList("xls", "xlsx");
    private static final List<String> PPT_EXTENSIONS = Arrays.asList("ppt", "pptx");
    private static final List<String> TEXT_EXTENSIONS = Arrays.asList("txt");
    private static final List<String> MARKDOWN_EXTENSIONS = Arrays.asList("md");
    private static final List<String> IMAGE_EXTENSIONS = Arrays.asList("jpg", "jpeg", "png", "gif", "bmp", "webp");

    public static FileType getFileType(String filename) {
        String extension = FilenameUtils.getExtension(filename).toLowerCase();

        if (PDF_EXTENSIONS.contains(extension)) {
            return FileType.PDF;
        } else if (WORD_EXTENSIONS.contains(extension)) {
            return FileType.WORD;
        } else if (EXCEL_EXTENSIONS.contains(extension)) {
            return FileType.EXCEL;
        } else if (PPT_EXTENSIONS.contains(extension)) {
            return FileType.PPT;
        } else if (TEXT_EXTENSIONS.contains(extension)) {
            return FileType.TEXT;
        } else if (MARKDOWN_EXTENSIONS.contains(extension)) {
            return FileType.MARKDOWN;
        } else if (IMAGE_EXTENSIONS.contains(extension)) {
            return FileType.IMAGE;
        } else {
            return FileType.OTHER;
        }
    }

    public static String formatFileSize(long size) {
        if (size < 1024) {
            return size + " B";
        } else if (size < 1024 * 1024) {
            return String.format("%.2f KB", size / 1024.0);
        } else if (size < 1024 * 1024 * 1024) {
            return String.format("%.2f MB", size / (1024.0 * 1024));
        } else {
            return String.format("%.2f GB", size / (1024.0 * 1024 * 1024));
        }
    }

    public static boolean isAllowedExtension(String filename, String allowedExtensions) {
        if (StringUtils.isBlank(allowedExtensions)) {
            return true;
        }
        String extension = "." + FilenameUtils.getExtension(filename).toLowerCase();
        return Arrays.asList(allowedExtensions.toLowerCase().split(","))
                .contains(extension);
    }

    public static boolean isImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        return contentType != null && contentType.startsWith("image/");
    }

    public static String generateUniqueFilename(String originalFilename) {
        String extension = FilenameUtils.getExtension(originalFilename);
        String timestamp = String.valueOf(System.currentTimeMillis());
        String random = String.valueOf((int) (Math.random() * 10000));
        return timestamp + "_" + random + "." + extension;
    }
}
