#!/usr/bin/env python3
"""PDF 信息提取与处理工具 - 命令行工具集"""

import argparse
import csv
import json
import os
import sys
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from pypdf import PdfReader, PdfWriter
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


def check_pypdf():
    if not PYPDF_AVAILABLE:
        print("错误: pypdf 库未安装，请运行: pip install pypdf")
        sys.exit(1)


def check_pdfplumber():
    if not PDFPLUMBER_AVAILABLE:
        print("错误: pdfplumber 库未安装，请运行: pip install pdfplumber")
        sys.exit(1)


def check_pymupdf():
    if not PYMUPDF_AVAILABLE:
        print("错误: PyMuPDF 库未安装，请运行: pip install PyMuPDF")
        sys.exit(1)


def check_pil():
    if not PIL_AVAILABLE:
        print("错误: Pillow 库未安装，请运行: pip install Pillow")
        sys.exit(1)


# ============================================================
# 信息提取
# ============================================================

def cmd_info(args):
    check_pypdf()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    try:
        reader = PdfReader(filepath)
    except Exception as e:
        print(f"错误: 无法读取 PDF 文件 - {e}")
        sys.exit(1)

    if reader.is_encrypted:
        print("警告: 此 PDF 文件已加密，信息可能不完整。")
        print("请使用 'decrypt' 命令提供密码后再查看完整信息。")

    info = reader.metadata if reader.metadata else {}

    print("=" * 50)
    print(f"文件名: {os.path.basename(filepath)}")
    print(f"文件路径: {os.path.abspath(filepath)}")
    print(f"文件大小: {os.path.getsize(filepath) / 1024:.2f} KB")
    print(f"页数: {len(reader.pages)}")
    print(f"是否加密: {'是' if reader.is_encrypted else '否'}")
    print()
    print("元数据:")
    print("-" * 50)
    print(f"  标题 (Title):       {info.get('/Title', 'N/A')}")
    print(f"  作者 (Author):      {info.get('/Author', 'N/A')}")
    print(f"  主题 (Subject):     {info.get('/Subject', 'N/A')}")
    print(f"  关键字 (Keywords):  {info.get('/Keywords', 'N/A')}")
    print(f"  创建软件 (Creator): {info.get('/Creator', 'N/A')}")
    print(f"  PDF 生成器 (Producer): {info.get('/Producer', 'N/A')}")
    print(f"  创建日期 (CreationDate): {_parse_pdf_date(info.get('/CreationDate', 'N/A'))}")
    print(f"  修改日期 (ModDate):      {_parse_pdf_date(info.get('/ModDate', 'N/A'))}")
    print("=" * 50)


def _parse_pdf_date(date_str: str) -> str:
    if not date_str or date_str == "N/A":
        return "N/A"
    try:
        raw = date_str.replace("D:", "").strip()
        year = int(raw[0:4])
        month = int(raw[4:6])
        day = int(raw[6:8])
        hour = int(raw[8:10]) if len(raw) >= 10 else 0
        minute = int(raw[10:12]) if len(raw) >= 12 else 0
        second = int(raw[12:14]) if len(raw) >= 14 else 0
        dt = datetime(year, month, day, hour, minute, second)
        tz = ""
        if len(raw) >= 15 and raw[14] in ('+', '-'):
            tz = raw[14:19]
        return f"{dt.strftime('%Y-%m-%d %H:%M:%S')} {tz}".strip()
    except (ValueError, IndexError):
        return date_str


# ============================================================
# 文本提取
# ============================================================

def cmd_text(args):
    check_pdfplumber()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    output_dir = args.output
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    try:
        with pdfplumber.open(filepath) as pdf:
            total_pages = len(pdf.pages)
            print(f"共 {total_pages} 页")
            all_text = []
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                all_text.append(f"=== 第 {i + 1} 页 ===\n{text}\n")
                if output_dir:
                    page_file = os.path.join(output_dir, f"page_{i + 1}.txt")
                    with open(page_file, "w", encoding="utf-8") as f:
                        f.write(text)
                    print(f"  第 {i + 1} 页 -> {page_file}")

            combined = "\n".join(all_text)
            if output_dir:
                full_file = os.path.join(output_dir, "full_text.txt")
                with open(full_file, "w", encoding="utf-8") as f:
                    f.write(combined)
                print(f"\n完整文本已保存到: {full_file}")
            else:
                print(combined)
    except Exception as e:
        print(f"错误: 提取文本失败 - {e}")
        sys.exit(1)


