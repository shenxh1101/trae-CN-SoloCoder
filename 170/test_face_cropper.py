import os
import cv2
import numpy as np
from pathlib import Path
import tempfile
import shutil
from face_cropper import FaceDetector, FaceCropper, create_comparison_image, collect_images


def test_face_detector_opencv():
    print("Testing FaceDetector (OpenCV)...")
    try:
        detector = FaceDetector(model='opencv')
        print("  ✓ FaceDetector initialized successfully")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False
    return True


def test_face_cropper_initialization():
    print("Testing FaceCropper initialization...")
    try:
        detector = FaceDetector(model='opencv')
        cropper = FaceCropper(
            detector=detector,
            scale_factor=1.5,
            crop_mode='largest',
            output_size=(800, 800),
            fill_color=(255, 255, 255)
        )
        print("  ✓ FaceCropper initialized successfully")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False
    return True


def test_crop_no_face():
    print("Testing crop with no face detected...")
    try:
        detector = FaceDetector(model='opencv')
        cropper = FaceCropper(detector=detector, scale_factor=1.5)
        blank_image = np.full((600, 800, 3), 200, dtype=np.uint8)
        cropped, result = cropper.crop_image(blank_image)
        assert result['face_count'] == 0
        assert result['cropped'] == False
        assert cropped.shape == blank_image.shape
        print("  ✓ No-face handling works correctly")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False
    return True


def test_resize_with_padding():
    print("Testing resize with padding...")
    try:
        detector = FaceDetector(model='opencv')
        cropper = FaceCropper(
            detector=detector,
            output_size=(800, 800),
            fill_color=(255, 255, 255)
        )
        test_image = np.full((400, 600, 3), 100, dtype=np.uint8)
        result = cropper._resize_with_padding(test_image)
        assert result.shape == (800, 800, 3)
        print("  ✓ Resize with padding works correctly")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False
    return True


def test_crop_region_calculation():
    print("Testing crop region calculation...")
    try:
        detector = FaceDetector(model='opencv')
        cropper = FaceCropper(detector=detector, scale_factor=2.0)
        face_box = (100, 100, 200, 200)
        img_shape = (800, 600, 3)
        crop_region = cropper._calculate_crop_region(face_box, img_shape)
        x, y, w, h = crop_region
        center_x = x + w // 2
        center_y = y + h // 2
        expected_center_x = face_box[0] + face_box[2] // 2
        expected_center_y = face_box[1] + face_box[3] // 2
        assert center_x == expected_center_x
        assert center_y == expected_center_y
        assert w == int(face_box[2] * 2.0)
        assert h == int(face_box[3] * 2.0)
        print("  ✓ Crop region calculation works correctly")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False
    return True


def test_comparison_image():
    print("Testing comparison image creation...")
    try:
        original = np.full((400, 300, 3), 100, dtype=np.uint8)
        cropped = np.full((200, 200, 3), 150, dtype=np.uint8)
        comparison = create_comparison_image(original, cropped)
        assert comparison.shape[0] == 400
        assert comparison.shape[1] == 300 + 200 + 20
        print("  ✓ Comparison image creation works correctly")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False
    return True


def test_collect_images():
    print("Testing image collection...")
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            (tmpdir / 'subdir').mkdir()
            cv2.imwrite(str(tmpdir / 'test1.jpg'), np.full((100, 100, 3), 255, dtype=np.uint8))
            cv2.imwrite(str(tmpdir / 'test2.png'), np.full((100, 100, 3), 255, dtype=np.uint8))
            cv2.imwrite(str(tmpdir / 'subdir' / 'test3.jpg'), np.full((100, 100, 3), 255, dtype=np.uint8))
            (tmpdir / 'not_image.txt').write_text('test')

            images_non_recursive = collect_images(tmpdir, recursive=False)
            assert len(images_non_recursive) == 2

            images_recursive = collect_images(tmpdir, recursive=True)
            assert len(images_recursive) == 3

            print("  ✓ Image collection works correctly")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False
    return True


def test_bounding_rect():
    print("Testing minimum bounding rectangle calculation...")
    try:
        faces = [(10, 20, 100, 100), (150, 50, 80, 80), (50, 150, 60, 60)]
        rect = FaceCropper._get_min_bounding_rect(faces)
        assert rect == (10, 20, 220, 190)
        print("  ✓ Minimum bounding rectangle calculation works correctly")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False
    return True


def test_largest_face():
    print("Testing largest face selection...")
    try:
        faces = [(10, 20, 50, 50), (100, 100, 100, 100), (200, 200, 80, 80)]
        largest = FaceCropper._get_largest_face(faces)
        assert largest == (100, 100, 100, 100)
        print("  ✓ Largest face selection works correctly")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False
    return True


def main():
    print("=" * 60)
    print("Running Face Cropper Unit Tests")
    print("=" * 60)
    print()

    tests = [
        test_face_detector_opencv,
        test_face_cropper_initialization,
        test_crop_no_face,
        test_resize_with_padding,
        test_crop_region_calculation,
        test_comparison_image,
        test_collect_images,
        test_bounding_rect,
        test_largest_face,
    ]

    passed = 0
    failed = 0

    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
        print()

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)

    return 0 if failed == 0 else 1


if __name__ == '__main__':
    exit(main())
