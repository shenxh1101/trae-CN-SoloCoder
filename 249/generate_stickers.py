#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

STICKERS = [
    ('happy', '😊', (255, 215, 0), '高兴'),
    ('sad', '😢', (70, 130, 180), '悲伤'),
    ('surprised', '😮', (255, 140, 0), '惊讶'),
    ('angry', '😠', (220, 20, 60), '愤怒'),
    ('fearful', '😨', (147, 112, 219), '恐惧'),
    ('disgusted', '😖', (34, 139, 34), '厌恶'),
    ('neutral', '😐', (128, 128, 128), '中性'),
    ('heart', '❤️', (255, 105, 180), '爱心'),
    ('star', '⭐', (255, 215, 0), '星星'),
    ('fire', '🔥', (255, 69, 0), '火焰'),
    ('drop', '💧', (65, 105, 225), '水滴'),
    ('sparkle', '✨', (255, 250, 205), '闪光'),
]

SIZE = 128
OUTPUT_DIR = 'stickers'

os.makedirs(OUTPUT_DIR, exist_ok=True)

for name, emoji, color, label in STICKERS:
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    draw.ellipse([8, 8, SIZE-8, SIZE-8], fill=(255, 255, 255, 30))
    
    draw.ellipse([12, 12, SIZE-12, SIZE-12], fill=(*color, 180))
    
    draw.ellipse([16, 16, SIZE-16, SIZE-16], fill=(*color, 220))
    
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Apple Color Emoji.ttc', 64)
    except:
        try:
            font = ImageFont.truetype('/Library/Fonts/Arial Unicode.ttf', 64)
        except:
            font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), emoji, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = (SIZE - text_w) // 2 - bbox[0]
    text_y = (SIZE - text_h) // 2 - bbox[1]
    
    draw.text((text_x, text_y), emoji, font=font, fill=(255, 255, 255, 255))
    
    output_path = os.path.join(OUTPUT_DIR, f'{name}.png')
    img.save(output_path, 'PNG')
    print(f'✅ 生成贴纸: {output_path}')

print(f'\n🎉 共生成 {len(STICKERS)} 张贴纸图片!')