# ============================================================
# 图片提取
# ============================================================

def cmd_images(args):
    check_pymupdf()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    output_dir = args.output
    os.makedirs(output_dir, exist_ok=True)

    try:
        doc = fitz.open(filepath)
        total_images = 0
        for page_index in range(len(doc)):
            page = doc[page_index]
            image_list = page.get_images(full=True)
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                image_name = f"page{page_index + 1}_img{img_index + 1}.{image_ext}"
                image_path = os.path.join(output_dir, image_name)
                with open(image_path, "wb") as f:
                    f.write(image_bytes)
                total_images += 1
                print(f"  提取: {image_name} ({len(image_bytes)} bytes)")
        doc.close()
        print(f"\n共提取 {total_images} 张图片，保存到: {output_dir}")
    except Exception as e:
        print(f"错误: 提取图片失败 - {e}")
        sys.exit(1)


# ============================================================
# 表格提取
# ============================================================

def cmd_tables(args):
    check_pdfplumber()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    output_dir = args.output
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    try:
        with pdfplumber.open(filepath) as pdf:
            total_tables = 0
            for page_index, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                for table_index, table in enumerate(tables):
                    total_tables += 1
                    if output_dir:
                        csv_path = os.path.join(
                            output_dir,
                            f"page{page_index + 1}_table{table_index + 1}.csv"
                        )
                        with open(csv_path, "w", newline="", encoding="utf-8") as f:
                            writer = csv.writer(f)
                            for row in table:
                                writer.writerow([cell if cell else "" for cell in row])
                        print(f"  表格 {total_tables}: {csv_path}")
                    else:
                        print(f"\n=== 第 {page_index + 1} 页 表格 {table_index + 1} ===")
                        for row in table:
                            print(" | ".join([cell if cell else "" for cell in row]))
            print(f"\n共提取 {total_tables} 个表格")
    except Exception as e:
        print(f"错误: 提取表格失败 - {e}")
        sys.exit(1)


# ============================================================
# 书签提取
# ============================================================

def cmd_bookmarks(args):
    check_pypdf()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    try:
        reader = PdfReader(filepath)
        if reader.is_encrypted:
            print("警告: 此 PDF 文件已加密，请先解密。")
            sys.exit(1)

        try:
            outline = reader.outline
        except Exception:
            print("此 PDF 文件不包含书签/目录。")
            return

        if not outline:
            print("此 PDF 文件不包含书签/目录。")
            return

        print(f"{'书签标题':<60} {'页码':>6}")
        print("-" * 68)
        _print_outline(outline, reader, indent=0)
    except Exception as e:
        print(f"错误: 提取书签失败 - {e}")
        sys.exit(1)


def _print_outline(items, reader, indent=0):
    for item in items:
        if isinstance(item, list):
            _print_outline(item, reader, indent + 2)
        else:
            try:
                title = "N/A"
                page_num = "N/A"

                if hasattr(item, "title") and item.title is not None:
                    title = str(item.title)
                elif hasattr(item, "get"):
                    title_val = item.get("/Title")
                    if title_val:
                        title = str(title_val)

                try:
                    page_idx = reader.get_destination_page_number(item)
                    page_num = str(page_idx + 1)
                except Exception:
                    pass

                title_width = 60 - indent
                padded_title = " " * indent + title.ljust(title_width)
                print(f"{padded_title} {page_num:>6}")
            except Exception as e:
                print(f"{' ' * indent}Error: {e}")


# ============================================================
# 加密检查
# ============================================================

