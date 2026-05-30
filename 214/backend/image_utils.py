import os
import cv2
import numpy as np
from PIL import Image
import config


def segment_handwriting(image_path, output_dir=None):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return []
    
    _, binary = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY_INV)
    
    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.dilate(binary, kernel, iterations=1)
    
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bboxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area > 500 and w > 15 and h > 15:
            bboxes.append((x, y, w, h))
    
    bboxes.sort(key=lambda b: (b[1] // 50, b[0]))
    
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    segmented_images = []
    for i, (x, y, w, h) in enumerate(bboxes):
        padding = 10
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(img.shape[1], x + w + padding)
        y2 = min(img.shape[0], y + h + padding)
        
        char_img = img[y1:y2, x1:x2]
        
        target_size = max(char_img.shape)
        square_img = 255 * np.ones((target_size, target_size), dtype=np.uint8)
        
        y_offset = (target_size - char_img.shape[0]) // 2
        x_offset = (target_size - char_img.shape[1]) // 2
        square_img[y_offset:y_offset+char_img.shape[0], 
                   x_offset:x_offset+char_img.shape[1]] = char_img
        
        pil_img = Image.fromarray(square_img)
        pil_img = pil_img.resize(config.IMAGE_SIZE)
        
        if output_dir:
            output_path = os.path.join(output_dir, f'char_{i:03d}.png')
            pil_img.save(output_path)
        
        segmented_images.append({
            'index': i,
            'bbox': [int(x1), int(y1), int(x2), int(y2)],
            'image': pil_img
        })
    
    return segmented_images


def calculate_similarity(image1_path, image2_path):
    img1 = cv2.imread(image1_path, cv2.IMREAD_GRAYSCALE)
    img2 = cv2.imread(image2_path, cv2.IMREAD_GRAYSCALE)
    
    if img1 is None or img2 is None:
        return 0.0
    
    img1_norm = _normalize_character(img1)
    img2_norm = _normalize_character(img2)
    
    if img1_norm is None or img2_norm is None:
        return 0.0
    
    intersection = np.logical_and(img1_norm > 0, img2_norm > 0).sum()
    union = np.logical_or(img1_norm > 0, img2_norm > 0).sum()
    
    if union == 0:
        return 0.0
    
    iou_score = intersection / union
    
    img1_f = np.float32(img1_norm) / 255.0
    img2_f = np.float32(img2_norm) / 255.0
    
    dot_product = np.sum(img1_f * img2_f)
    norm1 = np.linalg.norm(img1_f)
    norm2 = np.linalg.norm(img2_f)
    
    if norm1 == 0 or norm2 == 0:
        cosine_score = 0.0
    else:
        cosine_score = dot_product / (norm1 * norm2)
    
    similarity = 0.4 * iou_score + 0.6 * cosine_score
    
    return float(similarity)


def _normalize_character(img, size=64, padding=8):
    _, binary = cv2.threshold(img, 200, 255, cv2.THRESH_BINARY_INV)
    
    if np.count_nonzero(binary) < 5:
        blurred = cv2.GaussianBlur(img, (3, 3), 0)
        _, binary = cv2.threshold(blurred, 240, 255, cv2.THRESH_BINARY_INV)
    
    if np.count_nonzero(binary) < 3:
        return None
    
    coords = cv2.findNonZero(binary)
    if coords is None:
        return None
    
    x, y, w, h = cv2.boundingRect(coords)
    
    margin = max(3, int(max(w, h) * 0.08))
    x1 = max(0, x - margin)
    y1 = max(0, y - margin)
    x2 = min(img.shape[1], x + w + margin)
    y2 = min(img.shape[0], y + h + margin)
    
    cropped = binary[y1:y2, x1:x2]
    
    target_inner = size - 2 * padding
    ch, cw = cropped.shape[:2]
    if ch == 0 or cw == 0:
        return None
    
    scale = min(target_inner / ch, target_inner / cw)
    resized = cv2.resize(cropped, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    
    _, resized = cv2.threshold(resized, 127, 255, cv2.THRESH_BINARY)
    
    result = np.zeros((size, size), dtype=np.uint8)
    rh, rw = resized.shape[:2]
    y_off = (size - rh) // 2
    x_off = (size - rw) // 2
    result[y_off:y_off+rh, x_off:x_off+rw] = resized
    
    return result


def calculate_similarity_from_pil(img1_pil, img2_pil):
    import tempfile
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f1:
        img1_pil.save(f1.name)
        temp1 = f1.name
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f2:
        img2_pil.save(f2.name)
        temp2 = f2.name
    
    try:
        similarity = calculate_similarity(temp1, temp2)
    finally:
        os.unlink(temp1)
        os.unlink(temp2)
    
    return similarity


def generate_standard_character(char, output_path=None):
    from PIL import Image, ImageDraw, ImageFont
    
    img_size = 200
    img = Image.new('L', (img_size, img_size), 255)
    draw = ImageDraw.Draw(img)
    
    font_size = 140
    
    try:
        font_paths = [
            '/System/Library/Fonts/STHeiti Light.ttc',
            '/System/Library/Fonts/Hiragino Sans GB.ttc',
            '/System/Library/Fonts/Supplemental/Songti.ttc',
            '/System/Library/Fonts/PingFang.ttc',
            '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
            '/usr/share/fonts/truetype/arphic/uming.ttc'
        ]
        
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    test_font = ImageFont.truetype(font_path, font_size)
                    test_img = Image.new('L', (50, 50), 255)
                    test_draw = ImageDraw.Draw(test_img)
                    test_draw.text((5, 5), '大', fill=0, font=test_font)
                    import numpy as np
                    if np.sum(np.array(test_img) < 200) > 10:
                        font = test_font
                        break
                except Exception:
                    continue
        
        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), char, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    offset_x = (img_size - text_w) // 2 - bbox[0]
    offset_y = (img_size - text_h) // 2 - bbox[1]
    
    try:
        draw.text((offset_x, offset_y), char, fill=0, font=font, stroke_width=4, stroke_fill=0)
    except TypeError:
        draw.text((offset_x, offset_y), char, fill=0, font=font)
    
    if output_path:
        img.save(output_path)
    
    return img
