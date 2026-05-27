#!/usr/bin/env python3
import argparse
import os
import sys
import random
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageEnhance


POSITIONS = [
    'top-left', 'top-center', 'top-right',
    'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right',
    'random'
]


def parse_position(pos):
    if pos == 'random':
        return random.choice(POSITIONS[:-1])
    return pos


def calculate_position(img_size, wm_size, position, margin=20):
    img_w, img_h = img_size
    wm_w, wm_h = wm_size
    pos_map = {
        'top-left': (margin, margin),
        'top-center': ((img_w - wm_w) // 2, margin),
        'top-right': (img_w - wm_w - margin, margin),
        'center-left': (margin, (img_h - wm_h) // 2),
        'center': ((img_w - wm_w) // 2, (img_h - wm_h) // 2),
        'center-right': (img_w - wm_w - margin, (img_h - wm_h) // 2),
        'bottom-left': (margin, img_h - wm_h - margin),
        'bottom-center': ((img_w - wm_w) // 2, img_h - wm_h - margin),
        'bottom-right': (img_w - wm_w - margin, img_h - wm_h - margin),
    }
    if position == 'random':
        x = random.randint(margin, max(margin, img_w - wm_w - margin))
        y = random.randint(margin, max(margin, img_h - wm_h - margin))
        return (x, y)
    return pos_map[position]


def create_text_watermark(text, font_size, color, opacity, rotation, shadow_offset, shadow_color):
    font = ImageFont.load_default()
    try:
        font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", font_size)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    dummy = Image.new('RGBA', (1, 1))
    dummy_draw = ImageDraw.Draw(dummy)
    bbox = dummy_draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    padding = max(shadow_offset if shadow_offset else 0, 10)
    wm_width = text_w + padding * 2
    wm_height = text_h + padding * 2

    wm = Image.new('RGBA', (wm_width, wm_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(wm)

    r, g, b = color
    alpha = int(255 * opacity)
    fill_color = (r, g, b, alpha)

    if shadow_offset and shadow_offset > 0:
        sr, sg, sb = shadow_color
        shadow_alpha = int(255 * opacity)
        shadow_fill = (sr, sg, sb, shadow_alpha)
        draw.text((padding + shadow_offset, padding + shadow_offset), text, font=font, fill=shadow_fill)

    draw.text((padding, padding), text, font=font, fill=fill_color)

    if rotation != 0:
        wm = wm.rotate(rotation, resample=Image.BICUBIC, expand=True)

    return wm


def create_image_watermark(logo_path, scale, opacity):
    logo = Image.open(logo_path).convert('RGBA')
    w, h = logo.size
    new_size = (int(w * scale), int(h * scale))
    logo = logo.resize(new_size, Image.LANCZOS)
    
    if opacity < 1.0:
        alpha = logo.split()[-1]
        alpha = ImageEnhance.Brightness(alpha).enhance(opacity)
        logo.putalpha(alpha)
    
    return logo


def apply_watermark(img, wm, position, margin=20):
    pos = calculate_position(img.size, wm.size, position, margin)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    layer.paste(wm, pos, wm)
    return Image.alpha_composite(img, layer)


def get_image_files(source_dir, min_width, min_height, exclude_files=None):
    if exclude_files is None:
        exclude_files = []
    exclude_abs = {os.path.abspath(f) for f in exclude_files}
    image_extensions = ('.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG')
    image_files = []
    for root, _, files in os.walk(source_dir):
        for file in files:
            if file.endswith(image_extensions):
                filepath = os.path.join(root, file)
                if os.path.abspath(filepath) in exclude_abs:
                    continue
                try:
                    with Image.open(filepath) as img:
                        w, h = img.size
                        if w >= min_width and h >= min_height:
                            image_files.append(filepath)
                except Exception as e:
                    logging.warning(f"Skipping {filepath}: {e}")
    return image_files


def process_image(filepath, source_dir, target_dir, watermarks, preserve_structure, prefix, suffix, quality, preview):
    try:
        rel_path = os.path.relpath(filepath, source_dir)
        if preserve_structure:
            target_subdir = os.path.join(target_dir, os.path.dirname(rel_path))
            os.makedirs(target_subdir, exist_ok=True)
        else:
            target_subdir = target_dir
        
        filename = os.path.basename(filepath)
        name, ext = os.path.splitext(filename)
        new_filename = f"{prefix}{name}{suffix}{ext}"
        target_path = os.path.join(target_subdir, new_filename)
        
        if preview:
            desc = f"[预览] {filepath} -> {target_path}"
            for wm in watermarks:
                if wm['type'] == 'text':
                    desc += f" | 文字水印: '{wm['text']}' 位置:{wm['position']}"
                else:
                    desc += f" | 图片水印: {os.path.basename(wm['logo_path'])} 位置:{wm['position']}"
            print(desc)
            return True, filepath
        
        with Image.open(filepath) as img:
            img = img.convert('RGBA')
            for wm in watermarks:
                if wm['type'] == 'text':
                    wm_img = create_text_watermark(
                        wm['text'],
                        wm['font_size'],
                        wm['color'],
                        wm['opacity'],
                        wm['rotation'],
                        wm['shadow_offset'],
                        wm['shadow_color']
                    )
                else:
                    wm_img = create_image_watermark(
                        wm['logo_path'],
                        wm['scale'],
                        wm['opacity']
                    )
                img = apply_watermark(img, wm_img, wm['position'], wm['margin'])
            
            if ext.lower() in ('.jpg', '.jpeg'):
                img = img.convert('RGB')
                img.save(target_path, quality=quality, optimize=True)
            else:
                img.save(target_path)
        
        return True, filepath
    except Exception as e:
        return False, f"{filepath}: {str(e)}"


def parse_color(color_str):
    color_str = color_str.strip('()')
    parts = color_str.split(',')
    return tuple(int(p.strip()) for p in parts)


def main():
    parser = argparse.ArgumentParser(description='批量图片水印工具')
    parser.add_argument('--source', required=True, help='源文件夹路径')
    parser.add_argument('--target', required=True, help='目标文件夹路径')
    parser.add_argument('--text', action='append', help='文字水印内容，可多次指定添加多个文字水印')
    parser.add_argument('--font-size', type=int, default=36, help='字体大小')
    parser.add_argument('--color', default='(255,255,255)', help='文字颜色，格式 (R,G,B)')
    parser.add_argument('--opacity', type=float, default=0.5, help='透明度 0.0-1.0')
    parser.add_argument('--rotation', type=int, default=0, help='旋转角度')
    parser.add_argument('--position', action='append', default=['bottom-right'], help=f'水印位置，可多次指定')
    parser.add_argument('--logo', help='图片水印Logo路径')
    parser.add_argument('--logo-scale', type=float, default=0.2, help='Logo缩放比例')
    parser.add_argument('--logo-opacity', type=float, default=0.5, help='Logo透明度')
    parser.add_argument('--margin', type=int, default=20, help='水印边距')
    parser.add_argument('--shadow-offset', type=int, default=0, help='文字阴影偏移')
    parser.add_argument('--shadow-color', default='(0,0,0)', help='阴影颜色')
    parser.add_argument('--prefix', default='', help='文件名前缀')
    parser.add_argument('--suffix', default='', help='文件名后缀')
    parser.add_argument('--preserve-structure', action='store_true', help='保留原目录结构')
    parser.add_argument('--preview', action='store_true', help='预览模式，不保存图片')
    parser.add_argument('--threads', type=int, default=4, help='线程数')
    parser.add_argument('--quality', type=int, default=85, help='JPEG质量 1-100')
    parser.add_argument('--min-width', type=int, default=0, help='最小宽度')
    parser.add_argument('--min-height', type=int, default=0, help='最小高度')
    parser.add_argument('--log', default='watermark.log', help='日志文件名')
    
    args = parser.parse_args()
    
    logging.basicConfig(
        filename=args.log,
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        encoding='utf-8'
    )
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    logging.getLogger('').addHandler(console)
    
    if not os.path.isdir(args.source):
        logging.error(f"源文件夹不存在: {args.source}")
        sys.exit(1)
    
    os.makedirs(args.target, exist_ok=True)
    
    watermarks = []
    
    positions = args.position if args.position else ['bottom-right']
    
    if args.text:
        color = parse_color(args.color)
        shadow_color = parse_color(args.shadow_color)
        for i, text in enumerate(args.text):
            pos = positions[i % len(positions)]
            watermarks.append({
                'type': 'text',
                'text': text,
                'font_size': args.font_size,
                'color': color,
                'opacity': args.opacity,
                'rotation': args.rotation,
                'position': parse_position(pos),
                'margin': args.margin,
                'shadow_offset': args.shadow_offset,
                'shadow_color': shadow_color
            })
    
    if args.logo:
        if not os.path.isfile(args.logo):
            logging.error(f"Logo文件不存在: {args.logo}")
            sys.exit(1)
        if args.text:
            for pos in positions[len(args.text):]:
                watermarks.append({
                    'type': 'image',
                    'logo_path': args.logo,
                    'scale': args.logo_scale,
                    'opacity': args.logo_opacity,
                    'position': parse_position(pos),
                    'margin': args.margin
                })
        else:
            for pos in positions:
                watermarks.append({
                    'type': 'image',
                    'logo_path': args.logo,
                    'scale': args.logo_scale,
                    'opacity': args.logo_opacity,
                    'position': parse_position(pos),
                    'margin': args.margin
                })
    
    if not watermarks:
        logging.error("请指定至少一个水印（--text 或 --logo）")
        sys.exit(1)
    
    exclude_files = [args.logo] if args.logo else []
    image_files = get_image_files(args.source, args.min_width, args.min_height, exclude_files)
    logging.info(f"找到 {len(image_files)} 张图片待处理")
    
    success_files = []
    failed_files = []
    
    if args.preview:
        for filepath in image_files:
            ok, result = process_image(
                filepath, args.source, args.target, watermarks,
                args.preserve_structure, args.prefix, args.suffix,
                args.quality, args.preview
            )
            if ok:
                success_files.append(result)
            else:
                failed_files.append(result)
    else:
        with ThreadPoolExecutor(max_workers=args.threads) as executor:
            futures = []
            for filepath in image_files:
                futures.append(executor.submit(
                    process_image, filepath, args.source, args.target, watermarks,
                    args.preserve_structure, args.prefix, args.suffix,
                    args.quality, args.preview
                ))
            for future in as_completed(futures):
                ok, result = future.result()
                if ok:
                    success_files.append(result)
                else:
                    failed_files.append(result)
    
    logging.info(f"处理完成: 成功 {len(success_files)} 张, 失败 {len(failed_files)} 张")
    
    if failed_files:
        logging.error("失败文件列表:")
        for f in failed_files:
            logging.error(f"  {f}")
    
    with open(args.log, 'a', encoding='utf-8') as logfile:
        logfile.write(f"\n{'='*50}\n")
        logfile.write(f"处理时间: {datetime.now()}\n")
        logfile.write(f"成功文件:\n")
        for f in success_files:
            logfile.write(f"  ✓ {f}\n")
        if failed_files:
            logfile.write(f"失败文件:\n")
            for f in failed_files:
                logfile.write(f"  ✗ {f}\n")


if __name__ == '__main__':
    main()
