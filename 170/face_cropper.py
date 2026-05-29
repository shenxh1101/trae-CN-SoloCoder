import os
import cv2
import argparse
import csv
import json
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any
import numpy as np

try:
    import dlib
    DLIB_AVAILABLE = True
except ImportError:
    DLIB_AVAILABLE = False

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}


class FaceDetector:
    def __init__(self, model: str = 'opencv'):
        self.model = model.lower()
        if self.model == 'opencv':
            self._init_opencv()
        elif self.model == 'dlib':
            self._init_dlib()
        else:
            raise ValueError(f"Unsupported model: {model}. Use 'opencv' or 'dlib'")

    def _init_opencv(self):
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        if self.face_cascade.empty():
            raise RuntimeError("Failed to load OpenCV Haar cascade classifier")

    def _init_dlib(self):
        if not DLIB_AVAILABLE:
            raise ImportError(
                "dlib is not installed. Install it with: pip install dlib "
                "(requires cmake and a C++ compiler)"
            )
        self.detector = dlib.get_frontal_face_detector()

    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = []

        if self.model == 'opencv':
            detected = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            for (x, y, w, h) in detected:
                faces.append((int(x), int(y), int(w), int(h)))

        elif self.model == 'dlib':
            detected = self.detector(gray, 1)
            for rect in detected:
                x, y = rect.left(), rect.top()
                w, h = rect.width(), rect.height()
                faces.append((int(x), int(y), int(w), int(h)))

        return faces


