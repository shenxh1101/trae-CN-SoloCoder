#!/usr/bin/env python3
from pathlib import Path
from PIL import Image


class AsciiPreview:
    def __init__(self, width=80, chars="@%#*+=-:. "):
        self.width = width
        self.chars = chars

    def generate(self, image_path, width=None):
        if width is None:
            width = self.width

        try:
            with Image.open(image_path) as img:
                img = img.convert('L')
                aspect_ratio = 0.5
                new_width = width
                new_height = int(img.height * new_width / img.width * aspect_ratio)
                img = img.resize((new_width, new_height))

                pixels = img.getdata()
                ascii_str = ''
                for pixel_value in pixels:
                    char_idx = int(pixel_value * len(self.chars) / 256)
                    if char_idx >= len(self.chars):
                        char_idx = len(self.chars) - 1
                    ascii_str += self.chars[char_idx]

                ascii_lines = [
                    ascii_str[i:i + new_width]
                    for i in range(0, len(ascii_str), new_width)
                ]
                return '\n'.join(ascii_lines)
        except Exception as e:
            return f"预览失败: {e}"

    def print_preview(self, image_path, width=None):
        ascii_art = self.generate(image_path, width)
        print("\n" + ascii_art + "\n")

    def generate_colorful(self, image_path, width=None):
        if width is None:
            width = self.width

        try:
            with Image.open(image_path) as img:
                img = img.convert('RGB')
                aspect_ratio = 0.5
                new_width = width
                new_height = int(img.height * new_width / img.width * aspect_ratio)
                img = img.resize((new_width, new_height))

                pixels = img.getdata()
                result = []
                for r, g, b in pixels:
                    brightness = int(0.299 * r + 0.587 * g + 0.114 * b)
                    char_idx = int(brightness * len(self.chars) / 256)
                    if char_idx >= len(self.chars):
                        char_idx = len(self.chars) - 1
                    char = self.chars[char_idx]
                    result.append(f"\033[38;2;{r};{g};{b}m{char}\033[0m")

                ascii_str = ''.join(result)
                ascii_lines = [
                    ascii_str[i:i + (new_width * 19)]
                    for i in range(0, len(ascii_str), (new_width * 19))
                ]
                return '\n'.join(ascii_lines)
        except Exception as e:
            return f"预览失败: {e}"

    def print_colorful_preview(self, image_path, width=None):
        ascii_art = self.generate_colorful(image_path, width)
        print("\n" + ascii_art + "\n")
