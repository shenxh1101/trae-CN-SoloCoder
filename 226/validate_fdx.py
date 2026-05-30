#!/usr/bin/env python3
"""
FDX格式验证工具 - 验证导出的FDX文件是否符合Final Draft规范
"""

import sys
import os
import xml.etree.ElementTree as ET
from colorama import init, Fore, Style

init()


def validate_fdx(filepath: str) -> bool:
    """验证FDX文件是否符合Final Draft规范"""
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  FDX格式验证工具{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")

    if not os.path.exists(filepath):
        print(f"{Fore.RED}❌ 文件不存在: {filepath}{Style.RESET_ALL}")
        return False

    print(f"验证文件: {filepath}\n")

    errors = []
    warnings = []

    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
    except ET.ParseError as e:
        print(f"{Fore.RED}❌ XML解析错误: {e}{Style.RESET_ALL}")
        return False

    print(f"{Fore.GREEN}✓ XML格式正确{Style.RESET_ALL}")

    if root.tag != "FinalDraft":
        errors.append("根元素必须是 <FinalDraft>")
    else:
        print(f"{Fore.GREEN}✓ 根元素正确: <FinalDraft>{Style.RESET_ALL}")

    doc_type = root.get("DocumentType")
    if doc_type != "Script":
        errors.append("DocumentType 属性必须为 'Script'")
    else:
        print(f"{Fore.GREEN}✓ DocumentType 正确: {doc_type}{Style.RESET_ALL}")

    version = root.get("Version")
    if not version:
        warnings.append("建议添加 Version 属性 (如: Version=\"3\")")
    else:
        print(f"{Fore.GREEN}✓ Version 属性: {version}{Style.RESET_ALL}")

    content = root.find("Content")
    if content is None:
        errors.append("缺少 <Content> 元素")
    else:
        print(f"{Fore.GREEN}✓ 找到 <Content> 元素{Style.RESET_ALL}")

        valid_paragraph_types = [
            "Scene Heading", "Action", "Character", "Parenthetical",
            "Dialogue", "Transition", "Shot", "Note", "General"
        ]

        paragraphs = content.findall("Paragraph")
        if not paragraphs:
            warnings.append("Content 中没有找到任何 <Paragraph> 元素")
        else:
            print(f"{Fore.GREEN}✓ 找到 {len(paragraphs)} 个 <Paragraph> 元素{Style.RESET_ALL}")

            has_scene_heading = False
            has_character = False
            has_dialogue = False

            for i, para in enumerate(paragraphs, 1):
                para_type = para.get("Type")
                if not para_type:
                    errors.append(f"第 {i} 个 Paragraph 缺少 Type 属性")
                elif para_type not in valid_paragraph_types:
                    warnings.append(f"第 {i} 个 Paragraph 的 Type='{para_type}' 不是标准类型")

                if para_type == "Scene Heading":
                    has_scene_heading = True
                elif para_type == "Character":
                    has_character = True
                elif para_type == "Dialogue":
                    has_dialogue = True

                text_elems = para.findall("Text")
                if not text_elems:
                    warnings.append(f"第 {i} 个 Paragraph (Type={para_type}) 缺少 <Text> 元素")
                else:
                    for text_elem in text_elems:
                        font = text_elem.get("Font")
                        if not font:
                            warnings.append(f"第 {i} 个 Paragraph 的 Text 缺少 Font 属性")
                        elif "Courier" not in font:
                            warnings.append(f"Text Font 建议使用 Courier 字体 (当前: {font})")

                        size = text_elem.get("Size")
                        if not size:
                            warnings.append(f"第 {i} 个 Paragraph 的 Text 缺少 Size 属性")
                        elif size != "12":
                            warnings.append(f"Text Size 建议为 12 (当前: {size})")

            if has_scene_heading:
                print(f"{Fore.GREEN}✓ 包含场景标题 (Scene Heading){Style.RESET_ALL}")
            else:
                warnings.append("建议包含场景标题 (Scene Heading)")

            if has_character:
                print(f"{Fore.GREEN}✓ 包含角色名 (Character){Style.RESET_ALL}")
            else:
                warnings.append("未找到角色名元素")

            if has_dialogue:
                print(f"{Fore.GREEN}✓ 包含对话 (Dialogue){Style.RESET_ALL}")
            else:
                warnings.append("未找到对话元素")

    if root.find("WordProcessing") is not None:
        print(f"{Fore.GREEN}✓ 找到 <WordProcessing> 元素{Style.RESET_ALL}")
    else:
        warnings.append("建议添加 <WordProcessing>No</WordProcessing> 元素")

    with open(filepath, 'r', encoding='utf-8') as f:
        first_line = f.readline().strip()

    if first_line.startswith('<?xml'):
        print(f"{Fore.GREEN}✓ 包含XML声明{Style.RESET_ALL}")
        if 'encoding="UTF-8"' in first_line or "encoding='UTF-8'" in first_line:
            print(f"{Fore.GREEN}✓ 编码声明正确 (UTF-8){Style.RESET_ALL}")
        else:
            warnings.append("建议添加 encoding=\"UTF-8\" 声明")
    else:
        errors.append("文件必须以 XML 声明开始")

    print(f"\n{Fore.CYAN}{'-'*60}{Style.RESET_ALL}")
    print(f"验证结果：")
    print(f"  错误: {len(errors)} 个")
    print(f"  警告: {len(warnings)} 个")

    if errors:
        print(f"\n{Fore.RED}错误列表：{Style.RESET_ALL}")
        for err in errors:
            print(f"  ❌ {err}")

    if warnings:
        print(f"\n{Fore.YELLOW}警告列表：{Style.RESET_ALL}")
        for warn in warnings:
            print(f"  ⚠  {warn}")

    if errors:
        print(f"\n{Fore.RED}❌ FDX文件不符合规范，存在错误{Style.RESET_ALL}")
        return False
    elif warnings:
        print(f"\n{Fore.YELLOW}⚠ FDX文件基本符合规范，但有一些警告（不影响使用）{Style.RESET_ALL}")
        return True
    else:
        print(f"\n{Fore.GREEN}🎉 FDX文件完全符合规范！{Style.RESET_ALL}")
        return True


def main():
    if len(sys.argv) < 2:
        print(f"用法: python {sys.argv[0]} <fdx_file_path>")
        print(f"示例: python {sys.argv[0]} output/script.fdx")
        sys.exit(1)

    filepath = sys.argv[1]
    success = validate_fdx(filepath)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