def cmd_encrypt_check(args):
    check_pypdf()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    try:
        reader = PdfReader(filepath)
        if reader.is_encrypted:
            print("此 PDF 文件已加密。")
            print("请使用 'decrypt' 命令并提供密码来解密此文件。")
        else:
            print("此 PDF 文件未加密。")
    except Exception as e:
        print(f"错误: 检查加密状态失败 - {e}")
        sys.exit(1)


# ============================================================
# 解密
# ============================================================

def cmd_decrypt(args):
    check_pypdf()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    try:
        reader = PdfReader(filepath)
    except Exception as e:
        print(f"错误: 无法读取 PDF 文件 - {e}")
        sys.exit(1)

    if not reader.is_encrypted:
        print("此 PDF 文件未加密，无需解密。")
        return

    try:
        result = reader.decrypt(args.password)
        if result == 0:
            print("错误: 密码错误，解密失败。")
            sys.exit(1)
        elif result == 1:
            print("已使用用户密码解密。")
        elif result == 2:
            print("已使用所有者密码解密。")
    except Exception as e:
        print(f"错误: 解密失败 - {e}")
        sys.exit(1)

    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)

    if reader.metadata:
        writer.add_metadata(reader.metadata)

    output_path = args.output
    with open(output_path, "wb") as f:
        writer.write(f)

    print(f"解密后的文件已保存到: {output_path}")

    print("\n解密后文件信息:")
    print("-" * 50)
    print(f"  页数: {len(reader.pages)}")
    if reader.metadata:
        info = reader.metadata
        print(f"  标题: {info.get('/Title', 'N/A')}")
        print(f"  作者: {info.get('/Author', 'N/A')}")
        print(f"  创建软件: {info.get('/Creator', 'N/A')}")


# ============================================================
# 合并
# ============================================================

def cmd_merge(args):
    check_pypdf()
    writer = PdfWriter()

    pdf_files = args.inputs
    for pdf_file in pdf_files:
        if not os.path.exists(pdf_file):
            print(f"错误: 文件不存在 - {pdf_file}")
            sys.exit(1)

    try:
        for pdf_file in pdf_files:
            reader = PdfReader(pdf_file)
            for page in reader.pages:
                writer.add_page(page)
            print(f"  已添加: {pdf_file} ({len(reader.pages)} 页)")

        with open(args.output, "wb") as f:
            writer.write(f)
        print(f"\n合并完成，共 {len(pdf_files)} 个文件。")
        print(f"输出文件: {args.output}")
    except Exception as e:
        print(f"错误: 合并失败 - {e}")
        sys.exit(1)


# ============================================================
# 拆分
# ============================================================

def cmd_split(args):
    check_pypdf()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    try:
        reader = PdfReader(filepath)
        total_pages = len(reader.pages)
        output_dir = args.output_dir
        os.makedirs(output_dir, exist_ok=True)

        ranges_str = args.ranges
        ranges = _parse_ranges(ranges_str, total_pages)

        base_name = os.path.splitext(os.path.basename(filepath))[0]
        part_count = 0
        for start, end in ranges:
            if start < 1 or end > total_pages or start > end:
                print(f"警告: 跳过无效范围 {start}-{end} (共 {total_pages} 页)")
                continue

            part_count += 1
            writer = PdfWriter()
            for page_num in range(start - 1, end):
                writer.add_page(reader.pages[page_num])

            output_file = os.path.join(output_dir, f"{base_name}_pages{start}-{end}.pdf")
            with open(output_file, "wb") as f:
                writer.write(f)
            print(f"  拆分: {output_file} (第 {start}-{end} 页)")

        print(f"\n共拆分为 {part_count} 个文件，保存到: {output_dir}")
    except Exception as e:
        print(f"错误: 拆分失败 - {e}")
        sys.exit(1)


def _parse_ranges(ranges_str: str, total_pages: int):
    ranges = []
    parts = ranges_str.split(",")
    for part in parts:
        part = part.strip()
        if "-" in part:
            start_str, end_str = part.split("-", 1)
            start = int(start_str)
            end = int(end_str)
        else:
            page = int(part)
            start = end = page
        ranges.append((start, end))
    return ranges


# ============================================================
# 压缩
# ============================================================

