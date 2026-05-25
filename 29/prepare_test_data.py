#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont

test_dir = 'test_images'
os.makedirs(test_dir, exist_ok=True)

colors = [(255, 100, 100), (100, 255, 100), (100, 100, 255), (255, 200, 100), (200, 100, 255)]
for i in range(5):
    img = Image.new('RGB', (600, 400), colors[i])
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/PingFang.ttc', 48)
    except:
        font = ImageFont.load_default()
    draw.text((150, 150), f'测试图片 {i+1}', fill=(255, 255, 255), font=font)
    draw.rectangle([100, 80, 200, 180], outline=(0, 0, 0), width=3)
    draw.ellipse([350, 250, 500, 350], outline=(255, 255, 0), width=3)
    draw.line([50, 350, 550, 50], fill=(0, 255, 255), width=2)

    if i == 0:
        img.save(os.path.join(test_dir, f'photo_{i+1}.jpg'), 'JPEG')
    elif i == 1:
        img.save(os.path.join(test_dir, f'photo_{i+1}.png'), 'PNG')
    elif i == 2:
        img.save(os.path.join(test_dir, f'photo_{i+1}.bmp'), 'BMP')
    elif i == 3:
        img.save(os.path.join(test_dir, f'photo_{i+1}.webp'), 'WEBP')
    else:
        img.save(os.path.join(test_dir, f'photo_{i+1}.jpg'), 'JPEG')

with open(os.path.join(test_dir, 'document.txt'), 'w') as f:
    f.write('This is a text file')
with open(os.path.join(test_dir, 'data.csv'), 'w') as f:
    f.write('col1,col2\n1,2')

subdir = os.path.join(test_dir, 'subfolder')
os.makedirs(subdir, exist_ok=True)
img2 = Image.new('RGB', (400, 300), (150, 200, 150))
img2.save(os.path.join(subdir, 'nested.jpg'), 'JPEG')

print('测试图片创建完成:')
for f in sorted(os.listdir(test_dir)):
    fpath = os.path.join(test_dir, f)
    if os.path.isdir(fpath):
        print(f'  [DIR] {f}/')
    else:
        size = os.path.getsize(fpath)
        print(f'  {f} ({size} bytes)')
