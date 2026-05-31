from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np
import os

output_dir = '/Users/mac/code/solo coder/239/test_images'
os.makedirs(output_dir, exist_ok=True)

def create_test_image(filename, colors, shapes, add_noise=True):
    img = Image.new('RGB', (400, 300), color=colors['bg'])
    draw = ImageDraw.Draw(img)
    
    if 'rect' in shapes:
        s = shapes['rect']
        draw.rectangle([s['x'], s['y'], s['x']+s['w'], s['y']+s['h']], fill=s['color'])
    
    if 'circle' in shapes:
        s = shapes['circle']
        draw.ellipse([s['x'], s['y'], s['x']+s['r']*2, s['y']+s['r']*2], fill=s['color'])
    
    if 'text' in shapes:
        s = shapes['text']
        try:
            font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', s['size'])
        except:
            font = ImageFont.load_default()
        draw.text((s['x'], s['y']), s['content'], fill=s['color'], font=font)
    
    if add_noise:
        img_array = np.array(img, dtype=np.float32)
        noise = (np.random.rand(*img_array.shape) - 0.5) * 40
        img_array = np.clip(img_array + noise, 0, 255).astype(np.uint8)
        img = Image.fromarray(img_array)
    
    return img

# 测试图片1 - 带几何图形的照片
img1 = create_test_image(
    'test1_photo.jpg',
    {'bg': (200, 180, 150)},
    {
        'rect': {'x': 50, 'y': 50, 'w': 120, 'h': 80, 'color': (180, 100, 50)},
        'circle': {'x': 250, 'y': 100, 'r': 60, 'color': (50, 120, 180)},
        'text': {'x': 100, 'y': 200, 'content': 'Test Photo 1', 'size': 24, 'color': (50, 30, 10)}
    }
)
img1.save(os.path.join(output_dir, 'test1_photo.jpg'), quality=85)

# 测试图片2 - 风景风格
img2 = create_test_image(
    'test2_landscape.jpg',
    {'bg': (135, 206, 235)},
    {
        'rect': {'x': 0, 'y': 200, 'w': 400, 'h': 100, 'color': (85, 107, 47)},
        'circle': {'x': 280, 'y': 30, 'r': 40, 'color': (255, 255, 150)},
        'text': {'x': 120, 'y': 140, 'content': 'Landscape', 'size': 28, 'color': (255, 255, 255)}
    }
)
img2.save(os.path.join(output_dir, 'test2_landscape.jpg'), quality=85)

# 测试图片3 - 人像风格
img3 = create_test_image(
    'test3_portrait.jpg',
    {'bg': (180, 150, 120)},
    {
        'circle': {'x': 150, 'y': 50, 'r': 70, 'color': (220, 180, 150)},
        'rect': {'x': 120, 'y': 180, 'w': 160, 'h': 100, 'color': (60, 80, 120)},
        'text': {'x': 100, 'y': 250, 'content': 'Portrait', 'size': 26, 'color': (255, 255, 255)}
    }
)
img3.save(os.path.join(output_dir, 'test3_portrait.jpg'), quality=85)

# 测试图片4 - 静物风格
img4 = create_test_image(
    'test4_still.jpg',
    {'bg': (230, 220, 200)},
    {
        'rect': {'x': 30, 'y': 100, 'w': 100, 'h': 150, 'color': (139, 69, 19)},
        'rect2': {'x': 150, 'y': 150, 'w': 80, 'h': 100, 'color': (255, 99, 71)},
        'circle': {'x': 280, 'y': 120, 'r': 50, 'color': (60, 179, 113)},
        'text': {'x': 130, 'y': 40, 'content': 'Still Life', 'size': 28, 'color': (80, 60, 40)}
    }
)
# 添加第二个矩形
img4_array = np.array(img4)
draw = ImageDraw.Draw(img4)
draw.rectangle([150, 150, 230, 250], fill=(255, 99, 71))
img4.save(os.path.join(output_dir, 'test4_still.jpg'), quality=85)

# 测试图片5 - 灰度风格（测试上色功能）
img5 = create_test_image(
    'test5_grayscale.jpg',
    {'bg': (128, 128, 128)},
    {
        'rect': {'x': 50, 'y': 80, 'w': 300, 'h': 150, 'color': (80, 80, 80)},
        'circle': {'x': 150, 'y': 100, 'r': 50, 'color': (180, 180, 180)},
        'text': {'x': 100, 'y': 200, 'content': 'BW Photo', 'size': 32, 'color': (200, 200, 200)}
    },
    add_noise=True
)
# 转成灰度
img5 = img5.convert('L').convert('RGB')
img5.save(os.path.join(output_dir, 'test5_grayscale.jpg'), quality=85)

# 添加一些划痕
img5_array = np.array(img5)
np.random.seed(42)
for _ in range(15):
    x1 = np.random.randint(0, 400)
    y1 = np.random.randint(0, 300)
    length = np.random.randint(30, 100)
    angle = np.random.rand() * np.pi * 2
    x2 = int(x1 + np.cos(angle) * length)
    y2 = int(y1 + np.sin(angle) * length)
    for i in range(max(abs(x2-x1), abs(y2-y1))):
        x = int(x1 + (x2-x1) * i / max(abs(x2-x1), abs(y2-y1)) + 0.1)
        y = int(y1 + (y2-y1) * i / max(abs(x2-x1), abs(y2-y1)) + 0.1)
        if 0 <= x < 400 and 0 <= y < 300:
            img5_array[y, x] = np.minimum(255, img5_array[y, x] + 100)

img5 = Image.fromarray(img5_array)
img5.save(os.path.join(output_dir, 'test5_grayscale.jpg'), quality=85)

print(f"测试图片已创建在: {output_dir}")
for f in os.listdir(output_dir):
    print(f"  - {f}")