class FaceCropper:
    def __init__(
        self,
        detector: FaceDetector,
        scale_factor: float = 1.5,
        crop_mode: str = 'largest',
        output_size: Optional[Tuple[int, int]] = None,
        fill_color: Tuple[int, int, int] = (255, 255, 255)
    ):
        self.detector = detector
        self.scale_factor = scale_factor
        self.crop_mode = crop_mode.lower()
        self.output_size = output_size
        self.fill_color = fill_color

        if self.crop_mode not in ['largest', 'all']:
            raise ValueError(f"Unsupported crop mode: {crop_mode}. Use 'largest' or 'all'")

    @staticmethod
    def _get_min_bounding_rect(faces: List[Tuple[int, int, int, int]]) -> Tuple[int, int, int, int]:
        if not faces:
            return (0, 0, 0, 0)

        min_x = min(f[0] for f in faces)
        min_y = min(f[1] for f in faces)
        max_x = max(f[0] + f[2] for f in faces)
        max_y = max(f[1] + f[3] for f in faces)

        return (min_x, min_y, max_x - min_x, max_y - min_y)

    @staticmethod
    def _get_largest_face(faces: List[Tuple[int, int, int, int]]) -> Tuple[int, int, int, int]:
        if not faces:
            return (0, 0, 0, 0)
        return max(faces, key=lambda f: f[2] * f[3])

    def _calculate_crop_region(
        self,
        face_box: Tuple[int, int, int, int],
        img_shape: Tuple[int, int]
    ) -> Tuple[int, int, int, int]:
        x, y, w, h = face_box
        img_h, img_w = img_shape[:2]

        center_x = x + w // 2
        center_y = y + h // 2

        new_w = int(w * self.scale_factor)
        new_h = int(h * self.scale_factor)

        new_x = center_x - new_w // 2
        new_y = center_y - new_h // 2

        new_x = max(0, new_x)
        new_y = max(0, new_y)
        new_w = min(new_w, img_w - new_x)
        new_h = min(new_h, img_h - new_y)

        return (new_x, new_y, new_w, new_h)

    def _resize_with_padding(self, image: np.ndarray) -> np.ndarray:
        if self.output_size is None:
            return image

        target_w, target_h = self.output_size
        img_h, img_w = image.shape[:2]

        scale = min(target_w / img_w, target_h / img_h)
        new_w = int(img_w * scale)
        new_h = int(img_h * scale)

        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        padded = np.full((target_h, target_w, 3), self.fill_color, dtype=np.uint8)

        x_offset = (target_w - new_w) // 2
        y_offset = (target_h - new_h) // 2

        padded[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized

        return padded

    def crop_image(self, image: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        faces = self.detector.detect_faces(image)
        result = {
            'face_count': len(faces),
            'detected_faces': faces,
            'crop_region': None,
            'cropped': False,
            'original_size': (image.shape[1], image.shape[0])
        }

        if len(faces) == 0:
            cropped = self._resize_with_padding(image)
            result['final_size'] = (cropped.shape[1], cropped.shape[0])
            return cropped, result

        if self.crop_mode == 'largest':
            face_box = self._get_largest_face(faces)
        else:
            face_box = self._get_min_bounding_rect(faces)

        crop_region = self._calculate_crop_region(face_box, image.shape)
        x, y, w, h = crop_region

        cropped = image[y:y + h, x:x + w]
        cropped = self._resize_with_padding(cropped)

        result['crop_region'] = crop_region
        result['cropped'] = True
        result['final_size'] = (cropped.shape[1], cropped.shape[0])

        return cropped, result


def create_comparison_image(
    original: np.ndarray,
    cropped: np.ndarray,
    fill_color: Tuple[int, int, int] = (255, 255, 255)
) -> np.ndarray:
    h_orig, w_orig = original.shape[:2]
    h_crop, w_crop = cropped.shape[:2]

    max_h = max(h_orig, h_crop)
    total_w = w_orig + w_crop + 20

    comparison = np.full((max_h, total_w, 3), fill_color, dtype=np.uint8)

    y_orig = (max_h - h_orig) // 2
    y_crop = (max_h - h_crop) // 2

    comparison[y_orig:y_orig + h_orig, :w_orig] = original
    comparison[y_crop:y_crop + h_crop, w_orig + 20:] = cropped

    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(comparison, 'Original', (10, 30), font, 0.8, (0, 0, 0), 2)
    cv2.putText(comparison, 'Cropped', (w_orig + 30, 30), font, 0.8, (0, 0, 0), 2)

    return comparison


def collect_images(input_dir: Path, recursive: bool) -> List[Path]:
    images = []
    pattern = '**/*' if recursive else '*'

    for path in input_dir.glob(pattern):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            images.append(path)

    return sorted(images)


def get_relative_path(file_path: Path, base_dir: Path) -> Path:
    try:
        return file_path.relative_to(base_dir)
    except ValueError:
        return file_path.name


def generate_report(results: List[Dict[str, Any]], output_dir: Path, format: str = 'csv'):
    report_path = output_dir / f'crop_report.{format}'

    if format == 'csv':
        with open(report_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'filename', 'face_count', 'detected_faces',
                'crop_region', 'cropped', 'original_size', 'final_size'
            ])
            for r in results:
                writer.writerow([
                    r['filename'],
                    r['face_count'],
                    str(r['detected_faces']),
                    str(r['crop_region']),
                    r['cropped'],
                    str(r['original_size']),
                    str(r['final_size'])
                ])
    elif format == 'json':
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Report generated: {report_path}")


def process_images(
    input_dir: Path,
    output_dir: Path,
    cropper: FaceCropper,
    recursive: bool = False,
    generate_comparison: bool = False,
    report_format: Optional[str] = None
):
    output_dir.mkdir(parents=True, exist_ok=True)

    if generate_comparison:
        comparison_dir = output_dir / 'comparisons'
        comparison_dir.mkdir(exist_ok=True)

    images = collect_images(input_dir, recursive)
    print(f"Found {len(images)} images to process")

    results = []

    for idx, img_path in enumerate(images, 1):
        print(f"Processing [{idx}/{len(images)}]: {img_path.name}")

        image = cv2.imread(str(img_path))
        if image is None:
            print(f"  Warning: Could not read {img_path}, skipping")
            continue

        cropped, result = cropper.crop_image(image)
        result['filename'] = str(img_path)

        rel_path = get_relative_path(img_path, input_dir)
        out_path = output_dir / rel_path
        out_path.parent.mkdir(parents=True, exist_ok=True)

        cv2.imwrite(str(out_path), cropped)
        result['output_path'] = str(out_path)

        if generate_comparison:
            comparison = create_comparison_image(image, cropped)
            comp_path = comparison_dir / f"{rel_path.stem}_comparison{rel_path.suffix}"
            comp_path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(comp_path), comparison)

        results.append(result)

        status = f"cropped (region: {result['crop_region']})" if result['cropped'] else "no faces detected (kept original)"
        print(f"  Faces: {result['face_count']}, {status}")

    if report_format:
        generate_report(results, output_dir, report_format)

    print(f"\nProcessing complete. Output saved to: {output_dir}")
    return results


