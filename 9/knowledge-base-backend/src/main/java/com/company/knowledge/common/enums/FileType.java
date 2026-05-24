package com.company.knowledge.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum FileType {

    PDF("pdf", "PDF文档"),
    WORD("word", "Word文档"),
    EXCEL("excel", "Excel表格"),
    PPT("ppt", "PPT演示"),
    TEXT("text", "文本文件"),
    MARKDOWN("markdown", "Markdown"),
    IMAGE("image", "图片"),
    OTHER("other", "其他");

    private final String code;
    private final String description;
}
