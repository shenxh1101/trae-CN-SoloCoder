#!/usr/bin/env python3

import argparse
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from datetime import datetime

from PIL import Image, ExifTags

SUPPORTED_FORMATS = {"jpg", "jpeg", "png", "bmp", "webp", "tiff", "tif"}
FORMAT_EXTENSIONS = {
    "jpg": ".jpg",
    "jpeg": ".jpg",
    "png": ".png",
    "bmp": ".bmp",
    "webp": ".webp",
    "tiff": ".tiff",
    "tif": ".tiff",
}
PILLOW_FORMAT_MAP = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "bmp": "BMP",
    "webp": "WEBP",
    "tiff": "TIFF",
    "tif": "TIFF",
}

_report_lock = threading.Lock()
_conversion_report = []


def parse_size(size_str):
    try:
        w, h = size_str.lower().split("x")
        return int(w), int(h)
    except Exception:
        raise argparse.ArgumentTypeError(f"Invalid size format '{size_str}', expected WxH (e.g. 800x600)")


def collect_images(source, recursive):
    source = Path(source)
    extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff", ".tif"}
    images = []
    if source.is_file():
        if source.suffix.lower() in extensions:
            images.append(source)
        return images
    if not source.is_dir():
        return images
    if recursive:
        for f in source.rglob("*"):
            if f.is_file() and f.suffix.lower() in extensions:
                images.append(f)
    else:
        for f in source.iterdir():
            if f.is_file() and f.suffix.lower() in extensions:
                images.append(f)
    return sorted(images)


def build_output_path(src_path, source_root, dest_root, output_format, prefix, suffix):
    src_path = Path(src_path)
    source_root = Path(source_root)
    dest_root = Path(dest_root)
    try:
        rel = src_path.relative_to(source_root)
    except ValueError:
        rel = src_path.name
    new_name = f"{prefix}{src_path.stem}{suffix}{FORMAT_EXTENSIONS[output_format]}"
    return dest_root / rel.parent / new_name


def handle_transparency(img, output_format):
    if output_format in ("jpg", "jpeg", "bmp"):
        if img.mode in ("RGBA", "LA", "PA"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "LA":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[-1])
            return bg
        if img.mode == "P":
            if "transparency" in img.info:
                img = img.convert("RGBA")
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[-1])
                return bg
            return img.convert("RGB")
        if img.mode != "RGB":
            return img.convert("RGB")
    return img


def handle_cmyk_to_rgb(img, convert_cmyk, output_format=None):
    if img.mode in ("CMYK", "CMYK;L", "CMYK;A"):
        cmyk_supported = output_format in ("tiff", "tif", "jpg", "jpeg") if output_format else False
        if convert_cmyk or not cmyk_supported:
            img = img.convert("RGB")
    return img


def resize_image(img, resize_width, resize_size):
    if resize_width:
        ratio = resize_width / img.width
        new_h = int(img.height * ratio)
        img = img.resize((resize_width, new_h), Image.LANCZOS)
    elif resize_size:
        w, h = resize_size
        img = img.resize((w, h), Image.LANCZOS)
    return img


def rotate_image(img, angle):
    if angle == 0:
        return img
    rotations = {90: Image.Transpose.ROTATE_270, 180: Image.Transpose.ROTATE_180, 270: Image.Transpose.ROTATE_90}
    if angle in rotations:
        img = img.transpose(rotations[angle])
    else:
        img = img.rotate(-angle, expand=True)
    return img


