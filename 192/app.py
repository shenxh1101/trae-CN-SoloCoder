#!/usr/bin/env python3
import os
import io
import zipfile
import time
import uuid
import base64
from datetime import datetime, timedelta
from threading import Thread
import requests
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance
from flask import Flask, request, jsonify, send_file, send_from_directory, render_template_string

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
TEMP_FOLDER = 'temp'
for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER, TEMP_FOLDER]:
    os.makedirs(folder, exist_ok=True)

temp_files = {}

def cleanup_temp_files():
    while True:
        current_time = time.time()
        expired_files = []
        for filename, expiry_time in temp_files.items():
            if current_time > expiry_time:
                expired_files.append(filename)
        for filename in expired_files:
            filepath = os.path.join(TEMP_FOLDER, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
            del temp_files[filename]
        time.sleep(60)

Thread(target=cleanup_temp_files, daemon=True).start()

def apply_mosaic(image, block_size=10, shape='square', region=None, brightness=0, color_shift=(0, 0, 0)):
    img_array = np.array(image)
    height, width = img_array.shape[:2]
    
    if region:
        x1, y1, x2, y2 = region
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(width, x2), min(height, y2)
        
        region_img = image.crop((x1, y1, x2, y2))
        mosaic_region = _apply_mosaic_core(region_img, block_size, shape)
        result = image.copy()
        result.paste(mosaic_region, (x1, y1))
    else:
        result = _apply_mosaic_core(image, block_size, shape)
    
    if brightness != 0:
        enhancer = ImageEnhance.Brightness(result)
        result = enhancer.enhance(1 + brightness / 100)
    
    if color_shift != (0, 0, 0):
        img_array = np.array(result, dtype=np.int16)
        for i in range(3):
            img_array[:, :, i] = np.clip(img_array[:, :, i] + color_shift[i], 0, 255)
        result = Image.fromarray(img_array.astype(np.uint8))
    
    return result

def _apply_mosaic_core(image, block_size, shape):
    img_array = np.array(image)
    height, width = img_array.shape[:2]
    result_array = img_array.copy()
    
    for y in range(0, height, block_size):
        for x in range(0, width, block_size):
            y_end = min(y + block_size, height)
            x_end = min(x + block_size, width)
            block = img_array[y:y_end, x:x_end]
            
            if block.shape[0] > 0 and block.shape[1] > 0:
                avg_color = block.mean(axis=(0, 1)).astype(np.uint8)
                
                if shape == 'square':
                    result_array[y:y_end, x:x_end] = avg_color
                elif shape == 'circle':
                    center_y = y + block_size // 2
                    center_x = x + block_size // 2
                    radius = block_size // 2
                    
                    for py in range(y, y_end):
                        for px in range(x, x_end):
                            dy = py - center_y
                            dx = px - center_x
                            if dy * dy + dx * dx <= radius * radius:
                                result_array[py, px] = avg_color
    
    return Image.fromarray(result_array)

def apply_simulation_restore(image, strength=3):
    img_array = np.array(image, dtype=np.float32)
    kernel_size = strength * 2 + 1
    pad = strength
    
    padded = np.pad(img_array, ((pad, pad), (pad, pad), (0, 0)), mode='reflect')
    result = np.zeros_like(img_array)
    
    for i in range(kernel_size):
        for j in range(kernel_size):
            result += padded[i:i+img_array.shape[0], j:j+img_array.shape[1]]
    
    result /= (kernel_size * kernel_size)
    return Image.fromarray(result.astype(np.uint8))

def save_temp_image(image, filename_prefix, format='PNG', quality=95):
    unique_id = str(uuid.uuid4())
    filename = f"{filename_prefix}_{unique_id}.{format.lower()}"
    filepath = os.path.join(TEMP_FOLDER, filename)
    
    if format.upper() == 'JPEG':
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        image.save(filepath, 'JPEG', quality=quality)
    else:
        image.save(filepath, 'PNG')
    
    temp_files[filename] = time.time() + 3600
    return filename

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        image = Image.open(file.stream)
        original_filename = save_temp_image(image, 'original')
        
        buffered = io.BytesIO()
        if image.mode == 'RGBA':
            image.save(buffered, 'PNG')
        else:
            image.save(buffered, 'JPEG')
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'original_id': original_filename,
            'width': image.width,
            'height': image.height,
            'preview': f'data:image/jpeg;base64,{img_base64}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process', methods=['POST'])