def cmd_compress(args):
    check_pypdf()
    check_pymupdf()
    check_pil()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    quality = args.quality
    if not 1 <= quality <= 100:
        print("错误: 图片质量必须在 1-100 之间")
        sys.exit(1)

    try:
        doc = fitz.open(filepath)
        output_dir = args.output_dir if args.output_dir else "pdf_compress_temp"
        os.makedirs(output_dir, exist_ok=True)

        temp_dir = os.path.join(output_dir, "_temp_images")
        os.makedirs(temp_dir, exist_ok=True)

        print("分析 PDF 中的图片...")
        image_count = 0
        for page_index in range(len(doc)):
            page = doc[page_index]
            image_list = page.get_images(full=True)
            for img in image_list:
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"].lower()

                img_path = os.path.join(temp_dir, f"img_{xref}.{image_ext}")
                with open(img_path, "wb") as f:
                    f.write(image_bytes)

                if image_ext in ("jpg", "jpeg", "png", "webp"):
                    try:
                        pil_img = Image.open(img_path)
                        if image_ext == "png":
                            pil_img.save(img_path, "PNG", optimize=True)
                        else:
                            pil_img.save(img_path, "JPEG", quality=quality, optimize=True)
                        image_count += 1
                    except Exception:
                        pass

        print(f"已处理 {image_count} 张图片")

        new_pdf_path = os.path.join(output_dir, "compressed.pdf")
        doc.save(new_pdf_path, deflate=True, garbage=4)
        doc.close()

        original_size = os.path.getsize(filepath)
        new_size = os.path.getsize(new_pdf_path)
        compression_rate = (1 - new_size / original_size) * 100

        print(f"\n压缩完成!")
        print(f"  原始大小: {original_size / 1024:.2f} KB")
        print(f"  压缩后:   {new_size / 1024:.2f} KB")
        print(f"  压缩率:   {compression_rate:.1f}%")
        print(f"  输出文件: {new_pdf_path}")

        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception as e:
        print(f"错误: 压缩失败 - {e}")
        sys.exit(1)


# ============================================================
# 旋转
# ============================================================

def cmd_rotate(args):
    check_pypdf()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    angle = args.angle
    if angle not in (90, 180, 270):
        print("错误: 旋转角度必须是 90、180 或 270")
        sys.exit(1)

    try:
        reader = PdfReader(filepath)
        writer = PdfWriter()

        total_pages = len(reader.pages)
        page_nums = _parse_page_list(args.pages, total_pages)

        for i in range(total_pages):
            page = reader.pages[i]
            if i + 1 in page_nums:
                page.rotate(angle)
                print(f"  第 {i + 1} 页: 旋转 {angle}°")
            writer.add_page(page)

        if reader.metadata:
            writer.add_metadata(reader.metadata)

        with open(args.output, "wb") as f:
            writer.write(f)

        print(f"\n旋转完成，输出文件: {args.output}")
    except Exception as e:
        print(f"错误: 旋转失败 - {e}")
        sys.exit(1)


def _parse_page_list(pages_str: str, total_pages: int):
    if not pages_str or pages_str == "all":
        return set(range(1, total_pages + 1))
    pages = set()
    for part in pages_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            pages.update(range(int(start), int(end) + 1))
        else:
            pages.add(int(part))
    return pages


# ============================================================
# 注释提取
# ============================================================

