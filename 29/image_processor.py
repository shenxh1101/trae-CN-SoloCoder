import os
import re
import io
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont, ImageOps, ExifTags
from datetime import datetime
from config import SUPPORTED_FORMATS, INTERPOLATION_METHODS


class ImageProcessor:
    def __init__(self):
        self.current_image = None
        self.original_image = None
        self.current_path = None

    def load_image(self, path):
        self.current_path = path
        self.original_image = Image.open(path)
        self.current_image = self.original_image.copy()
        return self.current_image

    def get_pil_image(self):
        return self.current_image

    def get_cv_image(self):
        if self.current_image is None:
            return None
        return cv2.cvtColor(np.array(self.current_image), cv2.COLOR_RGB2BGR)

    def set_image_from_cv(self, cv_img):
        rgb_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        self.current_image = Image.fromarray(rgb_img)
        return self.current_image

    def resize(self, width=None, height=None, percent=None, keep_aspect=True, interpolation='bicubic'):
        if self.current_image is None:
            return None

        interp_map = {
            'nearest': Image.NEAREST,
            'bilinear': Image.BILINEAR,
            'bicubic': Image.BICUBIC,
            'lanczos': Image.LANCZOS,
            'box': Image.BOX,
            'hamming': Image.HAMMING
        }
        interp = interp_map.get(interpolation, Image.BICUBIC)

        orig_w, orig_h = self.current_image.size

        if percent is not None:
            new_w = int(orig_w * percent / 100)
            new_h = int(orig_h * percent / 100)
        else:
            if keep_aspect and width and height:
                ratio = min(width / orig_w, height / orig_h)
                new_w = int(orig_w * ratio)
                new_h = int(orig_h * ratio)
            elif keep_aspect and width:
                new_w = width
                new_h = int(orig_h * (width / orig_w))
            elif keep_aspect and height:
                new_h = height
                new_w = int(orig_w * (height / orig_h))
            else:
                new_w = width if width else orig_w
                new_h = height if height else orig_h

        self.current_image = self.current_image.resize((new_w, new_h), interp)
        return self.current_image

    def convert_format(self, output_format, quality=85):
        if self.current_image is None:
            return None

        if output_format.upper() == 'JPEG' and self.current_image.mode in ('RGBA', 'P'):
            self.current_image = self.current_image.convert('RGB')
        elif output_format.upper() == 'PNG' and self.current_image.mode != 'RGBA':
            self.current_image = self.current_image.convert('RGBA')

        return self.current_image, quality

    def save_image(self, output_path, output_format=None, quality=85):
        if self.current_image is None:
            return False

        save_format = output_format or self._get_format_from_ext(output_path)

        save_kwargs = {}
        if save_format.upper() in ('JPEG', 'JPG'):
            save_kwargs['quality'] = quality
            save_kwargs['optimize'] = True
            if self.current_image.mode in ('RGBA', 'P'):
                self.current_image = self.current_image.convert('RGB')
        elif save_format.upper() == 'WEBP':
            save_kwargs['quality'] = quality
        elif save_format.upper() == 'PNG':
            save_kwargs['optimize'] = True

        self.current_image.save(output_path, format=save_format.upper(), **save_kwargs)
        return True

    def _get_format_from_ext(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in ('.jpg', '.jpeg'):
            return 'JPEG'
        elif ext == '.png':
            return 'PNG'
        elif ext == '.bmp':
            return 'BMP'
        elif ext == '.webp':
            return 'WEBP'
        return 'JPEG'

    def apply_filter(self, filter_name, **kwargs):
        if self.current_image is None:
            return None

        if filter_name == '灰度化':
            self.current_image = self.current_image.convert('L').convert('RGB')
        elif filter_name == '黑白阈值':
            threshold = kwargs.get('threshold', 128)
            gray = self.current_image.convert('L')
            bw = gray.point(lambda x: 255 if x > threshold else 0, '1')
            self.current_image = bw.convert('RGB')
        elif filter_name == '老照片':
            img_array = np.array(self.current_image)
            r = img_array[:, :, 0] * 0.393 + img_array[:, :, 1] * 0.769 + img_array[:, :, 2] * 0.189
            g = img_array[:, :, 0] * 0.349 + img_array[:, :, 1] * 0.686 + img_array[:, :, 2] * 0.168
            b = img_array[:, :, 0] * 0.272 + img_array[:, :, 1] * 0.534 + img_array[:, :, 2] * 0.131
            r = np.clip(r, 0, 255).astype(np.uint8)
            g = np.clip(g, 0, 255).astype(np.uint8)
            b = np.clip(b, 0, 255).astype(np.uint8)
            sepia = np.stack([r, g, b], axis=2)
            self.current_image = Image.fromarray(sepia)
        elif filter_name == '浮雕':
            kernel = np.array([[-2, -1, 0], [-1, 1, 1], [0, 1, 2]])
            img_cv = self.get_cv_image()
            embossed = cv2.filter2D(img_cv, -1, kernel)
            self.set_image_from_cv(embossed)
        elif filter_name == '马赛克':
            scale = kwargs.get('mosaic_scale', 10)
            img_cv = self.get_cv_image()
            h, w = img_cv.shape[:2]
            small = cv2.resize(img_cv, (w // scale, h // scale), interpolation=cv2.INTER_NEAREST)
            mosaic = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)
            self.set_image_from_cv(mosaic)
        elif filter_name == '高斯模糊':
            radius = kwargs.get('blur_radius', 5)
            self.current_image = self.current_image.filter(ImageFilter.GaussianBlur(radius=radius))
        elif filter_name == '边缘检测':
            img_cv = self.get_cv_image()
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 100, 200)
            edges_rgb = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
            self.set_image_from_cv(edges_rgb)
        elif filter_name == '轮廓提取':
            img_cv = self.get_cv_image()
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            contour_img = np.zeros_like(img_cv)
            cv2.drawContours(contour_img, contours, -1, (0, 255, 0), 2)
            self.set_image_from_cv(contour_img)

        return self.current_image

    def add_watermark(self, watermark_type, **kwargs):
        if self.current_image is None:
            return None

        base_img = self.current_image.copy()
        if base_img.mode != 'RGBA':
            base_img = base_img.convert('RGBA')

        overlay = Image.new('RGBA', base_img.size, (0, 0, 0, 0))

        if watermark_type == 'image':
            wm_path = kwargs.get('watermark_path')
            if not wm_path or not os.path.exists(wm_path):
                return self.current_image

            wm = Image.open(wm_path).convert('RGBA')
            scale = kwargs.get('scale', 0.2)
            opacity = kwargs.get('opacity', 0.5)
            rotation = kwargs.get('rotation', 0)
            position = kwargs.get('position', '右下')

            base_w, base_h = base_img.size
            max_wm_w = int(base_w * scale)
            max_wm_h = int(base_h * scale)
            wm_ratio = wm.size[0] / wm.size[1]
            if wm_ratio > max_wm_w / max_wm_h:
                wm_w = max_wm_w
                wm_h = int(max_wm_w / wm_ratio)
            else:
                wm_h = max_wm_h
                wm_w = int(max_wm_h * wm_ratio)
            wm = wm.resize((wm_w, wm_h), Image.LANCZOS)

            if rotation != 0:
                wm = wm.rotate(rotation, expand=True, resample=Image.BICUBIC)

            alpha = wm.split()[3]
            alpha = ImageEnhance.Brightness(alpha).enhance(opacity)
            wm.putalpha(alpha)

            pos = self._calc_watermark_position(base_img.size, wm.size, position)
            overlay.paste(wm, pos, wm)

        elif watermark_type == 'text':
            text = kwargs.get('text', '水印')
            font_size = kwargs.get('font_size', 36)
            font_color = kwargs.get('font_color', (255, 255, 255))
            opacity = kwargs.get('opacity', 0.5)
            rotation = kwargs.get('rotation', 0)
            position = kwargs.get('position', '右下')

            draw = ImageDraw.Draw(overlay)
            try:
                font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", font_size)
            except:
                try:
                    font = ImageFont.truetype("Arial.ttf", font_size)
                except:
                    font = ImageFont.load_default()

            bbox = draw.textbbox((0, 0), text, font=font)
            text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
            text_img = Image.new('RGBA', (text_w + 20, text_h + 20), (0, 0, 0, 0))
            text_draw = ImageDraw.Draw(text_img)
            text_draw.text((10, 10), text, font=font, fill=(*font_color, int(255 * opacity)))

            if rotation != 0:
                text_img = text_img.rotate(rotation, expand=True, resample=Image.BICUBIC)

            pos = self._calc_watermark_position(base_img.size, text_img.size, position)
            overlay.paste(text_img, pos, text_img)

        result = Image.alpha_composite(base_img, overlay)
        if self.current_image.mode != 'RGBA':
            result = result.convert(self.current_image.mode)
        self.current_image = result
        return self.current_image

    def _calc_watermark_position(self, base_size, wm_size, position):
        base_w, base_h = base_size
        wm_w, wm_h = wm_size
        margin = 20

        pos_map = {
            '左上': (margin, margin),
            '上中': ((base_w - wm_w) // 2, margin),
            '右上': (base_w - wm_w - margin, margin),
            '左中': (margin, (base_h - wm_h) // 2),
            '居中': ((base_w - wm_w) // 2, (base_h - wm_h) // 2),
            '右中': (base_w - wm_w - margin, (base_h - wm_h) // 2),
            '左下': (margin, base_h - wm_h - margin),
            '下中': ((base_w - wm_w) // 2, base_h - wm_h - margin),
            '右下': (base_w - wm_w - margin, base_h - wm_h - margin)
        }
        return pos_map.get(position, pos_map['右下'])

    def rotate_flip(self, operation, angle=0, bg_color=(255, 255, 255)):
        if self.current_image is None:
            return None

        if operation == '90度顺时针':
            self.current_image = self.current_image.rotate(-90, expand=True)
        elif operation == '180度':
            self.current_image = self.current_image.rotate(180, expand=True)
        elif operation == '90度逆时针':
            self.current_image = self.current_image.rotate(90, expand=True)
        elif operation == '水平翻转':
            self.current_image = self.current_image.transpose(Image.FLIP_LEFT_RIGHT)
        elif operation == '垂直翻转':
            self.current_image = self.current_image.transpose(Image.FLIP_TOP_BOTTOM)
        elif operation == '自定义角度' and angle != 0:
            self.current_image = self.current_image.rotate(
                angle, expand=True, resample=Image.BICUBIC, fillcolor=bg_color
            )

        return self.current_image

    def crop_image(self, mode, **kwargs):
        if self.current_image is None:
            return None

        w, h = self.current_image.size

        if mode == '固定尺寸':
            crop_w = kwargs.get('crop_width', w)
            crop_h = kwargs.get('crop_height', h)
            left = (w - crop_w) // 2
            top = (h - crop_h) // 2
            right = left + crop_w
            bottom = top + crop_h
            self.current_image = self.current_image.crop((left, top, right, bottom))
        elif mode == '指定区域比例':
            x_ratio = kwargs.get('x_ratio', 0.1)
            y_ratio = kwargs.get('y_ratio', 0.1)
            w_ratio = kwargs.get('w_ratio', 0.8)
            h_ratio = kwargs.get('h_ratio', 0.8)
            left = int(w * x_ratio)
            top = int(h * y_ratio)
            right = left + int(w * w_ratio)
            bottom = top + int(h * h_ratio)
            self.current_image = self.current_image.crop((left, top, right, bottom))
        elif mode == '智能裁剪空白边缘':
            threshold = kwargs.get('edge_threshold', 10)
            img_cv = self.get_cv_image()
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 255 - threshold, 255, cv2.THRESH_BINARY_INV)
            coords = cv2.findNonZero(thresh)
            if coords is not None:
                x, y, w_crop, h_crop = cv2.boundingRect(coords)
                if w_crop > 10 and h_crop > 10:
                    self.current_image = self.current_image.crop((x, y, x + w_crop, y + h_crop))

        return self.current_image

    def adjust_colors(self, brightness=1.0, contrast=1.0, saturation=1.0, hue=0.0, sharpness=1.0):
        if self.current_image is None:
            return None

        if brightness != 1.0:
            enhancer = ImageEnhance.Brightness(self.current_image)
            self.current_image = enhancer.enhance(brightness)

        if contrast != 1.0:
            enhancer = ImageEnhance.Contrast(self.current_image)
            self.current_image = enhancer.enhance(contrast)

        if saturation != 1.0:
            enhancer = ImageEnhance.Color(self.current_image)
            self.current_image = enhancer.enhance(saturation)

        if sharpness != 1.0:
            enhancer = ImageEnhance.Sharpness(self.current_image)
            self.current_image = enhancer.enhance(sharpness)

        if hue != 0.0:
            img_hsv = cv2.cvtColor(self.get_cv_image(), cv2.COLOR_BGR2HSV)
            img_hsv[:, :, 0] = (img_hsv[:, :, 0] + int(hue * 90)) % 180
            img_bgr = cv2.cvtColor(img_hsv, cv2.COLOR_HSV2BGR)
            self.set_image_from_cv(img_bgr)

        return self.current_image

    def portrait_beautify(self, smooth_strength=5, remove_red_eye=True):
        if self.current_image is None:
            return None

        img_cv = self.get_cv_image()

        if smooth_strength > 0:
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)

            for (x, y, w, h) in faces:
                face_roi = img_cv[y:y + h, x:x + w]
                smoothed = cv2.bilateralFilter(face_roi, smooth_strength * 2, smooth_strength * 10, smooth_strength * 10)
                mask = np.zeros_like(face_roi)
                center = (w // 2, h // 2)
                axes = (int(w * 0.45), int(h * 0.55))
                cv2.ellipse(mask, center, axes, 0, 0, 360, (255, 255, 255), -1)
                mask = cv2.GaussianBlur(mask, (15, 15), 0)
                mask = mask.astype(float) / 255.0
                img_cv[y:y + h, x:x + w] = (face_roi * (1 - mask) + smoothed * mask).astype(np.uint8)

        if remove_red_eye:
            eye_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_eye.xml'
            )
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            eyes = eye_cascade.detectMultiScale(gray, 1.1, 4)

            for (ex, ey, ew, eh) in eyes:
                eye_roi = img_cv[ey:ey + eh, ex:ex + ew]
                hsv = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2HSV)
                lower_red = np.array([0, 100, 100])
                upper_red = np.array([10, 255, 255])
                mask1 = cv2.inRange(hsv, lower_red, upper_red)
                lower_red2 = np.array([160, 100, 100])
                upper_red2 = np.array([180, 255, 255])
                mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
                mask = mask1 + mask2

                if mask.sum() > 0:
                    mask = cv2.GaussianBlur(mask, (5, 5), 0)
                    b, g, r = cv2.split(eye_roi)
                    r_mean = int((b.mean() + g.mean()) / 2)
                    r = np.where(mask > 0, r_mean, r)
                    eye_roi = cv2.merge([b, g, r.astype(np.uint8)])
                    img_cv[ey:ey + eh, ex:ex + ew] = eye_roi

        self.set_image_from_cv(img_cv)
        return self.current_image

    def get_exif_date(self):
        if self.current_path is None or not os.path.exists(self.current_path):
            return None

        try:
            img = Image.open(self.current_path)
            exif_data = img._getexif()
            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = ExifTags.TAGS.get(tag_id, tag_id)
                    if tag in ('DateTimeOriginal', 'DateTime', 'DateTimeDigitized'):
                        return value
        except:
            pass
        return None

    def get_image_info(self):
        if self.current_image is None:
            return {}
        return {
            'size': self.current_image.size,
            'mode': self.current_image.mode,
            'format': getattr(self.original_image, 'format', 'Unknown') if self.original_image else 'Unknown',
            'path': self.current_path
        }

    def reset(self):
        if self.original_image is not None:
            self.current_image = self.original_image.copy()
        return self.current_image


def batch_rename(files, rename_mode, prefix='image', start_index=1, regex_pattern='', regex_replace='', date_format='%Y%m%d_%H%M%S'):
    renamed = []
    index = start_index

    for i, filepath in enumerate(files):
        path, filename = os.path.split(filepath)
        name, ext = os.path.splitext(filename)

        if rename_mode == '序号+前缀':
            new_name = f"{prefix}{index:04d}{ext}"
            index += 1
        elif rename_mode == '拍摄日期':
            processor = ImageProcessor()
            processor.current_path = filepath
            date_str = processor.get_exif_date()
            if date_str:
                try:
                    dt = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
                    new_name = f"{dt.strftime(date_format)}{ext}"
                except:
                    new_name = f"{datetime.now().strftime(date_format)}_{i:04d}{ext}"
            else:
                mtime = os.path.getmtime(filepath)
                dt = datetime.fromtimestamp(mtime)
                new_name = f"{dt.strftime(date_format)}_{i:04d}{ext}"
        elif rename_mode == '正则表达式替换' and regex_pattern:
            try:
                new_name = re.sub(regex_pattern, regex_replace, name) + ext
            except:
                new_name = filename
        else:
            new_name = filename

        new_path = os.path.join(path, new_name)
        counter = 1
        while os.path.exists(new_path) and new_path != filepath:
            name_no_ext, ext_only = os.path.splitext(new_name)
            new_path = os.path.join(path, f"{name_no_ext}_{counter}{ext_only}")
            counter += 1

        renamed.append((filepath, new_path))

    return renamed