def add_text_watermark(img, text, position="bottom-right", opacity=128, font_size=None):
    from PIL import ImageDraw, ImageFont

    if img.mode != "RGBA":
        img = img.convert("RGBA")
    watermark_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(watermark_layer)

    if font_size is None:
        font_size = max(img.width // 20, 16)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except Exception:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    margin = max(img.width // 40, 10)

    positions = {
        "top-left": (margin, margin),
        "top-right": (img.width - tw - margin, margin),
        "bottom-left": (margin, img.height - th - margin),
        "bottom-right": (img.width - tw - margin, img.height - th - margin),
        "center": ((img.width - tw) // 2, (img.height - th) // 2),
    }
    pos = positions.get(position, positions["bottom-right"])
    draw.text(pos, text, fill=(255, 255, 255, opacity), font=font)

    result = Image.alpha_composite(img, watermark_layer)
    return result


def add_image_watermark(img, watermark_path, position="bottom-right", opacity=128):
    wm = Image.open(watermark_path).convert("RGBA")

    if img.mode != "RGBA":
        img = img.convert("RGBA")

    max_w = img.width // 3
    max_h = img.height // 3
    if wm.width > max_w or wm.height > max_h:
        ratio = min(max_w / wm.width, max_h / wm.height)
        wm = wm.resize((int(wm.width * ratio), int(wm.height * ratio)), Image.LANCZOS)

    alpha = wm.split()[-1]
    alpha = alpha.point(lambda p: int(p * opacity / 255))
    wm.putalpha(alpha)

    margin = max(img.width // 40, 10)
    positions = {
        "top-left": (margin, margin),
        "top-right": (img.width - wm.width - margin, margin),
        "bottom-left": (margin, img.height - wm.height - margin),
        "bottom-right": (img.width - wm.width - margin, img.height - wm.height - margin),
        "center": ((img.width - wm.width) // 2, (img.height - wm.height) // 2),
    }
    pos = positions.get(position, positions["bottom-right"])

    watermark_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    watermark_layer.paste(wm, pos, wm)

    result = Image.alpha_composite(img, watermark_layer)
    return result


def extract_exif(img):
    try:
        return img.getexif()
    except Exception:
        return None


def convert_image(
    src_path,
    dest_path,
    output_format,
    quality=85,
    resize_width=None,
    resize_size=None,
    rotate_angle=0,
    keep_exif=False,
    watermark_text=None,
    watermark_image=None,
    watermark_position="bottom-right",
    watermark_opacity=128,
    cmyk_to_rgb=False,
    prefix="",
    suffix="",
    source_root=None,
    dest_root=None,
):
    src_path = Path(src_path)
    dest_path = Path(dest_path)

    dest_path.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(src_path)
    original_mode = img.mode

    exif_data = None
    if keep_exif:
        exif_data = extract_exif(img)

    img = handle_cmyk_to_rgb(img, cmyk_to_rgb, output_format)
    img = rotate_image(img, rotate_angle)
    img = resize_image(img, resize_width, resize_size)

    if watermark_text:
        img = add_text_watermark(img, watermark_text, watermark_position, watermark_opacity)
    if watermark_image:
        img = add_image_watermark(img, watermark_image, watermark_position, watermark_opacity)

    img = handle_transparency(img, output_format)

    save_kwargs = {}
    fmt = PILLOW_FORMAT_MAP[output_format]

    if fmt == "JPEG":
        save_kwargs["quality"] = quality
        save_kwargs["optimize"] = True
    elif fmt == "PNG":
        save_kwargs["optimize"] = True
    elif fmt == "WEBP":
        save_kwargs["quality"] = quality
    elif fmt == "TIFF":
        save_kwargs["compression"] = "tiff_lzw"

    if keep_exif and exif_data:
        try:
            save_kwargs["exif"] = exif_data.tobytes()
        except Exception:
            pass

    img.save(str(dest_path), format=fmt, **save_kwargs)

    return {
        "source": str(src_path),
        "dest": str(dest_path),
        "original_mode": original_mode,
        "original_size": src_path.stat().st_size,
        "output_size": dest_path.stat().st_size,
        "dimensions": f"{img.width}x{img.height}",
    }


def preview_mode(images, source_root, dest_root, output_format, quality, prefix, suffix, **kwargs):
    total_original_size = 0
    estimated_output_size = 0

    print(f"\n{'=' * 60}")
    print(f"  预览模式 - 转换计划")
    print(f"{'=' * 60}")
    print(f"  源目录:       {source_root}")
    print(f"  目标目录:     {dest_root}")
    print(f"  输出格式:     {output_format.upper()}")
    print(f"  JPG质量:      {quality}" if output_format in ("jpg", "jpeg") else "")
    print(f"  文件名模板:   {prefix}{{name}}{suffix}.{FORMAT_EXTENSIONS[output_format].lstrip('.')}")
    print(f"  递归处理:     {'是' if kwargs.get('recursive') else '否'}")
    if kwargs.get("resize_width"):
        print(f"  等比缩放宽度: {kwargs['resize_width']}px")
    if kwargs.get("resize_size"):
        print(f"  固定尺寸:     {kwargs['resize_size'][0]}x{kwargs['resize_size'][1]}")
    if kwargs.get("rotate_angle"):
        print(f"  旋转角度:     {kwargs['rotate_angle']}°")
    print(f"{'=' * 60}")
    print(f"\n  将要转换的文件 ({len(images)} 个):\n")

    for i, img_path in enumerate(images, 1):
        size = img_path.stat().st_size
        total_original_size += size

        if output_format in ("jpg", "jpeg"):
            ratio = max(0.05, quality / 100.0) * 0.3
        elif output_format == "png":
            ratio = 0.7
        elif output_format == "webp":
            ratio = max(0.05, quality / 100.0) * 0.25
        elif output_format == "bmp":
            try:
                with Image.open(img_path) as im:
                    ratio = (im.width * im.height * 3) / size
            except Exception:
                ratio = 2.0
        else:
            ratio = 0.8

        est = int(size * ratio)
        estimated_output_size += est
        rel = img_path.relative_to(source_root) if img_path.is_relative_to(source_root) else img_path.name
        print(f"    {i:4d}. {rel} ({_format_size(size)}) -> 预估 {_format_size(est)}")

    print(f"\n{'=' * 60}")
    print(f"  图片总数:       {len(images)}")
    print(f"  原始大小总和:   {_format_size(total_original_size)}")
    print(f"  预估输出大小:   {_format_size(estimated_output_size)}")
    print(f"  预估节省:       {_format_size(total_original_size - estimated_output_size)}" if total_original_size > estimated_output_size else f"  预估增加:       {_format_size(estimated_output_size - total_original_size)}")
    print(f"{'=' * 60}\n")


def _format_size(n):
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def process_single(
    img_path, source_root, dest_root, output_format, quality, resize_width, resize_size,
    rotate_angle, keep_exif, watermark_text, watermark_image, watermark_position,
    watermark_opacity, cmyk_to_rgb, prefix, suffix,
):
    global _conversion_report
    src = Path(img_path)
    out_path = build_output_path(src, source_root, dest_root, output_format, prefix, suffix)
    start = time.time()
    try:
        result = convert_image(
            src_path=src,
            dest_path=out_path,
            output_format=output_format,
            quality=quality,
            resize_width=resize_width,
            resize_size=resize_size,
            rotate_angle=rotate_angle,
            keep_exif=keep_exif,
            watermark_text=watermark_text,
            watermark_image=watermark_image,
            watermark_position=watermark_position,
            watermark_opacity=watermark_opacity,
            cmyk_to_rgb=cmyk_to_rgb,
            prefix=prefix,
            suffix=suffix,
            source_root=source_root,
            dest_root=dest_root,
        )
        elapsed = time.time() - start
        with _report_lock:
            _conversion_report.append({
                "source": str(src),
                "dest": str(out_path),
                "status": "success",
                "original_size": result["original_size"],
                "output_size": result["output_size"],
                "time": round(elapsed, 3),
            })
        rel = src.relative_to(source_root) if src.is_relative_to(source_root) else src.name
        print(f"  ✓ {rel} -> {_format_size(result['output_size'])} ({elapsed:.2f}s)")
        return True
    except Exception as e:
        elapsed = time.time() - start
        with _report_lock:
            _conversion_report.append({
                "source": str(src),
                "dest": str(out_path),
                "status": "failed",
                "error": str(e),
                "time": round(elapsed, 3),
            })
        rel = src.relative_to(source_root) if src.is_relative_to(source_root) else src.name
        print(f"  ✗ {rel} - ERROR: {e}")
        return False


def write_report(log_path, report, source_root, dest_root, output_format, start_time, end_time):
    total = len(report)
    success = sum(1 for r in report if r["status"] == "success")
    failed = sum(1 for r in report if r["status"] == "failed")
    total_original = sum(r.get("original_size", 0) for r in report if r["status"] == "success")
    total_output = sum(r.get("output_size", 0) for r in report if r["status"] == "success")
    total_time = round(end_time - start_time, 2)

    lines = []
    lines.append(f"图片格式批量转换报告")
    lines.append(f"{'=' * 60}")
    lines.append(f"生成时间:     {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"源目录:       {source_root}")
    lines.append(f"目标目录:     {dest_root}")
    lines.append(f"输出格式:     {output_format.upper()}")
    lines.append(f"总耗时:       {total_time}s")
    lines.append(f"总文件数:     {total}")
    lines.append(f"成功:         {success}")
    lines.append(f"失败:         {failed}")
    lines.append(f"原始大小:     {_format_size(total_original)}")
    lines.append(f"输出大小:     {_format_size(total_output)}")
    lines.append(f"{'=' * 60}")
    lines.append("")
    lines.append(f"{'状态':<8} {'耗时':<10} {'原始大小':<12} {'输出大小':<12} {'文件路径'}")
    lines.append(f"{'-' * 80}")

    for r in report:
        status = "成功" if r["status"] == "success" else "失败"
        t = f"{r.get('time', 0)}s"
        orig = _format_size(r.get("original_size", 0)) if r["status"] == "success" else "-"
        out = _format_size(r.get("output_size", 0)) if r["status"] == "success" else "-"
        err = r.get("error", "")
        path = r["source"]
        if err:
            lines.append(f"{status:<8} {t:<10} {orig:<12} {out:<12} {path} ({err})")
        else:
            lines.append(f"{status:<8} {t:<10} {orig:<12} {out:<12} {path}")

    report_text = "\n".join(lines)
    log_path = Path(log_path)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text(report_text, encoding="utf-8")
    print(f"\n转换报告已保存到: {log_path}")

    json_path = log_path.with_suffix(".json")
    json_data = {
        "generated_at": datetime.now().isoformat(),
        "source_root": str(source_root),
        "dest_root": str(dest_root),
        "output_format": output_format,
        "total_time": total_time,
        "total_files": total,
        "success_count": success,
        "failed_count": failed,
        "total_original_size": total_original,
        "total_output_size": total_output,
        "records": report,
    }
    json_path.write_text(json.dumps(json_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"JSON报告已保存到: {json_path}")


def main():
    parser = argparse.ArgumentParser(
        description="图片格式批量转换工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s -s ./photos -o jpg -d ./output
  %(prog)s -s ./photos -o png --recursive --preview
  %(prog)s -s photo.png -o webp -q 90
  %(prog)s -s ./photos -o jpg --resize-width 800 --prefix thumb_
  %(prog)s -s ./photos -o jpg --rotate 90 --keep-exif
  %(prog)s -s ./photos -o jpg --watermark-text "© 2025" --watermark-position bottom-right
        """,
    )

    parser.add_argument("-s", "--source", required=True, help="源文件夹或单个文件路径")
    parser.add_argument("-o", "--output-format", required=True, choices=list(SUPPORTED_FORMATS), help="输出格式")
    parser.add_argument("-d", "--dest", help="目标文件夹 (默认: 源文件夹_converted)")
    parser.add_argument("-q", "--quality", type=int, default=85, help="JPG/WEBP压缩质量 1-100 (默认: 85)")
    parser.add_argument("--resize-width", type=int, help="按指定宽度等比缩放")
    parser.add_argument("--resize-size", type=parse_size, help="按固定尺寸裁剪，格式: WxH")
    parser.add_argument("--keep-exif", action="store_true", help="保留EXIF信息 (默认丢弃)")
    parser.add_argument("--recursive", action="store_true", help="递归处理子文件夹")
    parser.add_argument("--preview", action="store_true", help="预览模式，仅显示转换计划")
    parser.add_argument("--threads", type=int, default=4, help="线程数 (默认: 4)")
    parser.add_argument("--prefix", default="", help="文件名前缀")
    parser.add_argument("--suffix", default="", help="文件名后缀")
    parser.add_argument("--rotate", type=int, default=0, choices=[0, 90, 180, 270], help="旋转角度: 0, 90, 180, 270")
    parser.add_argument("--watermark-text", help="文字水印内容")
    parser.add_argument("--watermark-image", help="图片水印路径")
    parser.add_argument("--watermark-position", default="bottom-right", choices=["top-left", "top-right", "bottom-left", "bottom-right", "center"], help="水印位置 (默认: bottom-right)")
    parser.add_argument("--watermark-opacity", type=int, default=128, help="水印透明度 0-255 (默认: 128)")
    parser.add_argument("--cmyk-to-rgb", action="store_true", help="将CMYK颜色空间转换为RGB")
    parser.add_argument("--log", help="转换报告日志保存路径")

    args = parser.parse_args()

    if args.quality < 1 or args.quality > 100:
        parser.error("--quality 必须在 1-100 之间")

    if args.watermark_opacity < 0 or args.watermark_opacity > 255:
        parser.error("--watermark-opacity 必须在 0-255 之间")

    if args.resize_width and args.resize_size:
        parser.error("--resize-width 和 --resize-size 不能同时使用")

    source = Path(args.source)
    if not source.exists():
        print(f"错误: 源路径不存在 - {source}")
        sys.exit(1)

    if args.watermark_image and not Path(args.watermark_image).exists():
        print(f"错误: 水印图片不存在 - {args.watermark_image}")
        sys.exit(1)

    if source.is_file():
        source_root = source.parent
    else:
        source_root = source

    dest_root = Path(args.dest) if args.dest else source_root.parent / f"{source_root.name}_converted"

    output_format = args.output_format.lower()

    images = collect_images(source, args.recursive)
    if not images:
        print("未找到可转换的图片文件。")
        sys.exit(0)

    if args.preview:
        preview_mode(
            images, source_root, dest_root, output_format, args.quality,
            args.prefix, args.suffix, recursive=args.recursive,
            resize_width=args.resize_width, resize_size=args.resize_size,
            rotate_angle=args.rotate,
        )
        return

    print(f"\n开始转换: {len(images)} 个文件")
    print(f"输出格式: {output_format.upper()} | 目标: {dest_root}")
    print(f"{'─' * 60}")

    start_time = time.time()
    success_count = 0
    fail_count = 0

    with ThreadPoolExecutor(max_workers=args.threads) as executor:
        futures = {}
        for img_path in images:
            future = executor.submit(
                process_single,
                img_path, source_root, dest_root, output_format, args.quality,
                args.resize_width, args.resize_size, args.rotate, args.keep_exif,
                args.watermark_text, args.watermark_image, args.watermark_position,
                args.watermark_opacity, args.cmyk_to_rgb, args.prefix, args.suffix,
            )
            futures[future] = img_path

        for future in as_completed(futures):
            if future.result():
                success_count += 1
            else:
                fail_count += 1

    end_time = time.time()
    total_time = round(end_time - start_time, 2)

    total_original = sum(r.get("original_size", 0) for r in _conversion_report if r["status"] == "success")
    total_output = sum(r.get("output_size", 0) for r in _conversion_report if r["status"] == "success")

    print(f"\n{'─' * 60}")
    print(f"转换完成!")
    print(f"  成功: {success_count} | 失败: {fail_count} | 总耗时: {total_time}s")
    print(f"  原始大小: {_format_size(total_original)} -> 输出大小: {_format_size(total_output)}")

    if args.log:
        write_report(args.log, _conversion_report, source_root, dest_root, output_format, start_time, end_time)
    else:
        default_log = Path.cwd() / f"conversion_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        if _conversion_report:
            write_report(default_log, _conversion_report, source_root, dest_root, output_format, start_time, end_time)


if __name__ == "__main__":
    main()
