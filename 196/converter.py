import os
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import pillow_heif
import piexif

pillow_heif.register_heif_opener()

EXIF_ORIENTATION_TAG = 274

ORIENTATION_TRANSPOSE = {
    2: Image.FLIP_LEFT_RIGHT,
    3: Image.ROTATE_180,
    4: Image.FLIP_TOP_BOTTOM,
    5: Image.TRANSPOSE,
    6: Image.ROTATE_270,
    7: Image.TRANSVERSE,
    8: Image.ROTATE_90,
}


def _read_heic_raw(input_path):
    heif_file = pillow_heif.open_heif(input_path, apply_transformations=False)
    raw_exif = heif_file.info.get('exif') or b''
    image = heif_file.to_pillow()
    return image, raw_exif


def _read_image_with_exif(input_path):
    ext = os.path.splitext(input_path)[1].lower()
    if ext in ('.heic', '.heif'):
        return _read_heic_raw(input_path)
    image = Image.open(input_path)
    raw_exif = image.info.get('exif') or b''
    return image, raw_exif


def apply_auto_rotate(image, exif_dict):
    try:
        if '0th' in exif_dict and EXIF_ORIENTATION_TAG in exif_dict['0th']:
            orientation = exif_dict['0th'][EXIF_ORIENTATION_TAG]
            if orientation in ORIENTATION_TRANSPOSE:
                image = image.transpose(ORIENTATION_TRANSPOSE[orientation])
            exif_dict['0th'][EXIF_ORIENTATION_TAG] = 1
    except Exception:
        pass
    return image, exif_dict


def resize_image(image, max_size):
    if max_size is None:
        return image
    width, height = image.size
    if width <= max_size and height <= max_size:
        return image
    if width > height:
        new_width = max_size
        new_height = int(height * (max_size / width))
    else:
        new_height = max_size
        new_width = int(width * (max_size / height))
    return image.resize((new_width, new_height), Image.LANCZOS)


def add_watermark(image, watermark_text, position='bottom-right', font_size=30, opacity=150):
    if not watermark_text:
        return image
    overlay = image.copy().convert('RGBA')
    draw = ImageDraw.Draw(overlay)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', font_size)
    except Exception:
        try:
            font = ImageFont.truetype('/Library/Fonts/Arial.ttf', font_size)
        except Exception:
            font = ImageFont.load_default()
    text_bbox = draw.textbbox((0, 0), watermark_text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    padding = 20
    width, height = image.size
    if position == 'bottom-right':
        x = width - text_width - padding
        y = height - text_height - padding
    elif position == 'bottom-left':
        x = padding
        y = height - text_height - padding
    elif position == 'top-right':
        x = width - text_width - padding
        y = padding
    elif position == 'top-left':
        x = padding
        y = padding
    else:
        x = width - text_width - padding
        y = height - text_height - padding
    draw.text((x, y), watermark_text, font=font, fill=(255, 255, 255, opacity))
    return Image.alpha_composite(overlay, Image.new('RGBA', image.size, (0, 0, 0, 0))).convert('RGB')


def convert_heic_to_jpg(
    input_path,
    output_path=None,
    quality=90,
    delete_original=False,
    max_size=None,
    auto_rotate=True,
    watermark=None,
    watermark_date=False,
    watermark_position='bottom-right'
):
    input_path = os.path.abspath(input_path)
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"文件不存在: {input_path}")
    if output_path is None:
        output_path = os.path.splitext(input_path)[0] + '.jpg'
    else:
        output_path = os.path.abspath(output_path)
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    image, raw_exif = _read_image_with_exif(input_path)
    has_exif = bool(raw_exif)
    exif_dict = piexif.load(raw_exif) if raw_exif else {'0th': {}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': None}
    if auto_rotate:
        image, exif_dict = apply_auto_rotate(image, exif_dict)
    image = image.convert('RGB')
    image = resize_image(image, max_size)
    watermark_text = watermark
    if watermark_date and not watermark_text:
        try:
            if 'Exif' in exif_dict and piexif.ExifIFD.DateTimeOriginal in exif_dict['Exif']:
                date_str = exif_dict['Exif'][piexif.ExifIFD.DateTimeOriginal].decode('utf-8', errors='ignore')
                watermark_text = date_str.split(' ')[0].replace(':', '-')
        except Exception:
            pass
        if not watermark_text:
            watermark_text = datetime.now().strftime('%Y-%m-%d')
    if watermark_text:
        image = add_watermark(image, watermark_text, position=watermark_position)
    new_exif_bytes = b''
    if has_exif:
        try:
            new_exif_bytes = piexif.dump(exif_dict)
        except Exception:
            new_exif_bytes = b''
    image.save(output_path, 'JPEG', quality=quality, exif=new_exif_bytes, optimize=True)
    if delete_original and os.path.exists(input_path) and input_path != output_path:
        os.remove(input_path)
    return output_path