def process_image():
    try:
        data = request.json
        original_id = data.get('original_id')
        block_size = int(data.get('block_size', 10))
        shape = data.get('shape', 'square')
        region = data.get('region')
        brightness = int(data.get('brightness', 0))
        color_shift = data.get('color_shift', [0, 0, 0])
        output_format = data.get('format', 'PNG')
        quality = int(data.get('quality', 95))
        
        if not original_id:
            return jsonify({'error': 'No original ID provided'}), 400
        
        filepath = os.path.join(TEMP_FOLDER, original_id)
        if not os.path.exists(filepath):
            return jsonify({'error': 'Original image not found or expired'}), 404
        
        image = Image.open(filepath)
        if image.mode != 'RGB' and image.mode != 'RGBA':
            image = image.convert('RGB')
        
        if region:
            region = tuple(map(int, region))
        
        color_shift = tuple(map(int, color_shift))
        
        mosaic_image = apply_mosaic(
            image, 
            block_size=block_size, 
            shape=shape, 
            region=region,
            brightness=brightness,
            color_shift=color_shift
        )
        
        mosaic_filename = save_temp_image(mosaic_image, 'mosaic', output_format, quality)
        
        buffered = io.BytesIO()
        if output_format.upper() == 'JPEG':
            if mosaic_image.mode == 'RGBA':
                mosaic_image = mosaic_image.convert('RGB')
            mosaic_image.save(buffered, 'JPEG', quality=quality)
            mime_type = 'image/jpeg'
        else:
            mosaic_image.save(buffered, 'PNG')
            mime_type = 'image/png'
        
        mosaic_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'mosaic_id': mosaic_filename,
            'preview': f'data:{mime_type};base64,{mosaic_base64}',
            'download_url': f'/temp/{mosaic_filename}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-url', methods=['POST'])
def process_url():
    try:
        data = request.json
        image_url = data.get('url')
        block_size = int(data.get('block_size', 10))
        shape = data.get('shape', 'square')
        region = data.get('region')
        brightness = int(data.get('brightness', 0))
        color_shift = data.get('color_shift', [0, 0, 0])
        output_format = data.get('format', 'PNG')
        quality = int(data.get('quality', 95))
        
        if not image_url:
            return jsonify({'error': 'No URL provided'}), 400
        
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        
        image = Image.open(io.BytesIO(response.content))
        if image.mode != 'RGB' and image.mode != 'RGBA':
            image = image.convert('RGB')
        
        if region:
            region = tuple(map(int, region))
        
        color_shift = tuple(map(int, color_shift))
        
        mosaic_image = apply_mosaic(
            image, 
            block_size=block_size, 
            shape=shape, 
            region=region,
            brightness=brightness,
            color_shift=color_shift
        )
        
        buffered = io.BytesIO()
        if output_format.upper() == 'JPEG':
            if mosaic_image.mode == 'RGBA':
                mosaic_image = mosaic_image.convert('RGB')
            mosaic_image.save(buffered, 'JPEG', quality=quality)
            mime_type = 'image/jpeg'
        else:
            mosaic_image.save(buffered, 'PNG')
            mime_type = 'image/png'
        
        mosaic_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'image_base64': f'data:{mime_type};base64,{mosaic_base64}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/simulate-restore', methods=['POST'])
