#!/usr/bin/env python3
"""图片元数据批量编辑工具 - 支持EXIF修改、CSV导入、数字水印、元数据报告等功能"""

import argparse
import csv
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path

np = None
Image = None
TAGS = None
GPSTAGS = None
piexif = None
dct = None
idct = None


def _ensure_pil():
    global Image, TAGS, GPSTAGS
    if Image is None:
        try:
            from PIL import Image as _Image
            from PIL.ExifTags import TAGS as _TAGS, GPSTAGS as _GPSTAGS
            Image = _Image
            TAGS = _TAGS
            GPSTAGS = _GPSTAGS
        except ImportError:
            print("错误: 需要安装 Pillow 库")
            print("  运行: pip install Pillow")
            sys.exit(1)


def _ensure_numpy():
    global np
    if np is None:
        try:
            import numpy as _np
            np = _np
        except ImportError:
            print("错误: 需要安装 numpy 库")
            print("  运行: pip install numpy")
            sys.exit(1)


def _ensure_piexif():
    global piexif
    if piexif is None:
        try:
            import piexif as _piexif
            piexif = _piexif
        except ImportError:
            print("错误: 需要安装 piexif 库")
            print("  运行: pip install piexif")
            sys.exit(1)


def _ensure_scipy():
    global dct, idct
    if dct is None or idct is None:
        try:
            from scipy.fftpack import dct as _dct, idct as _idct
            dct = _dct
            idct = _idct
        except ImportError:
            print("错误: 需要安装 scipy 库")
            print("  运行: pip install scipy")
            sys.exit(1)


def _build_exif_field_map():
    _ensure_piexif()
    return {
        'author': ('0th', piexif.ImageIFD.Artist),
        'copyright': ('0th', piexif.ImageIFD.Copyright),
        'description': ('0th', piexif.ImageIFD.ImageDescription),
        'software': ('0th', piexif.ImageIFD.Software),
        'datetime': ('0th', piexif.ImageIFD.DateTime),
        'make': ('0th', piexif.ImageIFD.Make),
        'model': ('0th', piexif.ImageIFD.Model),
        'datetime_original': ('Exif', piexif.ExifIFD.DateTimeOriginal),
        'datetime_digitized': ('Exif', piexif.ExifIFD.DateTimeDigitized),
    }


def _build_clearable_fields():
    _ensure_piexif()
    return {
        'gps': ['GPS'],
        'datetime_original': [('Exif', piexif.ExifIFD.DateTimeOriginal)],
        'datetime_digitized': [('Exif', piexif.ExifIFD.DateTimeDigitized)],
        'artist': [('0th', piexif.ImageIFD.Artist)],
        'copyright': [('0th', piexif.ImageIFD.Copyright)],
        'description': [('0th', piexif.ImageIFD.ImageDescription)],
        'software': [('0th', piexif.ImageIFD.Software)],
        'all_exif': ['0th', 'Exif', 'GPS', 'Interop'],
    }


IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}


def find_images(folder, recursive=True):
    """递归查找文件夹中的所有JPG和PNG图片"""
    folder = Path(folder)
    if not folder.exists():
        print(f"错误: 文件夹不存在: {folder}")
        return []
    images = []
    if recursive:
        for root, _dirs, files in os.walk(folder):
            for f in files:
                if Path(f).suffix in IMAGE_EXTENSIONS:
                    images.append(Path(root) / f)
    else:
        for f in folder.iterdir():
            if f.is_file() and f.suffix in IMAGE_EXTENSIONS:
                images.append(f)
    images.sort()
    return images


def backup_image(image_path, backup_dir, source_folder=None):
    """将图片备份到指定目录，保留相对路径结构"""
    image_path = Path(image_path).resolve()
    backup_dir = Path(backup_dir).resolve()
    if source_folder:
        source_folder = Path(source_folder).resolve()
        rel = image_path.relative_to(source_folder)
    else:
        rel = image_path.relative_to(image_path.anchor)
    dest = backup_dir / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        shutil.copy2(str(image_path), str(dest))
        return dest
    return None