def parse_fill_color(color_str: str) -> Tuple[int, int, int]:
    color_str = color_str.lower()
    if color_str == 'white':
        return (255, 255, 255)
    elif color_str == 'black':
        return (0, 0, 0)
    else:
        try:
            parts = color_str.split(',')
            if len(parts) == 3:
                return tuple(int(p.strip()) for p in parts)
        except (ValueError, TypeError):
            pass
    raise ValueError(f"Invalid fill color: {color_str}. Use 'white', 'black', or 'R,G,B'")


def parse_output_size(size_str: str) -> Optional[Tuple[int, int]]:
    if not size_str:
        return None
    try:
        w, h = size_str.lower().split('x')
        return (int(w.strip()), int(h.strip()))
    except (ValueError, TypeError):
        raise ValueError(f"Invalid output size: {size_str}. Use format: WIDTHxHEIGHT (e.g., 800x800)")


def main():
    parser = argparse.ArgumentParser(
        description='Batch image cropping tool based on face detection',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage - crop with largest face, 1.5x scale
  python face_cropper.py -i ./photos -o ./output

  # Include all faces and output 800x800 with black padding
  python face_cropper.py -i ./photos -o ./output --mode all --size 800x800 --fill black

  # Use dlib detector, recursive, generate comparison images and JSON report
  python face_cropper.py -i ./photos -o ./output --model dlib -r --compare --report json

  # Custom scale factor 2.0, output 1024x768
  python face_cropper.py -i ./photos -o ./output --scale 2.0 --size 1024x768
        """
    )

    parser.add_argument('-i', '--input', required=True,
                        help='Input directory containing images')
    parser.add_argument('-o', '--output', required=True,
                        help='Output directory for cropped images')
    parser.add_argument('--model', default='opencv', choices=['opencv', 'dlib'],
                        help='Face detection model to use (default: opencv)')
    parser.add_argument('--scale', type=float, default=1.5,
                        help='Scale factor for face box expansion (default: 1.5)')
    parser.add_argument('--mode', default='largest', choices=['largest', 'all'],
                        help='Crop mode: largest face or all faces bounding box (default: largest)')
    parser.add_argument('--size', default='',
                        help='Output size (e.g., 800x800). If not set, keep original crop size')
    parser.add_argument('--fill', default='white',
                        help="Fill color for padding: 'white', 'black', or 'R,G,B' (default: white)")
    parser.add_argument('-r', '--recursive', action='store_true',
                        help='Recursively process subdirectories')
    parser.add_argument('--compare', action='store_true',
                        help='Generate before/after comparison images')
    parser.add_argument('--report', default=None, choices=['csv', 'json'],
                        help='Generate crop report in specified format')

    args = parser.parse_args()

    input_dir = Path(args.input).expanduser().resolve()
    output_dir = Path(args.output).expanduser().resolve()

    if not input_dir.exists():
        print(f"Error: Input directory does not exist: {input_dir}")
        return 1

    if not input_dir.is_dir():
        print(f"Error: Input path is not a directory: {input_dir}")
        return 1

    try:
        output_size = parse_output_size(args.size)
        fill_color = parse_fill_color(args.fill)

        print(f"Initializing face detector (model: {args.model})...")
        detector = FaceDetector(model=args.model)

        print(f"Initializing cropper (scale: {args.scale}, mode: {args.mode})...")
        if output_size:
            print(f"Output size: {output_size[0]}x{output_size[1]}, fill color: {fill_color}")

        cropper = FaceCropper(
            detector=detector,
            scale_factor=args.scale,
            crop_mode=args.mode,
            output_size=output_size,
            fill_color=fill_color
        )

        process_images(
            input_dir=input_dir,
            output_dir=output_dir,
            cropper=cropper,
            recursive=args.recursive,
            generate_comparison=args.compare,
            report_format=args.report
        )

        return 0

    except Exception as e:
        print(f"Error: {e}")
        return 1


if __name__ == '__main__':
    exit(main())
