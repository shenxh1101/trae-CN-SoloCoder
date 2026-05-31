import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import io
import base64

class ImageProcessor:
    def __init__(self):
        pass

    def load_image(self, image_data):
        if isinstance(image_data, str):
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
        else:
            image = Image.open(image_data)
        return image

    def image_to_base64(self, image, format='JPEG', quality=95):
        buffer = io.BytesIO()
        image.save(buffer, format=format, quality=quality)
        buffer.seek(0)
        img_str = base64.b64encode(buffer.read()).decode()
        return f'data:image/{format.lower()};base64,{img_str}'

    def denoise(self, image, intensity='medium'):
        strength_map = {
            'weak': 1,
            'medium': 2,
            'strong': 3
        }
        strength = strength_map.get(intensity, 2)
        
        img_array = np.array(image, dtype=np.float32)
        result = np.zeros_like(img_array)
        
        kernel_size = strength * 2 + 1
        pad = strength
        
        if len(img_array.shape) == 3:
            padded = np.pad(img_array, ((pad, pad), (pad, pad), (0, 0)), mode='reflect')
            for c in range(3):
                for y in range(img_array.shape[0]):
                    for x in range(img_array.shape[1]):
                        region = padded[y:y+kernel_size, x:x+kernel_size, c]
                        result[y, x, c] = np.median(region)
        else:
            padded = np.pad(img_array, pad, mode='reflect')
            for y in range(img_array.shape[0]):
                for x in range(img_array.shape[1]):
                    region = padded[y:y+kernel_size, x:x+kernel_size]
                    result[y, x] = np.median(region)
        
        result = np.clip(result, 0, 255).astype(np.uint8)
        return Image.fromarray(result)

    def bilateral_denoise(self, image, intensity='medium'):
        sigma_map = {'weak': 30, 'medium': 50, 'strong': 80}
        sigma = sigma_map.get(intensity, 50)
        
        img_array = np.array(image, dtype=np.float32)
        result = np.zeros_like(img_array)
        
        kernel_size = 5
        pad = 2
        sigma_color = sigma
        sigma_space = sigma / 5
        
        if len(img_array.shape) == 3:
            padded = np.pad(img_array, ((pad, pad), (pad, pad), (0, 0)), mode='reflect')
            for c in range(3):
                for y in range(img_array.shape[0]):
                    for x in range(img_array.shape[1]):
                        center = padded[y+pad, x+pad, c]
                        region = padded[y:y+kernel_size, x:x+kernel_size, c]
                        
                        diff = np.abs(region - center)
                        color_weight = np.exp(-(diff ** 2) / (2 * sigma_color ** 2))
                        
                        yy, xx = np.mgrid[-pad:pad+1, -pad:pad+1]
                        space_weight = np.exp(-(xx ** 2 + yy ** 2) / (2 * sigma_space ** 2))
                        
                        weight = color_weight * space_weight
                        result[y, x, c] = np.sum(region * weight) / np.sum(weight)
        else:
            padded = np.pad(img_array, pad, mode='reflect')
            for y in range(img_array.shape[0]):
                for x in range(img_array.shape[1]):
                    center = padded[y+pad, x+pad]
                    region = padded[y:y+kernel_size, x:x+kernel_size]
                    
                    diff = np.abs(region - center)
                    color_weight = np.exp(-(diff ** 2) / (2 * sigma_color ** 2))
                    
                    yy, xx = np.mgrid[-pad:pad+1, -pad:pad+1]
                    space_weight = np.exp(-(xx ** 2 + yy ** 2) / (2 * sigma_space ** 2))
                    
                    weight = color_weight * space_weight
                    result[y, x] = np.sum(region * weight) / np.sum(weight)
        
        result = np.clip(result, 0, 255).astype(np.uint8)
        return Image.fromarray(result)

    def sharpen(self, image, intensity='medium'):
        factor_map = {
            'weak': 1.3,
            'medium': 1.8,
            'strong': 2.5
        }
        factor = factor_map.get(intensity, 1.8)
        
        blurred = image.filter(ImageFilter.GaussianBlur(radius=1))
        
        img_array = np.array(image, dtype=np.float32)
        blurred_array = np.array(blurred, dtype=np.float32)
        
        sharpened = img_array + (img_array - blurred_array) * factor
        sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
        
        return Image.fromarray(sharpened)

    def unsharp_mask(self, image, intensity='medium'):
        amount_map = {'weak': 0.8, 'medium': 1.5, 'strong': 2.5}
        radius_map = {'weak': 0.5, 'medium': 1.0, 'strong': 2.0}
        
        amount = amount_map.get(intensity, 1.5)
        radius = radius_map.get(intensity, 1.0)
        
        return image.filter(ImageFilter.UnsharpMask(radius=radius, percent=int(amount * 100)))

    def adjust_contrast(self, image, intensity='medium'):
        factor_map = {
            'weak': 1.2,
            'medium': 1.5,
            'strong': 2.0
        }
        factor = factor_map.get(intensity, 1.5)
        
        enhancer = ImageEnhance.Contrast(image)
        return enhancer.enhance(factor)

    def clahe_enhance(self, image, intensity='medium'):
        clip_map = {'weak': 2.0, 'medium': 3.0, 'strong': 4.0}
        clip = clip_map.get(intensity, 3.0)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        img_array = np.array(image)
        
        r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]
        
        def equalize_channel(channel, clip_limit, grid_size=(8, 8)):
            h, w = channel.shape
            gh, gw = grid_size
            
            tile_h = h // gh
            tile_w = w // gw
            
            clahe_result = np.zeros_like(channel, dtype=np.float32)
            
            for gy in range(gh):
                for gx in range(gw):
                    y_start = gy * tile_h
                    y_end = y_start + tile_h
                    x_start = gx * tile_w
                    x_end = x_start + tile_w
                    
                    tile = channel[y_start:y_end, x_start:x_end]
                    hist, bins = np.histogram(tile.flatten(), 256, [0, 256])
                    
                    hist = hist.astype(np.float32)
                    clip_amount = clip_limit * tile.size / 256
                    excess = hist[hist > clip_amount].sum() - clip_amount * (hist > clip_amount).sum()
                    hist[hist > clip_amount] = clip_amount
                    hist += excess / 256
                    
                    cdf = hist.cumsum()
                    cdf = cdf * 255 / cdf[-1]
                    
                    for y in range(y_start, y_end):
                        for x in range(x_start, x_end):
                            clahe_result[y, x] = cdf[channel[y, x]]
            
            return np.clip(clahe_result, 0, 255).astype(np.uint8)
        
        r_eq = equalize_channel(r, clip)
        g_eq = equalize_channel(g, clip)
        b_eq = equalize_channel(b, clip)
        
        result = np.stack([r_eq, g_eq, b_eq], axis=-1)
        return Image.fromarray(result)

    def colorize(self, image, intensity='medium'):
        strength_map = {'weak': 0.15, 'medium': 0.3, 'strong': 0.5}
        strength = strength_map.get(intensity, 0.3)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        img_array = np.array(image, dtype=np.float32)
        
        height, width = img_array.shape[:2]
        
        for y in range(height):
            for x in range(width):
                r, g, b = img_array[y, x]
                avg = (r + g + b) / 3.0
                
                if avg > 180 and b > r and b > g:
                    img_array[y, x, 0] = r * (1 - strength)
                    img_array[y, x, 1] = g * (1 - strength * 0.5) + 20 * strength
                    img_array[y, x, 2] = min(255, b + 50 * strength)
                
                elif avg < 100 and g > r * 0.8 and g > b:
                    img_array[y, x, 0] = r * (1 - strength * 0.5)
                    img_array[y, x, 1] = min(255, g + 40 * strength)
                    img_array[y, x, 2] = b * (1 - strength * 0.3)
                
                elif r > 100 and g > 80 and b > 60 and r > g and g > b:
                    img_array[y, x, 0] = min(255, r + 30 * strength)
                    img_array[y, x, 1] = min(255, g + 15 * strength)
                    img_array[y, x, 2] = min(255, b + 5 * strength)
                
                else:
                    img_array[y, x, 0] = min(255, r + 10 * strength)
                    img_array[y, x, 1] = min(255, g + 5 * strength)
                    img_array[y, x, 2] = min(255, b + 15 * strength)
        
        img_array = np.clip(img_array, 0, 255).astype(np.uint8)
        return Image.fromarray(img_array)

    def remove_scratches(self, image, intensity='medium'):
        threshold_map = {'weak': 20, 'medium': 35, 'strong': 50}
        threshold = threshold_map.get(intensity, 35)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        img_array = np.array(image, dtype=np.float32)
        result = img_array.copy()
        
        gray = np.mean(img_array, axis=-1)
        
        kernel_size = 3
        pad = 1
        height, width = gray.shape
        
        gray_padded = np.pad(gray, pad, mode='reflect')
        
        for y in range(height):
            for x in range(width):
                center = gray_padded[y+pad, x+pad]
                region = gray_padded[y:y+kernel_size, x:x+kernel_size]
                
                mask = np.ones((kernel_size, kernel_size), dtype=bool)
                mask[pad, pad] = False
                
                neighbors = region[mask]
                neighbor_mean = np.mean(neighbors)
                
                if abs(center - neighbor_mean) > threshold:
                    img_padded = np.pad(img_array, ((pad, pad), (pad, pad), (0, 0)), mode='reflect')
                    for c in range(3):
                        region_c = img_padded[y:y+kernel_size, x:x+kernel_size, c]
                        neighbors_c = region_c[mask]
                        result[y, x, c] = np.mean(neighbors_c)
        
        result = np.clip(result, 0, 255).astype(np.uint8)
        return Image.fromarray(result)

    def apply_mask(self, original, modified, mask_data):
        if mask_data is None:
            return modified
        
        mask_image = self.load_image(mask_data).convert('L')
        mask_image = mask_image.resize(original.size)
        
        mask_array = np.array(mask_image) / 255.0
        mask_array = np.stack([mask_array] * 3, axis=-1)
        
        original_array = np.array(original)
        modified_array = np.array(modified)
        
        result_array = original_array * (1 - mask_array) + modified_array * mask_array
        result_array = result_array.astype(np.uint8)
        
        return Image.fromarray(result_array)

    def repair_image(self, image_data, operations, intensity='medium', mask=None):
        original_image = self.load_image(image_data)
        if original_image.mode != 'RGB':
            original_image = original_image.convert('RGB')
        
        current_image = original_image.copy()
        
        steps = {}
        
        if operations.get('denoise', False):
            current_image = self.bilateral_denoise(current_image, intensity)
            steps['denoised'] = self.image_to_base64(current_image)
        
        if operations.get('sharpen', False):
            current_image = self.unsharp_mask(current_image, intensity)
            steps['sharpened'] = self.image_to_base64(current_image)
        
        if operations.get('contrast', False):
            current_image = self.clahe_enhance(current_image, intensity)
            steps['contrast'] = self.image_to_base64(current_image)
        
        if operations.get('colorize', False):
            current_image = self.colorize(current_image, intensity)
            steps['colorized'] = self.image_to_base64(current_image)
        
        if operations.get('removeScratches', False):
            current_image = self.remove_scratches(current_image, intensity)
        
        if mask is not None:
            current_image = self.apply_mask(original_image, current_image, mask)
        
        result = {
            'original': self.image_to_base64(original_image),
            'repaired': self.image_to_base64(current_image),
            'steps': steps
        }
        
        return result

    def simulate_damage(self, image_data, damage_level=30, scratch_count=10):
        image = self.load_image(image_data)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        img_array = np.array(image, dtype=np.float32)
        
        noise_strength = damage_level / 100 * 80
        noise = (np.random.rand(*img_array.shape) - 0.5) * noise_strength
        img_array = np.clip(img_array + noise, 0, 255)
        
        height, width = img_array.shape[:2]
        
        for _ in range(scratch_count):
            x1 = np.random.randint(0, width)
            y1 = np.random.randint(0, height)
            length = np.random.randint(20, 100)
            angle = np.random.rand() * np.pi * 2
            thickness = np.random.uniform(0.5, 2.5)
            
            x2 = int(x1 + np.cos(angle) * length)
            y2 = int(y1 + np.sin(angle) * length)
            
            steps = max(abs(x2 - x1), abs(y2 - y1))
            for i in range(steps + 1):
                x = int(x1 + (x2 - x1) * i / steps)
                y = int(y1 + (y2 - y1) * i / steps)
                
                for t in np.arange(-thickness, thickness + 1, 0.5):
                    px = int(x + t * np.cos(angle + np.pi / 2))
                    py = int(y + t * np.sin(angle + np.pi / 2))
                    
                    if 0 <= px < width and 0 <= py < height:
                        scratch_light = np.random.randint(100, 150)
                        img_array[py, px] = np.minimum(255, img_array[py, px] + scratch_light)
        
        img_array = img_array.astype(np.uint8)
        damaged_image = Image.fromarray(img_array)
        
        return {
            'damaged': self.image_to_base64(damaged_image)
        }