def cmd_annotations(args):
    check_pymupdf()
    filepath = args.pdf
    if not os.path.exists(filepath):
        print(f"错误: 文件不存在 - {filepath}")
        sys.exit(1)

    output_file = args.output
    try:
        doc = fitz.open(filepath)
        annotations = []

        for page_index in range(len(doc)):
            page = doc[page_index]
            for annot in page.annots() or []:
                annot_type = annot.type[1] if annot.type else "Unknown"
                content = annot.info.get("content", "") if annot.info else ""
                title = annot.info.get("title", "") if annot.info else ""
                subject = annot.info.get("subject", "") if annot.info else ""
                rect = annot.rect
                color = annot.colors.get("stroke", None) if annot.colors else None
                created = annot.info.get("creationDate", "") if annot.info else ""
                modified = annot.info.get("modDate", "") if annot.info else ""

                annotations.append({
                    "page": page_index + 1,
                    "type": annot_type,
                    "title": title,
                    "subject": subject,
                    "content": content,
                    "rect": [rect.x0, rect.y0, rect.x1, rect.y1] if rect else None,
                    "color": str(color) if color else None,
                    "created": created,
                    "modified": modified,
                })

        doc.close()

        if not annotations:
            print("此 PDF 文件不包含注释。")
            return

        if output_file:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(annotations, f, ensure_ascii=False, indent=2)
            print(f"共提取 {len(annotations)} 条注释，保存到: {output_file}")
        else:
            print(f"共提取 {len(annotations)} 条注释:\n")
            for ann in annotations:
                print(f"  第 {ann['page']} 页 [{ann['type']}]: {ann['content'][:80]}...")
                if ann['title']:
                    print(f"    标题: {ann['title']}")
    except Exception as e:
        print(f"错误: 提取注释失败 - {e}")
        sys.exit(1)


# ============================================================
# 批量处理
# ============================================================

def cmd_batch(args):
    check_pypdf()
    folder = args.folder
    if not os.path.isdir(folder):
        print(f"错误: 目录不存在 - {folder}")
        sys.exit(1)

    pdf_files = sorted(Path(folder).glob("*.pdf"))
    if not pdf_files:
        print(f"在目录中未找到 PDF 文件: {folder}")
        return

    print(f"找到 {len(pdf_files)} 个 PDF 文件\n")

    report = []
    for pdf_file in pdf_files:
        try:
            reader = PdfReader(str(pdf_file))
            info = reader.metadata if reader.metadata else {}
            file_info = {
                "filename": pdf_file.name,
                "size_kb": round(os.path.getsize(pdf_file) / 1024, 2),
                "pages": len(reader.pages),
                "encrypted": reader.is_encrypted,
                "title": info.get("/Title", ""),
                "author": info.get("/Author", ""),
                "creator": info.get("/Creator", ""),
                "creation_date": str(info.get("/CreationDate", "")),
                "mod_date": str(info.get("/ModDate", "")),
            }
            report.append(file_info)
            status = "加密" if reader.is_encrypted else "正常"
            print(f"  {pdf_file.name}: {len(reader.pages)} 页 [{status}]")
        except Exception as e:
            print(f"  {pdf_file.name}: 读取失败 - {e}")
            report.append({
                "filename": pdf_file.name,
                "error": str(e),
            })

    report_file = args.report
    if report_file:
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n汇总报告已保存到: {report_file}")
    else:
        print(f"\n共处理 {len(report)} 个 PDF 文件。")


