#!/usr/bin/env python3
from PIL import Image
import os

base = os.path.expanduser('~/Pictures/Wallpapers')
for subdir in ['morning', 'noon', 'evening', 'night']:
    os.makedirs(os.path.join(base, subdir), exist_ok=True)

img = Image.new('RGB', (800, 600), color=(73, 109, 137))
for i in range(0, 800, 10):
    for j in range(0, 600, 10):
        r = (i * 255) // 800
        g = (j * 255) // 600
        b = 128
        for x in range(10):
            for y in range(10):
                img.putpixel((i+x, j+y), (r, g, b))

test_path = os.path.join(base, 'test_image.jpg')
img.save(test_path)
print(f'Test image created: {test_path}')

colors = {
    'morning': (255, 128, 64),
    'noon': (64, 255, 128),
    'evening': (255, 64, 128),
    'night': (64, 128, 255)
}

for subdir in ['morning', 'noon', 'evening', 'night']:
    sub_path = os.path.join(base, subdir, f'{subdir}_test.jpg')
    img2 = Image.new('RGB', (800, 600), color=colors[subdir])
    for i in range(0, 800, 10):
        for j in range(0, 600, 10):
            r, g, b = colors[subdir]
            r = (r + i // 4) % 255
            g = (g + j // 4) % 255
            b = (b + (i + j) // 8) % 255
            for x in range(10):
                for y in range(10):
                    img2.putpixel((i+x, j+y), (r, g, b))
    img2.save(sub_path)
    print(f'Test image created: {sub_path}')

print('\nAll test images created successfully!')
