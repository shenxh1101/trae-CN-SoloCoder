import cv2
import numpy as np
import os
from pathlib import Path


def create_face_pattern(size=(400, 400), face_color=(240, 200, 160), eye_color=(50, 50, 50), 
                        mouth_color=(100, 50, 50), hair_color=(80, 50, 30)):
    img = np.full((size[1], size[0], 3), 255, dtype=np.uint8)
    
    cx, cy = size[0] // 2, size[1] // 2
    face_w, face_h = int(size[0] * 0.4), int(size[1] * 0.5)
    
    cv2.ellipse(img, (cx, cy), (face_w // 2, face_h // 2), 0, 0, 360, face_color, -1)
    
    hair_ellipse_h = int(face_h * 0.6)
    cv2.ellipse(img, (cx, cy - face_h // 4), (face_w // 2 + 10, hair_ellipse_h // 2), 
                0, 180, 360, hair_color, -1)
    
    eye_y = cy - face_h // 6
    eye_offset = face_w // 4
    eye_size = (face_w // 8, face_h // 12)
    
    cv2.ellipse(img, (cx - eye_offset, eye_y), eye_size, 0, 0, 360, eye_color, -1)
    cv2.ellipse(img, (cx + eye_offset, eye_y), eye_size, 0, 0, 360, eye_color, -1)
    
    nose_points = np.array([
        [cx, cy - face_h // 12],
        [cx - face_w // 16, cy + face_h // 12],
        [cx + face_w // 16, cy + face_h // 12]
    ], np.int32)
    cv2.fillPoly(img, [nose_points], (200, 160, 120))
    
    mouth_y = cy + face_h // 3
    mouth_w = face_w // 3
    cv2.ellipse(img, (cx, mouth_y), (mouth_w // 2, face_h // 16), 0, 0, 180, mouth_color, 3)
    
    return img


def create_multi_face_image(size=(800, 600), num_faces=3, scene='indoor'):
    if scene == 'indoor':
        bg_color = (220, 230, 240)
    elif scene == 'outdoor':
        bg_color = (180, 220, 255)
    elif scene == 'dark':
        bg_color = (60, 50, 70)
    else:
        bg_color = (255, 255, 255)
    
    img = np.full((size[1], size[0], 3), bg_color, dtype=np.uint8)
    
    if scene == 'outdoor':
        cv2.rectangle(img, (0, size[1] // 2), (size[0], size[1]), (100, 180, 100), -1)
    elif scene == 'indoor':
        cv2.rectangle(img, (50, 50), (150, 200), (200, 180, 150), -1)
        cv2.rectangle(img, (size[0] - 200, 100), (size[0] - 50, 250), (180, 180, 200), -1)
    
    face_size = min(size) // (num_faces + 1)
    positions = []
    
    if num_faces == 2:
        positions = [(size[0] // 3, size[1] // 2), (2 * size[0] // 3, size[1] // 2)]
    elif num_faces == 3:
        positions = [(size[0] // 4, size[1] // 3), (size[0] // 2, size[1] // 2), (3 * size[0] // 4, size[1] // 3)]
    else:
        positions = [(size[0] // 2, size[1] // 2)]
    
    face_colors = [
        (240, 200, 160),
        (200, 150, 100),
        (100, 70, 50),
        (180, 130, 80)
    ]
    
    hair_colors = [
        (80, 50, 30),
        (150, 100, 50),
        (20, 20, 20),
        (200, 150, 50)
    ]
    
    for i, (x, y) in enumerate(positions):
        face_img = create_face_pattern(
            size=(face_size, face_size),
            face_color=face_colors[i % len(face_colors)],
            hair_color=hair_colors[i % len(hair_colors)]
        )
        
        x1, y1 = x - face_size // 2, y - face_size // 2
        x2, y2 = x1 + face_size, y1 + face_size
        
        if x1 >= 0 and y1 >= 0 and x2 <= size[0] and y2 <= size[1]:
            img[y1:y2, x1:x2] = face_img
    
    return img


def create_no_face_image(size=(600, 400), scene_type='landscape'):
    img = np.full((size[1], size[0], 3), 255, dtype=np.uint8)
    
    if scene_type == 'landscape':
        cv2.rectangle(img, (0, 0), (size[0], size[1] // 2), (135, 206, 235), -1)
        cv2.rectangle(img, (0, size[1] // 2), (size[0], size[1]), (34, 139, 34), -1)
        
        sun_center = (size[0] - 80, 80)
        cv2.circle(img, sun_center, 40, (255, 255, 0), -1)
        
        for i in range(3):
            tree_x = 100 + i * 200
            tree_y = size[1] // 2 + 50
            cv2.rectangle(img, (tree_x - 10, tree_y), (tree_x + 10, tree_y + 80), (101, 67, 33), -1)
            cv2.circle(img, (tree_x, tree_y - 20), 50, (34, 139, 34), -1)
    
    elif scene_type == 'city':
        cv2.rectangle(img, (0, 0), (size[0], size[1]), (100, 149, 237), -1)
        
        building_widths = [60, 80, 50, 90, 70]
        building_heights = [200, 280, 150, 320, 220]
        x = 0
        
        for w, h in zip(building_widths, building_heights):
            cv2.rectangle(img, (x, size[1] - h), (x + w, size[1]), (128, 128, 128), -1)
            for wy in range(size[1] - h + 20, size[1] - 30, 40):
                for wx in range(x + 10, x + w - 10, 20):
                    cv2.rectangle(img, (wx, wy), (wx + 10, wy + 20), (255, 255, 200), -1)
            x += w + 10
    
    elif scene_type == 'abstract':
        for i in range(50):
            color = tuple(np.random.randint(0, 256, 3).tolist())
            x1, y1 = np.random.randint(0, size[0]), np.random.randint(0, size[1])
            x2, y2 = np.random.randint(x1, size[0]), np.random.randint(y1, size[1])
            cv2.rectangle(img, (x1, y1), (x2, y2), color, -1)
    
    return img


def main():
    output_dir = Path("/Users/mac/code/solo coder/170/test_photos")
    output_dir.mkdir(exist_ok=True)
    
    print("Generating test images...")
    
    img1 = create_multi_face_image(size=(800, 600), num_faces=3, scene='indoor')
    cv2.imwrite(str(output_dir / 'indoor_3faces.jpg'), img1)
    print("  Created: indoor_3faces.jpg (3 people, indoor scene)")
    
    img2 = create_multi_face_image(size=(900, 600), num_faces=2, scene='outdoor')
    cv2.imwrite(str(output_dir / 'outdoor_2faces.jpg'), img2)
    print("  Created: outdoor_2faces.jpg (2 people, outdoor scene)")
    
    img3 = create_multi_face_image(size=(700, 500), num_faces=1, scene='dark')
    cv2.imwrite(str(output_dir / 'dark_1face.jpg'), img3)
    print("  Created: dark_1face.jpg (1 person, dark lighting)")
    
    img4 = create_multi_face_image(size=(1000, 700), num_faces=2, scene='indoor')
    cv2.imwrite(str(output_dir / 'indoor_2faces_large.jpg'), img4)
    print("  Created: indoor_2faces_large.jpg (2 people, large size)")
    
    img5 = create_no_face_image(size=(800, 600), scene_type='landscape')
    cv2.imwrite(str(output_dir / 'landscape_no_faces.jpg'), img5)
    print("  Created: landscape_no_faces.jpg (landscape, no faces)")
    
    subdir = output_dir / 'subfolder' / 'nested'
    subdir.mkdir(parents=True, exist_ok=True)
    
    img_nested = create_multi_face_image(size=(600, 400), num_faces=1, scene='outdoor')
    cv2.imwrite(str(subdir / 'nested_photo.jpg'), img_nested)
    print("  Created: subfolder/nested/nested_photo.jpg (nested directory test)")
    
    print(f"\nTotal: {len(list(output_dir.rglob('*.jpg')))} test images created")
    print(f"Output directory: {output_dir}")


if __name__ == '__main__':
    main()