# ============================================================
# 主入口
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="PDF 信息提取与处理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s info document.pdf
  %(prog)s text document.pdf --output ./text_output
  %(prog)s images document.pdf --output ./images
  %(prog)s tables document.pdf --output ./tables
  %(prog)s bookmarks document.pdf
  %(prog)s encrypt-check document.pdf
  %(prog)s decrypt encrypted.pdf --password mypass --output decrypted.pdf
  %(prog)s merge --output merged.pdf a.pdf b.pdf c.pdf
  %(prog)s split document.pdf --ranges 1-3,5,7-10 --output-dir ./split_output
  %(prog)s compress document.pdf --quality 50 --output-dir ./compressed
  %(prog)s rotate document.pdf --angle 90 --pages 1,3,5 --output rotated.pdf
  %(prog)s annotations document.pdf --output annotations.json
  %(prog)s batch ./pdf_folder --report report.json
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # info
    p_info = subparsers.add_parser("info", help="显示 PDF 元数据信息")
    p_info.add_argument("pdf", help="PDF 文件路径")
    p_info.set_defaults(func=cmd_info)

    # text
    p_text = subparsers.add_parser("text", help="提取 PDF 文本内容")
    p_text.add_argument("pdf", help="PDF 文件路径")
    p_text.add_argument("--output", "-o", help="输出目录（每页保存为单独文件）", default=None)
    p_text.set_defaults(func=cmd_text)

    # images
    p_images = subparsers.add_parser("images", help="提取 PDF 中的图片")
    p_images.add_argument("pdf", help="PDF 文件路径")
    p_images.add_argument("--output", "-o", required=True, help="图片输出目录")
    p_images.set_defaults(func=cmd_images)

    # tables
    p_tables = subparsers.add_parser("tables", help="提取 PDF 中的表格数据")
    p_tables.add_argument("pdf", help="PDF 文件路径")
    p_tables.add_argument("--output", "-o", help="CSV 输出目录", default=None)
    p_tables.set_defaults(func=cmd_tables)

    # bookmarks
    p_bookmarks = subparsers.add_parser("bookmarks", help="提取 PDF 书签目录")
    p_bookmarks.add_argument("pdf", help="PDF 文件路径")
    p_bookmarks.set_defaults(func=cmd_bookmarks)

    # encrypt-check
    p_encrypt = subparsers.add_parser("encrypt-check", help="检查 PDF 是否加密")
    p_encrypt.add_argument("pdf", help="PDF 文件路径")
    p_encrypt.set_defaults(func=cmd_encrypt_check)

    # decrypt
    p_decrypt = subparsers.add_parser("decrypt", help="解密 PDF 文件")
    p_decrypt.add_argument("pdf", help="PDF 文件路径")
    p_decrypt.add_argument("--password", "-p", required=True, help="解密密码")
    p_decrypt.add_argument("--output", "-o", required=True, help="解密后输出文件路径")
    p_decrypt.set_defaults(func=cmd_decrypt)

    # merge
    p_merge = subparsers.add_parser("merge", help="合并多个 PDF 文件")
    p_merge.add_argument("--output", "-o", required=True, help="合并后输出文件路径")
    p_merge.add_argument("inputs", nargs="+", help="输入 PDF 文件列表（按顺序合并）")
    p_merge.set_defaults(func=cmd_merge)

    # split
    p_split = subparsers.add_parser("split", help="按页码范围拆分 PDF")
    p_split.add_argument("pdf", help="PDF 文件路径")
    p_split.add_argument("--ranges", "-r", required=True, help="页码范围，如 '1-3,5,7-10'")
    p_split.add_argument("--output-dir", "-o", required=True, help="拆分文件输出目录")
    p_split.set_defaults(func=cmd_split)

    # compress
    p_compress = subparsers.add_parser("compress", help="压缩 PDF 文件")
    p_compress.add_argument("pdf", help="PDF 文件路径")
    p_compress.add_argument("--quality", "-q", type=int, default=50, help="图片质量 (1-100, 默认 50)")
    p_compress.add_argument("--output-dir", "-o", help="压缩后输出目录", default=None)
    p_compress.set_defaults(func=cmd_compress)

    # rotate
    p_rotate = subparsers.add_parser("rotate", help="旋转 PDF 页面")
    p_rotate.add_argument("pdf", help="PDF 文件路径")
    p_rotate.add_argument("--angle", "-a", type=int, required=True, choices=[90, 180, 270], help="旋转角度")
    p_rotate.add_argument("--pages", "-p", default="all", help="要旋转的页码，如 '1,3,5' 或 'all'（默认全部）")
    p_rotate.add_argument("--output", "-o", required=True, help="旋转后输出文件路径")
    p_rotate.set_defaults(func=cmd_rotate)

    # annotations
    p_annot = subparsers.add_parser("annotations", help="提取 PDF 注释和标记内容")
    p_annot.add_argument("pdf", help="PDF 文件路径")
    p_annot.add_argument("--output", "-o", help="注释输出 JSON 文件路径", default=None)
    p_annot.set_defaults(func=cmd_annotations)

    # batch
    p_batch = subparsers.add_parser("batch", help="批量处理文件夹内的 PDF 文件")
    p_batch.add_argument("folder", help="包含 PDF 文件的文件夹路径")
    p_batch.add_argument("--report", "-r", help="汇总报告输出路径 (JSON 格式)", default=None)
    p_batch.set_defaults(func=cmd_batch)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == "__main__":
    main()