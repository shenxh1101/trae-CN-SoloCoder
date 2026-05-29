import os
import time
from datetime import datetime
from typing import List, Optional, Tuple
from PIL import Image, ImageDraw, ImageFont, ImageFilter


class ImageProcessor:
    @staticmethod
    def save_png(image: Image.Image, output_dir: str, prefix: str = "screenshot") -> str:
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        filename = f"{prefix}_{timestamp}.png"
        filepath = os.path.join(output_dir, filename)
        
        if image.mode == "RGBA":
            background = Image.new("RGB", image.size, (0, 0, 0))
            background.paste(image, mask=image.split()[3])
            background.save(filepath, "PNG")
        else:
            image.save(filepath, "PNG")
        
        return filepath

    @staticmethod
    def convert_to_jpg(png_path: str, quality: int = 85, delete_original: bool = True) -> str:
        if not os.path.exists(png_path):
            raise FileNotFoundError(f"文件不存在: {png_path}")
        
        jpg_path = os.path.splitext(png_path)[0] + ".jpg"
        
        with Image.open(png_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.save(jpg_path, "JPEG", quality=quality, optimize=True)
        
        if delete_original:
            os.remove(png_path)
        
        return jpg_path

    @staticmethod
    def add_watermark(image: Image.Image, text: Optional[str] = None, 
                     position: str = "bottom-right", 
                     font_size: int = 24,
                     opacity: int = 180) -> Image.Image:
        if text is None:
            text = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if image.mode != "RGBA":
            image = image.convert("RGBA")
        
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        padding = 15
        positions = {
            "top-left": (padding, padding),
            "top-right": (image.width - text_width - padding, padding),
            "bottom-left": (padding, image.height - text_height - padding),
            "bottom-right": (image.width - text_width - padding, image.height - text_height - padding),
            "center": ((image.width - text_width) // 2, (image.height - text_height) // 2)
        }
        
        x, y = positions.get(position, positions["bottom-right"])
        
        draw.rectangle([x - 8, y - 5, x + text_width + 8, y + text_height + 5],
                       fill=(0, 0, 0, opacity // 2))
        draw.text((x, y), text, font=font, fill=(255, 255, 255, opacity))
        
        combined = Image.alpha_composite(image, overlay)
        return combined

    @staticmethod
    def create_gif(image_paths: List[str], output_path: str, 
                   duration: int = 500, loop: int = 0,
                   max_width: Optional[int] = None) -> str:
        if not image_paths:
            raise ValueError("没有图片可用于创建GIF")
        
        images = []
        for path in image_paths:
            if not os.path.exists(path):
                continue
            img = Image.open(path)
            if max_width and img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.LANCZOS)
            if img.mode != "P":
                img = img.convert("RGB")
            images.append(img)
        
        if not images:
            raise ValueError("没有有效的图片可用于创建GIF")
        
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        images[0].save(
            output_path,
            save_all=True,
            append_images=images[1:],
            duration=duration,
            loop=loop,
            optimize=True
        )
        
        return output_path

    @staticmethod
    def get_file_size(filepath: str) -> int:
        if os.path.exists(filepath):
            return os.path.getsize(filepath)
        return 0

    @staticmethod
    def format_size(size_bytes: int) -> str:
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"

    @staticmethod
    def resize_image(image: Image.Image, max_width: Optional[int] = None, 
                     max_height: Optional[int] = None) -> Image.Image:
        if not max_width and not max_height:
            return image
        
        ratio = 1.0
        if max_width and image.width > max_width:
            ratio = min(ratio, max_width / image.width)
        if max_height and image.height > max_height:
            ratio = min(ratio, max_height / image.height)
        
        if ratio < 1.0:
            new_width = int(image.width * ratio)
            new_height = int(image.height * ratio)
            return image.resize((new_width, new_height), Image.LANCZOS)
        
        return image