def simulate_restore():
    try:
        data = request.json
        mosaic_id = data.get('mosaic_id')
        strength = int(data.get('strength', 3))
        
        if not mosaic_id:
            return jsonify({'error': 'No mosaic ID provided'}), 400
        
        filepath = os.path.join(TEMP_FOLDER, mosaic_id)
        if not os.path.exists(filepath):
            return jsonify({'error': 'Mosaic image not found or expired'}), 404
        
        mosaic_image = Image.open(filepath)
        restored_image = apply_simulation_restore(mosaic_image, strength)
        
        buffered = io.BytesIO()
        restored_image.save(buffered, 'PNG')
        restored_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'preview': f'data:image/png;base64,{restored_base64}',
            'note': '这是模拟的恢复效果，实际上马赛克是不可逆的'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch-process', methods=['POST'])
def batch_process():
    try:
        if 'zip' not in request.files:
            return jsonify({'error': 'No ZIP file'}), 400
        
        zip_file = request.files['zip']
        block_size = int(request.form.get('block_size', 10))
        shape = request.form.get('shape', 'square')
        brightness = int(request.form.get('brightness', 0))
        color_shift = [int(x) for x in request.form.get('color_shift', '0,0,0').split(',')]
        output_format = request.form.get('format', 'PNG')
        quality = int(request.form.get('quality', 95))
        
        input_zip = zipfile.ZipFile(zip_file.stream)
        output_buffer = io.BytesIO()
        
        with zipfile.ZipFile(output_buffer, 'w', zipfile.ZIP_DEFLATED) as output_zip:
            for filename in input_zip.namelist():
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
                    try:
                        with input_zip.open(filename) as img_file:
                            image = Image.open(img_file)
                            if image.mode != 'RGB' and image.mode != 'RGBA':
                                image = image.convert('RGB')
                            
                            mosaic_image = apply_mosaic(
                                image,
                                block_size=block_size,
                                shape=shape,
                                brightness=brightness,
                                color_shift=tuple(color_shift)
                            )
                            
                            img_buffer = io.BytesIO()
                            if output_format.upper() == 'JPEG':
                                if mosaic_image.mode == 'RGBA':
                                    mosaic_image = mosaic_image.convert('RGB')
                                mosaic_image.save(img_buffer, 'JPEG', quality=quality)
                                ext = '.jpg'
                            else:
                                mosaic_image.save(img_buffer, 'PNG')
                                ext = '.png'
                            
                            base_name = os.path.splitext(filename)[0]
                            output_zip.writestr(f"{base_name}_mosaic{ext}", img_buffer.getvalue())
                    except Exception as e:
                        print(f"Error processing {filename}: {e}")
                        continue
        
        output_buffer.seek(0)
        zip_filename = save_temp_image(Image.new('RGB', (1, 1)), 'batch', 'zip')
        zip_filepath = os.path.join(TEMP_FOLDER, zip_filename.replace('.zip', '') + '_images.zip')
        
        with open(zip_filepath, 'wb') as f:
            f.write(output_buffer.getvalue())
        
        temp_files[os.path.basename(zip_filepath)] = time.time() + 3600
        
        return jsonify({
            'success': True,
            'download_url': f'/temp/{os.path.basename(zip_filepath)}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/temp/<filename>')
def serve_temp(filename):
    return send_from_directory(TEMP_FOLDER, filename)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图片马赛克生成工具</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
        }
        .content {
            display: grid;
            grid-template-columns: 350px 1fr;
            gap: 20px;
            padding: 30px;
        }
        .control-panel {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
        }
        .control-group {
            margin-bottom: 20px;
        }
        .control-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }
        .control-group input[type="range"] {
            width: 100%;
            height: 8px;
            border-radius: 4px;
            -webkit-appearance: none;
            background: #ddd;
        }
        .control-group input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #667eea;
            cursor: pointer;
        }
        .control-group select, .control-group input[type="number"] {
            width: 100%;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
        }
        .btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 10px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }
        .btn-secondary {
            background: #e0e0e0;
            color: #333;
        }
        .btn-secondary:hover {
            background: #d0d0d0;
        }
        .file-upload {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 20px;
        }
        .file-upload:hover {
            background: #f0f4ff;
        }
        .file-upload.dragover {
            background: #e8edff;
            border-color: #764ba2;
        }
        .file-upload-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .preview-area {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 20px;
        }
        .image-container {
            position: relative;
            width: 100%;
            max-height: 500px;
            overflow: hidden;
            border-radius: 10px;
            background: #333;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .image-container img {
            max-width: 100%;
            max-height: 500px;
            object-fit: contain;
        }
        .selection-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            cursor: crosshair;
        }
        .selection-box {
            position: absolute;
            border: 2px dashed #fff;
            background: rgba(255,255,255,0.2);
            pointer-events: none;
        }
        .compare-slider {
            position: relative;
            overflow: hidden;
        }
        .compare-slider .mosaic-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            clip-path: inset(0 0 0 50%);
        }
        .slider-handle {
            position: absolute;
            top: 0;
            left: 50%;
            width: 4px;
            height: 100%;
            background: white;
            cursor: ew-resize;
            transform: translateX(-50%);
            z-index: 10;
        }
        .slider-handle::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .slider-handle::after {
            content: '⟺';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            color: #667eea;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .tab {
            padding: 10px 20px;
            background: #e0e0e0;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
        }
        .tab.active {
            background: #667eea;
            color: white;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .mode-switch {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .mode-btn {
            flex: 1;
            padding: 10px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
        }
        .mode-btn.active {
            border-color: #667eea;
            background: #667eea;
            color: white;
        }
        .color-inputs {
            display: flex;
            gap: 10px;
        }
        .color-inputs input {
            flex: 1;
        }
        .url-input {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .url-input input {
            flex: 1;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
        }
        .status {
            padding: 15px;
            border-radius: 10px;
            margin-top: 15px;
            display: none;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            display: block;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            display: block;
        }
        .value-display {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 2px 10px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
        }
        .restore-note {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 10px;
            margin-top: 15px;
            font-size: 14px;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖼️ 图片马赛克生成工具</h1>
            <p>支持多种马赛克效果、局部打码、批量处理、对比预览</p>
        </div>
        <div class="content">
            <div class="control-panel">
                <div class="tabs">
                    <button class="tab active" data-tab="single">单图处理</button>
                    <button class="tab" data-tab="batch">批量处理</button>
                    <button class="tab" data-tab="url">URL处理</button>
                </div>
                
                <div id="single-tab" class="tab-content active">
                    <div class="file-upload" id="fileUpload">
                        <div class="file-upload-icon">📁</div>
                        <div>点击或拖拽上传图片</div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">支持 JPG, PNG, GIF, BMP</div>
                        <input type="file" id="fileInput" accept="image/*" style="display: none;">
                    </div>
                    
                    <div class="mode-switch">
                        <button class="mode-btn active" data-mode="full">全图打码</button>
                        <button class="mode-btn" data-mode="region">局部打码</button>
                    </div>
                </div>
                
                <div id="batch-tab" class="tab-content">
                    <div class="file-upload" id="zipUpload">
                        <div class="file-upload-icon">📦</div>
                        <div>点击或拖拽上传ZIP压缩包</div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">ZIP内所有图片将被批量处理</div>
                        <input type="file" id="zipInput" accept=".zip" style="display: none;">
                    </div>
                </div>
                
                <div id="url-tab" class="tab-content">
                    <div class="url-input">
                        <input type="text" id="urlInput" placeholder="输入图片URL">
                    </div>
                    <button class="btn btn-primary" id="processUrlBtn">处理URL图片</button>
                </div>
                
                <div class="control-group">
                    <label>马赛克块大小 <span class="value-display" id="blockSizeValue">10px</span></label>
                    <input type="range" id="blockSize" min="2" max="50" value="10">
                </div>
                
                <div class="control-group">
                    <label>马赛克形状</label>
                    <select id="shape">
                        <option value="square">方形块</option>
                        <option value="circle">圆形块</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>亮度调整 <span class="value-display" id="brightnessValue">0</span></label>
                    <input type="range" id="brightness" min="-50" max="50" value="0">
                </div>
                
                <div class="control-group">
                    <label>色彩偏移 (R, G, B)</label>
                    <div class="color-inputs">
                        <input type="number" id="colorR" value="0" min="-100" max="100" placeholder="R">
                        <input type="number" id="colorG" value="0" min="-100" max="100" placeholder="G">
                        <input type="number" id="colorB" value="0" min="-100" max="100" placeholder="B">
                    </div>
                </div>
                
                <div class="control-group">
                    <label>输出格式</label>
                    <select id="format">
                        <option value="PNG">PNG (无损)</option>
                        <option value="JPEG">JPEG (压缩)</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>输出质量 <span class="value-display" id="qualityValue">95%</span></label>
                    <input type="range" id="quality" min="10" max="100" value="95">
                </div>
                
                <button class="btn btn-primary" id="processBtn">生成马赛克</button>
                <button class="btn btn-secondary" id="downloadBtn" style="display: none;">下载图片</button>
                <button class="btn btn-secondary" id="restoreBtn" style="display: none;">模拟恢复效果</button>
                
                <div class="status" id="status"></div>
            </div>
            
            <div class="preview-area">
                <div class="tabs">
                    <button class="tab active" data-preview="compare">对比预览</button>
                    <button class="tab" data-preview="original">原图</button>
                    <button class="tab" data-preview="mosaic">马赛克图</button>
                    <button class="tab" data-preview="restore" id="restoreTab" style="display: none;">模拟恢复</button>
                </div>
                
                <div id="compare-preview" class="tab-content active">
                    <div class="image-container compare-slider" id="compareContainer" style="display: none;">
                        <img id="originalPreview" alt="原图">
                        <img class="mosaic-image" id="mosaicPreview" alt="马赛克图">
                        <div class="slider-handle" id="sliderHandle"></div>
                    </div>
                    <div id="comparePlaceholder" style="text-align: center; padding: 100px 0; color: #999;">
                        <div style="font-size: 64px; margin-bottom: 20px;">👆</div>
                        <div>上传图片后在此对比效果</div>
                    </div>
                </div>
                
                <div id="original-preview" class="tab-content">
                    <div class="image-container" id="originalContainer">
                        <div id="originalPlaceholder" style="text-align: center; padding: 100px 0; color: #999;">
                            <div style="font-size: 64px; margin-bottom: 20px;">📷</div>
                            <div>上传图片后在此显示原图</div>
                        </div>
                    </div>
                </div>
                
                <div id="mosaic-preview" class="tab-content">
                    <div class="image-container" id="mosaicContainer">
                        <div id="mosaicPlaceholder" style="text-align: center; padding: 100px 0; color: #999;">
                            <div style="font-size: 64px; margin-bottom: 20px;">🎨</div>
                            <div>点击生成按钮后在此显示马赛克图</div>
                        </div>
                    </div>
                </div>
                
                <div id="restore-preview" class="tab-content">
                    <div class="image-container" id="restoreContainer">
                        <div id="restorePlaceholder" style="text-align: center; padding: 100px 0; color: #999;">
                            <div style="font-size: 64px; margin-bottom: 20px;">🔍</div>
                            <div>点击模拟恢复按钮后在此显示</div>
                        </div>
                    </div>
                    <div class="restore-note" id="restoreNote" style="display: none;">
                        ⚠️ <strong>注意：</strong>这只是模拟的恢复效果！真正的马赛克处理是不可逆的，无法恢复原始图像细节。此功能仅用于演示马赛克的"不可恢复性"。
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let originalId = null;
        let mosaicId = null;
        let selectionMode = false;
        let selectionStart = null;
        let selectionBox = null;
        let selection = null;
        
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                const previewName = tab.dataset.preview;
                
                if (tabName) {
                    document.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content[id$="-tab"]').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(tabName + '-tab').classList.add('active');
                }
                
                if (previewName) {
                    document.querySelectorAll('.tab[data-preview]').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content[id$="-preview"]').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(previewName + '-preview').classList.add('active');
                }
            });
        });
        
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectionMode = btn.dataset.mode === 'region';
                
                const overlay = document.querySelector('.selection-overlay');
                if (selectionMode && originalId) {
                    if (!overlay) {
                        const container = document.querySelector('#originalContainer .image-container') || document.querySelector('#originalContainer');
                        const newOverlay = document.createElement('div');
                        newOverlay.className = 'selection-overlay';
                        container.appendChild(newOverlay);
                        setupSelection(newOverlay);
                    }
                } else if (overlay) {
                    overlay.remove();
                    if (selectionBox) selectionBox.remove();
                    selection = null;
                }
            });
        });
        
        function setupSelection(overlay) {
            const container = overlay.parentElement;
            const img = container.querySelector('img') || document.querySelector('#originalPreview');
            
            overlay.addEventListener('mousedown', (e) => {
                if (!selectionMode) return;
                const rect = container.getBoundingClientRect();
                const imgRect = img.getBoundingClientRect();
                
                selectionStart = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                
                if (selectionBox) selectionBox.remove();
                selectionBox = document.createElement('div');
                selectionBox.className = 'selection-box';
                selectionBox.style.left = selectionStart.x + 'px';
                selectionBox.style.top = selectionStart.y + 'px';
                container.appendChild(selectionBox);
            });
            
            overlay.addEventListener('mousemove', (e) => {
                if (!selectionStart || !selectionBox) return;
                const rect = container.getBoundingClientRect();
                
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                
                const left = Math.min(selectionStart.x, currentX);
                const top = Math.min(selectionStart.y, currentY);
                const width = Math.abs(currentX - selectionStart.x);
                const height = Math.abs(currentY - selectionStart.y);
                
                selectionBox.style.left = left + 'px';
                selectionBox.style.top = top + 'px';
                selectionBox.style.width = width + 'px';
                selectionBox.style.height = height + 'px';
            });
            
            overlay.addEventListener('mouseup', (e) => {
                if (!selectionStart || !selectionBox) return;
                
                const rect = container.getBoundingClientRect();
                const imgRect = img.getBoundingClientRect();
                const img = document.querySelector('#originalPreview');
                
                const scaleX = img.naturalWidth / imgRect.width;
                const scaleY = img.naturalHeight / imgRect.height;
                
                const endX = e.clientX - rect.left;
                const endY = e.clientY - rect.top;
                
                const x1 = Math.round((Math.min(selectionStart.x, endX) - (imgRect.left - rect.left)) * scaleX);
                const y1 = Math.round((Math.min(selectionStart.y, endY) - (imgRect.top - rect.top)) * scaleY);
                const x2 = Math.round((Math.max(selectionStart.x, endX) - (imgRect.left - rect.left)) * scaleX);
                const y2 = Math.round((Math.max(selectionStart.y, endY) - (imgRect.top - rect.top)) * scaleY);
                
                selection = [
                    Math.max(0, x1),
                    Math.max(0, y1),
                    Math.min(img.naturalWidth, x2),
                    Math.min(img.naturalHeight, y2)
                ];
                
                selectionStart = null;
                showStatus('已选择区域: ' + selection.join(', '), 'success');
            });
        }
        
        const fileUpload = document.getElementById('fileUpload');
        const fileInput = document.getElementById('fileInput');
        
        fileUpload.addEventListener('click', () => fileInput.click());
        
        fileUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUpload.classList.add('dragover');
        });
        
        fileUpload.addEventListener('dragleave', () => {
            fileUpload.classList.remove('dragover');
        });
        
        fileUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUpload.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFile(e.target.files[0]);
            }
        });
        
        async function handleFile(file) {
            const formData = new FormData();
            formData.append('image', file);
            
            showStatus('上传中...', 'success');
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    originalId = data.original_id;
                    
                    document.querySelector('#originalPlaceholder').style.display = 'none';
                    document.querySelector('#originalContainer').innerHTML = '<img id="originalPreview" src="' + data.preview + '" alt="原图">';
                    
                    document.querySelector('#comparePlaceholder').style.display = 'none';
                    document.querySelector('#compareContainer').style.display = 'flex';
                    document.querySelector('#originalPreview').src = data.preview;
                    
                    if (selectionMode) {
                        const container = document.querySelector('#originalContainer');
                        const overlay = document.createElement('div');
                        overlay.className = 'selection-overlay';
                        container.appendChild(overlay);
                        setupSelection(overlay);
                    }
                    
                    showStatus('图片上传成功', 'success');
                } else {
                    showStatus('上传失败: ' + data.error, 'error');
                }
            } catch (e) {
                showStatus('上传失败: ' + e.message, 'error');
            }
        }
        
        const zipUpload = document.getElementById('zipUpload');
        const zipInput = document.getElementById('zipInput');
        
        zipUpload.addEventListener('click', () => zipInput.click());
        
        zipUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            zipUpload.classList.add('dragover');
        });
        
        zipUpload.addEventListener('dragleave', () => {
            zipUpload.classList.remove('dragover');
        });
        
        zipUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            zipUpload.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handleZip(e.dataTransfer.files[0]);
            }
        });
        
        zipInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleZip(e.target.files[0]);
            }
        });
        
        async function handleZip(file) {
            const formData = new FormData();
            formData.append('zip', file);
            formData.append('block_size', document.getElementById('blockSize').value);
            formData.append('shape', document.getElementById('shape').value);
            formData.append('brightness', document.getElementById('brightness').value);
            formData.append('color_shift', [
                document.getElementById('colorR').value,
                document.getElementById('colorG').value,
                document.getElementById('colorB').value
            ].join(','));
            formData.append('format', document.getElementById('format').value);
            formData.append('quality', document.getElementById('quality').value);
            
            showStatus('处理中...', 'success');
            
            try {
                const response = await fetch('/api/batch-process', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus('批量处理完成！', 'success');
                    window.location.href = data.download_url;
                } else {
                    showStatus('处理失败: ' + data.error, 'error');
                }
            } catch (e) {
                showStatus('处理失败: ' + e.message, 'error');
            }
        }
        
        document.getElementById('processUrlBtn').addEventListener('click', async () => {
            const url = document.getElementById('urlInput').value;
            if (!url) {
                showStatus('请输入图片URL', 'error');
                return;
            }
            
            showStatus('处理中...', 'success');
            
            try {
                const response = await fetch('/api/process-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: url,
                        block_size: parseInt(document.getElementById('blockSize').value),
                        shape: document.getElementById('shape').value,
                        brightness: parseInt(document.getElementById('brightness').value),
                        color_shift: [
                            parseInt(document.getElementById('colorR').value),
                            parseInt(document.getElementById('colorG').value),
                            parseInt(document.getElementById('colorB').value)
                        ],
                        format: document.getElementById('format').value,
                        quality: parseInt(document.getElementById('quality').value)
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    document.querySelector('#mosaicPlaceholder').style.display = 'none';
                    document.querySelector('#mosaicContainer').innerHTML = '<img src="' + data.image_base64 + '" alt="马赛克图">';
                    
                    document.querySelectorAll('.tab[data-preview="mosaic"]').forEach(t => t.click());
                    showStatus('处理完成！', 'success');
                } else {
                    showStatus('处理失败: ' + data.error, 'error');
                }
            } catch (e) {
                showStatus('处理失败: ' + e.message, 'error');
            }
        });
        
        document.getElementById('processBtn').addEventListener('click', async () => {
            if (!originalId) {
                showStatus('请先上传图片', 'error');
                return;
            }
            
            showStatus('生成中...', 'success');
            
            try {
                const response = await fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        original_id: originalId,
                        block_size: parseInt(document.getElementById('blockSize').value),
                        shape: document.getElementById('shape').value,
                        region: selectionMode ? selection : null,
                        brightness: parseInt(document.getElementById('brightness').value),
                        color_shift: [
                            parseInt(document.getElementById('colorR').value),
                            parseInt(document.getElementById('colorG').value),
                            parseInt(document.getElementById('colorB').value)
                        ],
                        format: document.getElementById('format').value,
                        quality: parseInt(document.getElementById('quality').value)
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    mosaicId = data.mosaic_id;
                    
                    document.querySelector('#mosaicPlaceholder').style.display = 'none';
                    document.querySelector('#mosaicContainer').innerHTML = '<img src="' + data.preview + '" alt="马赛克图">';
                    
                    document.querySelector('#mosaicPreview').src = data.preview;
                    
                    document.getElementById('downloadBtn').style.display = 'block';
                    document.getElementById('downloadBtn').onclick = () => window.location.href = data.download_url;
                    
                    document.getElementById('restoreBtn').style.display = 'block';
                    document.getElementById('restoreTab').style.display = 'block';
                    
                    showStatus('马赛克生成成功！', 'success');
                } else {
                    showStatus('生成失败: ' + data.error, 'error');
                }
            } catch (e) {
                showStatus('生成失败: ' + e.message, 'error');
            }
        });
        
        document.getElementById('restoreBtn').addEventListener('click', async () => {
            if (!mosaicId) {
                showStatus('请先生成马赛克图片', 'error');
                return;
            }
            
            showStatus('模拟恢复中...', 'success');
            
            try {
                const response = await fetch('/api/simulate-restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mosaic_id: mosaicId,
                        strength: 5
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    document.querySelector('#restorePlaceholder').style.display = 'none';
                    document.querySelector('#restoreContainer').innerHTML = '<img src="' + data.preview + '" alt="模拟恢复">';
                    document.getElementById('restoreNote').style.display = 'block';
                    
                    document.querySelectorAll('.tab[data-preview="restore"]').forEach(t => t.click());
                    showStatus(data.note, 'success');
                } else {
                    showStatus('失败: ' + data.error, 'error');
                }
            } catch (e) {
                showStatus('失败: ' + e.message, 'error');
            }
        });
        
        const sliderHandle = document.getElementById('sliderHandle');
        const mosaicImage = document.getElementById('mosaicPreview');
        let isDragging = false;
        
        sliderHandle.addEventListener('mousedown', () => isDragging = true);
        document.addEventListener('mouseup', () => isDragging = false);
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const container = document.getElementById('compareContainer');
            const rect = container.getBoundingClientRect();
            let percent = ((e.clientX - rect.left) / rect.width) * 100;
            percent = Math.max(0, Math.min(100, percent));
            
            sliderHandle.style.left = percent + '%';
            mosaicImage.style.clipPath = `inset(0 0 0 ${percent}%)`;
        });
        
        document.getElementById('blockSize').addEventListener('input', (e) => {
            document.getElementById('blockSizeValue').textContent = e.target.value + 'px';
        });
        
        document.getElementById('brightness').addEventListener('input', (e) => {
            document.getElementById('brightnessValue').textContent = e.target.value;
        });
        
        document.getElementById('quality').addEventListener('input', (e) => {
            document.getElementById('qualityValue').textContent = e.target.value + '%';
        });
        
        function showStatus(message, type) {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = 'status ' + type;
            
            setTimeout(() => {
                status.className = 'status';
            }, 5000);
        }
    </script>
</body>
</html>
"""

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