def backup_images(image_paths, backup_dir, source_folder=None):
    """批量备份图片"""
    backup_dir = Path(backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for p in image_paths:
        result = backup_image(p, backup_dir, source_folder=source_folder)
        if result:
            count += 1
    print(f"已备份 {count} 张图片到: {backup_dir}")
    return count


def read_exif(image_path):
    """读取图片的EXIF数据"""
    _ensure_pil()
    image_path = Path(image_path)
    if image_path.suffix.lower() in {'.jpg', '.jpeg'}:
        return _read_jpg_exif(image_path)
    elif image_path.suffix.lower() == '.png':
        return _read_png_metadata(image_path)
    return {}


def _read_jpg_exif(image_path):
    """读取JPG的EXIF数据"""
    result = {}
    _ensure_piexif()
    try:
        exif_dict = piexif.load(str(image_path))
        for ifd_name in ('0th', 'Exif', 'GPS', 'Interop', '1st'):
            if ifd_name not in exif_dict:
                continue
            for tag_id, value in exif_dict[ifd_name].items():
                if ifd_name == 'GPS':
                    tag = GPSTAGS.get(tag_id, tag_id)
                else:
                    tag = TAGS.get(tag_id, tag_id)
                result[f"{ifd_name}:{tag}"] = _exif_value_to_str(value)
    except Exception:
        pass
    return result


def _read_png_metadata(image_path):
    """读取PNG的文本元数据"""
    _ensure_pil()
    result = {}
    try:
        with Image.open(str(image_path)) as img:
            info = img.info
            for key, value in info.items():
                result[key] = str(value)
    except Exception:
        pass
    return result


def _exif_value_to_str(value):
    """将EXIF值转换为可读字符串"""
    if isinstance(value, bytes):
        try:
            return value.decode('utf-8', errors='replace').rstrip('\x00')
        except Exception:
            return value.hex()
    if isinstance(value, tuple):
        return str(tuple(_exif_value_to_str(v) for v in value))
    if isinstance(value, (int, float)):
        return str(value)
    return str(value)


def write_exif_field(image_path, field_name, value):
    """写入单个EXIF字段"""
    _ensure_pil()
    image_path = Path(image_path)
    if image_path.suffix.lower() in {'.jpg', '.jpeg'}:
        _write_jpg_exif_field(image_path, field_name, value)
    elif image_path.suffix.lower() == '.png':
        _write_png_metadata_field(image_path, field_name, value)


def _write_jpg_exif_field(image_path, field_name, value):
    """写入JPG的EXIF字段"""
    _ensure_piexif()
    exif_field_map = _build_exif_field_map()
    try:
        exif_dict = piexif.load(str(image_path))
    except Exception:
        exif_dict = {'0th': {}, 'Exif': {}, 'GPS': {}, 'Interop': {}, '1st': {}}

    if field_name in exif_field_map:
        ifd, tag = exif_field_map[field_name]
        if ifd not in exif_dict:
            exif_dict[ifd] = {}
        if isinstance(value, str):
            value = value.encode('utf-8')
        exif_dict[ifd][tag] = value
    else:
        desc_val = value.encode('utf-8') if isinstance(value, str) else value
        exif_dict['0th'][piexif.ImageIFD.ImageDescription] = desc_val

    exif_bytes = piexif.dump(exif_dict)
    piexif.insert(exif_bytes, str(image_path))


def _write_png_metadata_field(image_path, field_name, value):
    """写入PNG的文本元数据"""
    _ensure_pil()
    with Image.open(str(image_path)) as img:
        info = dict(img.info)
        info[field_name] = value
        img.save(str(image_path), pnginfo=_make_png_info(info))


def _make_png_info(info_dict):
    """创建PNG元数据对象"""
    from PIL.PngImagePlugin import PngInfo
    pnginfo = PngInfo()
    for key, value in info_dict.items():
        pnginfo.add_text(str(key), str(value))
    return pnginfo


def set_keywords(image_path, keywords):
    """设置图片关键词（IPTC风格）"""
    image_path = Path(image_path)
    if image_path.suffix.lower() in {'.jpg', '.jpeg'}:
        kw_str = '; '.join(keywords) if isinstance(keywords, list) else keywords
        write_exif_field(image_path, 'description', kw_str)
    elif image_path.suffix.lower() == '.png':
        _write_png_metadata_field(image_path, 'Keywords', '; '.join(keywords) if isinstance(keywords, list) else keywords)


def clear_metadata_fields(image_path, fields):
    """清除指定的元数据字段"""
    image_path = Path(image_path)
    if image_path.suffix.lower() not in {'.jpg', '.jpeg'}:
        print(f"  跳过非JPG文件: {image_path.name}")
        return
    _ensure_piexif()
    clearable_fields = _build_clearable_fields()
    try:
        exif_dict = piexif.load(str(image_path))
    except Exception:
        print(f"  无EXIF数据: {image_path.name}")
        return

    for field in fields:
        if field in clearable_fields:
            targets = clearable_fields[field]
            for target in targets:
                if isinstance(target, str):
                    if target in exif_dict:
                        exif_dict[target] = {}
                elif isinstance(target, tuple):
                    ifd, tag = target
                    if ifd in exif_dict and tag in exif_dict[ifd]:
                        del exif_dict[ifd][tag]

    exif_bytes = piexif.dump(exif_dict)
    piexif.insert(exif_bytes, str(image_path))


def copy_exif_from_source(source_path, dest_path):
    """从源图片复制EXIF数据到目标图片"""
    _ensure_piexif()
    source_path = Path(source_path)
    dest_path = Path(dest_path)
    if source_path.suffix.lower() in {'.jpg', '.jpeg'} and dest_path.suffix.lower() in {'.jpg', '.jpeg'}:
        try:
            exif_dict = piexif.load(str(source_path))
            exif_bytes = piexif.dump(exif_dict)
            piexif.insert(exif_bytes, str(dest_path))
        except Exception as e:
            print(f"  复制EXIF失败: {e}")


def embed_dct_watermark(image_path, watermark_text, alpha=15.0, block_size=8):
    """在图片中嵌入频域数字水印（DCT域）"""
    _ensure_pil()
    _ensure_numpy()
    _ensure_scipy()
    with Image.open(str(image_path)).convert('RGB') as img:
        img_array = np.array(img, dtype=np.float64)

    wm_bits = _text_to_bits(watermark_text)
    wm_len = len(wm_bits)

    h, w, c = img_array.shape
    h_blocks = h // block_size
    w_blocks = w // block_size
    total_blocks = h_blocks * w_blocks

    if total_blocks < wm_len * 2:
        raise ValueError(f"图片太小，无法嵌入水印。需要至少 {wm_len * 2} 个块，只有 {total_blocks} 个")

    idx = 0
    y_channel = img_array[:, :, 0].copy()

    for by in range(h_blocks):
        for bx in range(w_blocks):
            if idx >= wm_len:
                break
            y0 = by * block_size
            x0 = bx * block_size
            block = y_channel[y0:y0+block_size, x0:x0+block_size]
            dct_block = dct(dct(block, axis=0, norm='ortho'), axis=1, norm='ortho')

            pos1 = (3, 4)
            pos2 = (4, 3)
            if wm_bits[idx] == 1:
                dct_block[pos1] += alpha
                dct_block[pos2] += alpha
            else:
                dct_block[pos1] -= alpha
                dct_block[pos2] -= alpha

            idct_block = idct(idct(dct_block, axis=0, norm='ortho'), axis=1, norm='ortho')
            y_channel[y0:y0+block_size, x0:x0+block_size] = idct_block
            idx += 1
        if idx >= wm_len:
            break

    img_array[:, :, 0] = np.clip(y_channel, 0, 255)
    result = Image.fromarray(img_array.astype(np.uint8))

    if image_path.suffix.lower() == '.png':
        result.save(str(image_path))
    else:
        result.save(str(image_path), quality=95)

    return wm_len


def verify_dct_watermark(image_path, watermark_text, alpha=15.0, block_size=8, threshold=0.7):
    """验证图片中是否包含指定的频域数字水印"""
    _ensure_pil()
    _ensure_numpy()
    _ensure_scipy()
    with Image.open(str(image_path)).convert('RGB') as img:
        img_array = np.array(img, dtype=np.float64)

    wm_bits = _text_to_bits(watermark_text)
    wm_len = len(wm_bits)

    h, w, c = img_array.shape
    h_blocks = h // block_size
    w_blocks = w // block_size

    y_channel = img_array[:, :, 0]
    extracted = []
    idx = 0

    for by in range(h_blocks):
        for bx in range(w_blocks):
            if idx >= wm_len:
                break
            y0 = by * block_size
            x0 = bx * block_size
            block = y_channel[y0:y0+block_size, x0:x0+block_size]
            dct_block = dct(dct(block, axis=0, norm='ortho'), axis=1, norm='ortho')

            pos1 = (3, 4)
            pos2 = (4, 3)
            val = dct_block[pos1] + dct_block[pos2]
            extracted.append(1 if val > 0 else 0)
            idx += 1
        if idx >= wm_len:
            break

    matches = sum(1 for a, b in zip(wm_bits, extracted) if a == b)
    similarity = matches / wm_len if wm_len > 0 else 0
    return similarity >= threshold, similarity


def _text_to_bits(text):
    """将文本转换为比特序列（含长度头）"""
    encoded = text.encode('utf-8')
    length = len(encoded)
    length_bits = [(length >> i) & 1 for i in range(31, -1, -1)]
    char_bits = []
    for byte in encoded:
        char_bits.extend([(byte >> i) & 1 for i in range(7, -1, -1)])
    return length_bits + char_bits


def get_exif_datetime(image_path):
    """获取图片的EXIF拍摄时间"""
    _ensure_piexif()
    try:
        exif_dict = piexif.load(str(image_path))
        dt = exif_dict.get('Exif', {}).get(piexif.ExifIFD.DateTimeOriginal)
        if dt:
            return dt.decode('utf-8', errors='replace') if isinstance(dt, bytes) else str(dt)
        dt = exif_dict.get('0th', {}).get(piexif.ImageIFD.DateTime)
        if dt:
            return dt.decode('utf-8', errors='replace') if isinstance(dt, bytes) else str(dt)
    except Exception:
        pass
    return None


def set_file_timestamp(image_path, dt_str=None, atime=None, mtime=None):
    """修改文件的创建时间和修改时间"""
    image_path = Path(image_path)
    dt = None
    if dt_str:
        try:
            dt = datetime.strptime(dt_str, '%Y:%m:%d %H:%M:%S')
        except ValueError:
            try:
                dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                print(f"  时间格式错误: {dt_str}，请使用 YYYY:MM:DD HH:MM:SS 或 YYYY-MM-DD HH:MM:SS")
                return
        timestamp = dt.timestamp()
    elif mtime:
        timestamp = mtime
    else:
        return

    stat = image_path.stat()
    current_atime = atime if atime else stat.st_atime
    os.utime(str(image_path), (current_atime, timestamp))

    if sys.platform == 'darwin' and dt is not None:
        try:
            import subprocess
            subprocess.run(['SetFile', '-d', dt.strftime('%m/%d/%Y %H:%M:%S'), str(image_path)],
                           capture_output=True, check=False)
        except FileNotFoundError:
            pass


def rename_by_exif_date(image_path, dry_run=False):
    """根据EXIF拍摄时间重命名图片"""
    image_path = Path(image_path)
    dt_str = get_exif_datetime(image_path)
    if not dt_str:
        print(f"  跳过（无EXIF时间）: {image_path.name}")
        return None
    try:
        dt = datetime.strptime(dt_str, '%Y:%m:%d %H:%M:%S')
    except ValueError:
        try:
            dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            print(f"  跳过（时间格式错误）: {image_path.name}")
            return None

    new_name = dt.strftime('%Y%m%d_%H%M%S') + image_path.suffix.lower()
    new_path = image_path.parent / new_name

    counter = 1
    while new_path.exists() and new_path != image_path:
        new_name = dt.strftime('%Y%m%d_%H%M%S') + f'_{counter}' + image_path.suffix.lower()
        new_path = image_path.parent / new_name
        counter += 1

    if new_path == image_path:
        return None

    if dry_run:
        print(f"  将重命名: {image_path.name} -> {new_name}")
    else:
        image_path.rename(new_path)
        print(f"  已重命名: {image_path.name} -> {new_name}")
    return new_path


def search_images_by_metadata(image_paths, field, keyword):
    """按元数据字段搜索图片"""
    results = []
    field_lower = field.lower()
    keyword_lower = keyword.lower()
    for p in image_paths:
        meta = read_exif(p)
        for key, value in meta.items():
            if field_lower in key.lower() and keyword_lower in str(value).lower():
                results.append((p, key, value))
                break
    return results


def generate_report(image_paths, output_csv=None):
    """生成元数据报告"""
    report = []
    common_fields = set()
    all_data = []

    for p in image_paths:
        meta = read_exif(p)
        meta['文件路径'] = str(p)
        meta['文件名'] = p.name
        all_data.append(meta)
        common_fields.update(meta.keys())

    fields = sorted(common_fields)

    if output_csv:
        with open(output_csv, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
            writer.writeheader()
            for data in all_data:
                writer.writerow(data)
        print(f"报告已导出到: {output_csv}")
    else:
        for data in all_data:
            print(f"\n{'='*60}")
            print(f"文件: {data.get('文件名', 'N/A')}")
            print(f"路径: {data.get('文件路径', 'N/A')}")
            for key in fields:
                if key in ('文件路径', '文件名'):
                    continue
                if key in data:
                    print(f"  {key}: {data[key]}")

    return all_data


def cmd_edit(args):
    """批量修改EXIF信息"""
    images = find_images(args.folder, recursive=args.recursive)
    if not images:
        print("未找到图片文件")
        return

    if args.backup:
        backup_dir = args.backup_dir or str(Path(args.folder) / 'backup')
        backup_images(images, backup_dir, source_folder=args.folder)

    updates = {}
    if args.author:
        updates['author'] = args.author
    if args.copyright:
        updates['copyright'] = args.copyright
    if args.description:
        updates['description'] = args.description
    if args.keywords:
        updates['keywords'] = args.keywords

    if not updates:
        print("未指定任何要修改的字段")
        return

    for img in images:
        try:
            for field, value in updates.items():
                if field == 'keywords':
                    set_keywords(img, value.split(';'))
                else:
                    write_exif_field(img, field, value)
            print(f"✓ 已修改: {img.name}")
        except Exception as e:
            print(f"✗ 修改失败 {img.name}: {e}")

    print(f"\n完成！共处理 {len(images)} 张图片")


def cmd_import_csv(args):
    """从CSV文件导入元数据"""
    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        print(f"错误: CSV文件不存在: {csv_path}")
        return

    base_dir = Path(args.folder) if args.folder else csv_path.parent

    rows = []
    with open(str(csv_path), 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    if args.backup:
        images = []
        for row in rows:
            img_path = Path(row.get('path', row.get('路径', '')))
            if not img_path.is_absolute():
                img_path = base_dir / img_path
            if img_path.exists():
                images.append(img_path)
        if images:
            backup_dir = args.backup_dir or str(base_dir / 'backup')
            backup_images(images, backup_dir, source_folder=str(base_dir))

    count = 0
    for row in rows:
        img_path_str = row.get('path', row.get('路径', ''))
        img_path = Path(img_path_str)
        if not img_path.is_absolute():
            img_path = base_dir / img_path
        if not img_path.exists():
            print(f"✗ 文件不存在: {img_path}")
            continue

        try:
            for key, value in row.items():
                key_lower = key.lower().strip()
                if key_lower in ('path', '路径'):
                    continue
                if key_lower in _build_exif_field_map():
                    write_exif_field(img_path, key_lower, value)
                elif key_lower == 'keywords' or key_lower == '关键词':
                    set_keywords(img_path, value.split(';'))
                else:
                    if img_path.suffix.lower() in {'.jpg', '.jpeg'}:
                        write_exif_field(img_path, 'description', value)
                    else:
                        _write_png_metadata_field(img_path, key, value)
            print(f"✓ 已导入: {img_path.name}")
            count += 1
        except Exception as e:
            print(f"✗ 导入失败 {img_path.name}: {e}")

    print(f"\n完成！共导入 {count}/{len(rows)} 张图片的元数据")


def cmd_copy_meta(args):
    """从第一张图片复制元数据到其他图片"""
    images = find_images(args.folder, recursive=args.recursive)
    if len(images) < 2:
        print("至少需要2张图片才能复制元数据")
        return

    source = images[0]
    dests = images[1:]

    if args.backup:
        backup_dir = args.backup_dir or str(Path(args.folder) / 'backup')
        backup_images(dests, backup_dir, source_folder=args.folder)

    print(f"源图片: {source.name}")
    print(f"目标图片数量: {len(dests)}")

    for dest in dests:
        try:
            copy_exif_from_source(source, dest)
            print(f"✓ 已复制元数据到: {dest.name}")
        except Exception as e:
            print(f"✗ 复制失败 {dest.name}: {e}")

    print(f"\n完成！已从 {source.name} 复制元数据到 {len(dests)} 张图片")


def cmd_clear(args):
    """清除指定元数据字段"""
    images = find_images(args.folder, recursive=args.recursive)
    if not images:
        print("未找到图片文件")
        return

    if args.backup:
        backup_dir = args.backup_dir or str(Path(args.folder) / 'backup')
        backup_images(images, backup_dir, source_folder=args.folder)

    fields = [f.strip() for f in args.fields.split(',')]
    clearable_fields = _build_clearable_fields()
    for field in fields:
        if field not in clearable_fields:
            print(f"警告: 未知字段 '{field}'，可清除字段: {', '.join(clearable_fields.keys())}")

    for img in images:
        try:
            clear_metadata_fields(img, fields)
            print(f"✓ 已清除 {img.name} 的字段: {fields}")
        except Exception as e:
            print(f"✗ 清除失败 {img.name}: {e}")

    print(f"\n完成！共处理 {len(images)} 张图片")


def cmd_watermark(args):
    """嵌入或验证数字水印"""
    if args.action == 'embed':
        images = find_images(args.folder, recursive=args.recursive)
        if not images:
            print("未找到图片文件")
            return

        if args.backup:
            backup_dir = args.backup_dir or str(Path(args.folder) / 'backup')
            backup_images(images, backup_dir, source_folder=args.folder)

        for img in images:
            try:
                n_bits = embed_dct_watermark(img, args.text, alpha=args.alpha)
                print(f"✓ 已嵌入水印到: {img.name} ({n_bits} bits)")
            except Exception as e:
                print(f"✗ 嵌入失败 {img.name}: {e}")

        print(f"\n完成！水印文本: '{args.text}'")

    elif args.action == 'verify':
        images = find_images(args.folder, recursive=args.recursive)
        if not images:
            print("未找到图片文件")
            return

        verified = 0
        for img in images:
            try:
                found, similarity = verify_dct_watermark(img, args.text, alpha=args.alpha)
                status = "✓ 水印验证通过" if found else "✗ 水印验证失败"
                print(f"{status}: {img.name} (相似度: {similarity:.2%})")
                if found:
                    verified += 1
            except Exception as e:
                print(f"✗ 验证失败 {img.name}: {e}")

        print(f"\n验证完成: {verified}/{len(images)} 张图片包含指定水印")


def cmd_report(args):
    """生成元数据报告"""
    images = find_images(args.folder, recursive=args.recursive)
    if not images:
        print("未找到图片文件")
        return

    output = args.output or None
    generate_report(images, output_csv=output)


def cmd_search(args):
    """按元数据搜索图片"""
    images = find_images(args.folder, recursive=args.recursive)
    if not images:
        print("未找到图片文件")
        return

    results = search_images_by_metadata(images, args.field, args.keyword)
    if not results:
        print(f"未找到匹配的图片 (字段: {args.field}, 关键词: {args.keyword})")
        return

    print(f"找到 {len(results)} 张匹配的图片:\n")
    for path, key, value in results:
        print(f"  {path.name}")
        print(f"    字段: {key} = {value}\n")


def cmd_timestamp(args):
    """修改文件时间戳"""
    images = find_images(args.folder, recursive=args.recursive)
    if not images:
        print("未找到图片文件")
        return

    if args.backup:
        backup_dir = args.backup_dir or str(Path(args.folder) / 'backup')
        backup_images(images, backup_dir, source_folder=args.folder)

    if args.from_exif:
        for img in images:
            dt_str = get_exif_datetime(img)
            if dt_str:
                try:
                    set_file_timestamp(img, dt_str=dt_str)
                    print(f"✓ 已设置时间戳: {img.name} -> {dt_str}")
                except Exception as e:
                    print(f"✗ 设置失败 {img.name}: {e}")
            else:
                print(f"  跳过（无EXIF时间）: {img.name}")
    elif args.datetime:
        for img in images:
            try:
                set_file_timestamp(img, dt_str=args.datetime)
                print(f"✓ 已设置时间戳: {img.name} -> {args.datetime}")
            except Exception as e:
                print(f"✗ 设置失败 {img.name}: {e}")
    else:
        print("请指定 --from-exif 或 --datetime")

    print(f"\n完成！共处理 {len(images)} 张图片")


def cmd_rename(args):
    """根据EXIF拍摄时间重命名"""
    images = find_images(args.folder, recursive=args.recursive)
    if not images:
        print("未找到图片文件")
        return

    if args.backup:
        backup_dir = args.backup_dir or str(Path(args.folder) / 'backup')
        backup_images(images, backup_dir, source_folder=args.folder)

    count = 0
    for img in images:
        result = rename_by_exif_date(img, dry_run=args.dry_run)
        if result is not None:
            count += 1

    action = "将重命名" if args.dry_run else "已重命名"
    print(f"\n完成！{action} {count} 张图片")


def cmd_backup(args):
    """备份原始图片"""
    images = find_images(args.folder, recursive=args.recursive)
    if not images:
        print("未找到图片文件")
        return

    backup_dir = args.backup_dir or str(Path(args.folder) / 'backup')
    backup_images(images, backup_dir, source_folder=args.folder)


def main():
    parser = argparse.ArgumentParser(
        description='图片元数据批量编辑工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s edit /photos --author "张三" --copyright "© 2026 张三"
  %(prog)s import-csv metadata.csv --folder /photos
  %(prog)s copy-meta /photos
  %(prog)s clear /photos --fields gps,datetime_original
  %(prog)s watermark /photos embed --text "Copyright 张三"
  %(prog)s watermark /photos verify --text "Copyright 张三"
  %(prog)s report /photos --output report.csv
  %(prog)s search /photos --field author --keyword "张三"
  %(prog)s timestamp /photos --from-exif
  %(prog)s rename /photos --dry-run
  %(prog)s backup /photos --backup-dir /backup/photos
        """
    )
    subparsers = parser.add_subparsers(dest='command', help='子命令')

    # edit
    p_edit = subparsers.add_parser('edit', help='批量修改EXIF信息')
    p_edit.add_argument('folder', help='图片文件夹路径')
    p_edit.add_argument('--author', help='设置作者')
    p_edit.add_argument('--copyright', help='设置版权')
    p_edit.add_argument('--description', help='设置描述')
    p_edit.add_argument('--keywords', help='设置关键词（分号分隔）')
    p_edit.add_argument('--no-recursive', dest='recursive', action='store_false', help='不递归处理子文件夹')
    p_edit.add_argument('--backup', action='store_true', help='修改前自动备份')
    p_edit.add_argument('--backup-dir', help='备份目录路径')

    # import-csv
    p_csv = subparsers.add_parser('import-csv', help='从CSV文件导入元数据')
    p_csv.add_argument('csv_file', help='CSV文件路径')
    p_csv.add_argument('--folder', help='图片所在文件夹（用于解析CSV中的相对路径）')
    p_csv.add_argument('--backup', action='store_true', help='修改前自动备份')
    p_csv.add_argument('--backup-dir', help='备份目录路径')

    # copy-meta
    p_copy = subparsers.add_parser('copy-meta', help='从第一张图片复制元数据到其他图片')
    p_copy.add_argument('folder', help='图片文件夹路径')
    p_copy.add_argument('--no-recursive', dest='recursive', action='store_false', help='不递归处理子文件夹')
    p_copy.add_argument('--backup', action='store_true', help='修改前自动备份')
    p_copy.add_argument('--backup-dir', help='备份目录路径')

    # clear
    p_clear = subparsers.add_parser('clear', help='清除指定元数据字段')
    p_clear.add_argument('folder', help='图片文件夹路径')
    p_clear.add_argument('--fields', required=True, help='要清除的字段（逗号分隔）: gps,datetime_original,datetime_digitized,artist,copyright,description,software,all_exif')
    p_clear.add_argument('--no-recursive', dest='recursive', action='store_false', help='不递归处理子文件夹')
    p_clear.add_argument('--backup', action='store_true', help='修改前自动备份')
    p_clear.add_argument('--backup-dir', help='备份目录路径')

    # watermark
    p_wm = subparsers.add_parser('watermark', help='嵌入或验证数字水印')
    p_wm.add_argument('folder', help='图片文件夹路径')
    p_wm.add_argument('action', choices=['embed', 'verify'], help='操作: embed(嵌入) 或 verify(验证)')
    p_wm.add_argument('--text', required=True, help='水印文本')
    p_wm.add_argument('--alpha', type=float, default=15.0, help='水印强度（默认: 15.0）')
    p_wm.add_argument('--no-recursive', dest='recursive', action='store_false', help='不递归处理子文件夹')
    p_wm.add_argument('--backup', action='store_true', help='嵌入前自动备份')
    p_wm.add_argument('--backup-dir', help='备份目录路径')

    # report
    p_report = subparsers.add_parser('report', help='生成元数据报告')
    p_report.add_argument('folder', help='图片文件夹路径')
    p_report.add_argument('--output', help='导出CSV文件路径')
    p_report.add_argument('--no-recursive', dest='recursive', action='store_false', help='不递归处理子文件夹')

    # search
    p_search = subparsers.add_parser('search', help='按元数据搜索图片')
    p_search.add_argument('folder', help='图片文件夹路径')
    p_search.add_argument('--field', required=True, help='搜索的元数据字段名')
    p_search.add_argument('--keyword', required=True, help='搜索关键词')
    p_search.add_argument('--no-recursive', dest='recursive', action='store_false', help='不递归处理子文件夹')

    # timestamp
    p_ts = subparsers.add_parser('timestamp', help='修改文件时间戳')
    p_ts.add_argument('folder', help='图片文件夹路径')
    p_ts.add_argument('--from-exif', action='store_true', help='从EXIF拍摄时间设置文件时间戳')
    p_ts.add_argument('--datetime', help='手动设置时间（格式: YYYY:MM:DD HH:MM:SS 或 YYYY-MM-DD HH:MM:SS）')
    p_ts.add_argument('--no-recursive', dest='recursive', action='store_false', help='不递归处理子文件夹')
    p_ts.add_argument('--backup', action='store_true', help='修改前自动备份')
    p_ts.add_argument('--backup-dir', help='备份目录路径')

    # rename
    p_rename = subparsers.add_parser('rename', help='根据EXIF拍摄时间重命名图片')
    p_rename.add_argument('folder', help='图片文件夹路径')
    p_rename.add_argument('--dry-run', action='store_true', help='仅预览，不实际重命名')
    p_rename.add_argument('--no-recursive', dest='recursive', action='store_false', help='不递归处理子文件夹')
    p_rename.add_argument('--backup', action='store_true', help='修改前自动备份')
    p_rename.add_argument('--backup-dir', help='备份目录路径')

    # backup
    p_backup = subparsers.add_parser('backup', help='备份原始图片')
    p_backup.add_argument('folder', help='图片文件夹路径')
    p_backup.add_argument('--backup-dir', help='备份目录路径')
    p_backup.add_argument('--no-recursive', dest='recursive', action='store_false', help='不递归处理子文件夹')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    commands_map = {
        'edit': cmd_edit,
        'import-csv': cmd_import_csv,
        'copy-meta': cmd_copy_meta,
        'clear': cmd_clear,
        'watermark': cmd_watermark,
        'report': cmd_report,
        'search': cmd_search,
        'timestamp': cmd_timestamp,
        'rename': cmd_rename,
        'backup': cmd_backup,
    }

    cmd_func = commands_map.get(args.command)
    if cmd_func:
        cmd_func(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
