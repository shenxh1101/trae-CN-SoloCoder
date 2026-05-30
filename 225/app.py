from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
import base64
import io
import time
import zipfile
import os
import json
import random

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
TRAINING_FOLDER = 'training_data'

for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER, TRAINING_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

user_styles = {}
style_version = {}


def decode_image(image_data):
    if ',' in image_data:
        image_data = image_data.split(',')[1]
    image_bytes = base64.b64decode(image_data)
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("无法解码图片数据")
    return image


def detect_edges(image, smoothness=5, detail_level=3):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_kernel = max(1, int(smoothness)) * 2 + 1
    blurred = cv2.GaussianBlur(gray, (blur_kernel, blur_kernel), 0)

    t1_base = 30 + (10 - detail_level) * 8
    t2_base = 80 + (10 - detail_level) * 12
    threshold1 = max(10, t1_base)
    threshold2 = max(30, t2_base)

    edges = cv2.Canny(blurred, threshold1, threshold2)

    kernel_close = np.ones((2, 2), np.uint8)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel_close)

    return edges


def sketch_style(image, smoothness=5, detail_level=3):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    blur_k = max(1, int(smoothness)) * 2 + 1
    gray_smooth = cv2.GaussianBlur(gray, (blur_k, blur_k), 0)

    inv = 255 - gray_smooth

    detail_k = max(1, 21 - detail_level * 2)
    if detail_k % 2 == 0:
        detail_k += 1
    pencil = cv2.divide(gray_smooth, inv, scale=256)

    edges = detect_edges(image, smoothness, detail_level)
    edges_blended = cv2.GaussianBlur(edges, (3, 3), 0)

    sketch = cv2.addWeighted(pencil, 0.7, 255 - edges_blended, 0.3, 0)

    alpha = 0.3 + smoothness * 0.05
    sketch = cv2.convertScaleAbs(sketch, alpha=alpha, beta=10)

    kernel_sharpen = np.array([[-1, -1, -1],
                                [-1,  9, -1],
                                [-1, -1, -1]])
    sketch = cv2.filter2D(sketch, -1, kernel_sharpen * 0.3 + np.eye(3) * 0.7)

    return cv2.cvtColor(sketch, cv2.COLOR_GRAY2BGR)


def ink_style(image, smoothness=5, detail_level=3):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    blur_k = max(1, int(smoothness)) * 2 + 1
    gray_smooth = cv2.GaussianBlur(gray, (blur_k, blur_k), 0)

    edges = detect_edges(image, smoothness, detail_level)

    ink_thickness = max(1, int(3 - smoothness * 0.2))
    kernel_dilate = np.ones((ink_thickness + 2, ink_thickness + 2), np.uint8)
    thick_edges = cv2.dilate(edges, kernel_dilate, iterations=1)

    kernel_close = np.ones((5, 5), np.uint8)
    thick_edges = cv2.morphologyEx(thick_edges, cv2.MORPH_CLOSE, kernel_close)
    thick_edges = cv2.dilate(thick_edges, np.ones((2, 2), np.uint8), iterations=1)

    _, binary = cv2.threshold(gray_smooth, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    result = np.full_like(image, 245)

    ink_color = np.array([25, 25, 30], dtype=np.uint8)
    result[thick_edges > 0] = ink_color

    shadow = cv2.GaussianBlur(thick_edges, (5, 5), 0)
    shadow_mask = (shadow > 30) & (shadow <= 127)
    shadow_color = np.array([180, 175, 170], dtype=np.uint8)
    result[shadow_mask] = shadow_color

    result = cv2.GaussianBlur(result, (3, 3), 0)

    return result


def tech_style(image, smoothness=5, detail_level=3):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    blur_k = max(1, int(smoothness * 0.5)) * 2 + 1
    gray_smooth = cv2.GaussianBlur(gray, (blur_k, blur_k), 0)

    edges = detect_edges(image, smoothness, detail_level)

    h, w = image.shape[:2]
    result = np.zeros_like(image)
    result[:] = [10, 10, 20]

    glow_color = np.array([0, 180, 255], dtype=np.uint8)
    line_color = np.array([0, 220, 255], dtype=np.uint8)

    glow_layer = np.zeros_like(image)
    glow_layer[edges > 0] = glow_color

    for sigma_val in [5, 3, 1]:
        glow_blurred = cv2.GaussianBlur(glow_layer, (sigma_val * 2 + 1, sigma_val * 2 + 1), 0)
        result = cv2.addWeighted(result, 1.0, glow_blurred, 0.3, 0)

    result[edges > 0] = line_color

    lines = cv2.HoughLinesP(edges, 1, np.pi / 180,
                            threshold=40, minLineLength=20, maxLineGap=8)
    if lines is not None:
        for line_info in lines:
            x1, y1, x2, y2 = line_info[0]
            cv2.line(result, (x1, y1), (x2, y2), (0, 255, 255), 1)

    corners = cv2.goodFeaturesToTrack(gray_smooth,
                                       maxCorners=100,
                                       qualityLevel=0.01,
                                       minDistance=10)
    if corners is not None:
        for corner in corners:
            cx, cy = corner.ravel()
            cx, cy = int(cx), int(cy)
            cv2.circle(result, (cx, cy), 3, (0, 255, 200), -1)
            cv2.circle(result, (cx, cy), 6, (0, 150, 200), 1)

    scan_y = int(h * 0.3)
    cv2.line(result, (0, scan_y), (w, scan_y), (0, 100, 180), 1)
    scan_y2 = int(h * 0.7)
    cv2.line(result, (0, scan_y2), (w, scan_y2), (0, 100, 180), 1)

    return result


def apply_user_style(image, style_name, smoothness=5, detail_level=3):
    style_params = user_styles.get(style_name, {})
    if not style_params:
        return sketch_style(image, smoothness, detail_level)

    edge_detect = style_params.get('edge_detect', 1.0)
    line_thickness = style_params.get('line_thickness', 1.0)
    contrast_val = style_params.get('contrast', 1.0)
    smooth_val = style_params.get('smoothness_factor', 1.0)
    ink_weight = style_params.get('ink_weight', 0.0)
    sketch_weight = style_params.get('sketch_weight', 1.0)

    adjusted_smoothness = max(1, min(10, int(smoothness * smooth_val)))
    adjusted_detail = max(1, min(10, int(detail_level * edge_detect)))

    edges = detect_edges(image, adjusted_smoothness, adjusted_detail)

    if edge_detect > 1.2:
        kernel = np.ones((2, 2), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)
    elif edge_detect < 0.8:
        kernel = np.ones((2, 2), np.uint8)
        edges = cv2.erode(edges, kernel, iterations=1)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    inv = 255 - gray
    detail_k = max(1, 21 - adjusted_detail * 2)
    if detail_k % 2 == 0:
        detail_k += 1
    pencil = cv2.divide(gray, inv, scale=256)

    sketch_result = cv2.addWeighted(pencil, 0.6, 255 - edges, 0.4, 0)

    ink_thickness_val = max(1, int(line_thickness * 3))
    kernel_dilate = np.ones((ink_thickness_val, ink_thickness_val), np.uint8)
    thick_edges = cv2.dilate(edges, kernel_dilate, iterations=1)

    ink_result = np.full_like(image, 245)
    ink_result[thick_edges > 0] = [int(50 * contrast_val), int(50 * contrast_val), int(55 * contrast_val)]

    if sketch_weight + ink_weight > 0:
        total_w = sketch_weight + ink_weight
        s_w = sketch_weight / total_w
        i_w = ink_weight / total_w
    else:
        s_w = 1.0
        i_w = 0.0

    sketch_bgr = cv2.cvtColor(sketch_result, cv2.COLOR_GRAY2BGR)
    blended = cv2.addWeighted(sketch_bgr, s_w, ink_result, i_w, 0)

    alpha = 0.5 + contrast_val * 0.3
    blended = cv2.convertScaleAbs(blended, alpha=alpha, beta=0)

    return blended


def image_to_svg(image, output_path):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    height, width = image.shape[:2]
    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        f'<rect width="{width}" height="{height}" fill="white"/>'
    ]

    for contour in contours:
        if len(contour) > 2:
            epsilon = 0.5
            approx = cv2.approxPolyDP(contour, epsilon, True)
            points = []
            for point in approx:
                x, y = point[0]
                points.append(f'{x},{y}')
            if len(points) >= 3:
                path_data = f'M {points[0]} ' + ' '.join(f'L {p}' for p in points[1:]) + ' Z'
                svg_parts.append(f'<path d="{path_data}" fill="none" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>')

    svg_parts.append('</svg>')

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(svg_parts))


@app.route('/api/generate', methods=['POST'])
def generate_contour():
    start_time = time.time()

    try:
        data = request.json
        image_data = data.get('image', '')
        style = data.get('style', 'sketch')
        smoothness = int(data.get('smoothness', 5))
        detail_level = int(data.get('detail_level', 3))

        image = decode_image(image_data)

        if style == 'sketch':
            result = sketch_style(image, smoothness, detail_level)
        elif style == 'ink':
            result = ink_style(image, smoothness, detail_level)
        elif style == 'tech':
            result = tech_style(image, smoothness, detail_level)
        elif style in user_styles:
            result = apply_user_style(image, style, smoothness, detail_level)
        else:
            result = sketch_style(image, smoothness, detail_level)

        _, buffer = cv2.imencode('.png', result)
        result_base64 = base64.b64encode(buffer).decode('utf-8')

        processing_time = time.time() - start_time

        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{result_base64}',
            'processing_time': round(processing_time * 1000, 2)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/batch', methods=['POST'])
def batch_generate():
    start_time = time.time()

    try:
        files = request.files.getlist('images')
        style = request.form.get('style', 'sketch')
        smoothness = int(request.form.get('smoothness', 5))
        detail_level = int(request.form.get('detail_level', 3))

        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for idx, file in enumerate(files):
                file_bytes = file.read()
                image_array = np.frombuffer(file_bytes, dtype=np.uint8)
                image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

                if image is None:
                    continue

                if style == 'sketch':
                    result = sketch_style(image, smoothness, detail_level)
                elif style == 'ink':
                    result = ink_style(image, smoothness, detail_level)
                elif style == 'tech':
                    result = tech_style(image, smoothness, detail_level)
                elif style in user_styles:
                    result = apply_user_style(image, style, smoothness, detail_level)
                else:
                    result = sketch_style(image, smoothness, detail_level)

                _, buffer = cv2.imencode('.png', result)
                original_name = os.path.splitext(file.filename)[0]
                zip_file.writestr(f'{original_name}_contour.png', buffer.tobytes())

        zip_buffer.seek(0)

        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'contours_{int(time.time())}.zip'
        )

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/export-svg', methods=['POST'])
def export_svg():
    try:
        data = request.json
        image_data = data.get('image', '')

        image = decode_image(image_data)

        svg_path = os.path.join(OUTPUT_FOLDER, f'contour_{int(time.time())}.svg')
        image_to_svg(image, svg_path)

        return send_file(svg_path, mimetype='image/svg+xml', as_attachment=True)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def simulate_training(edge_scores, line_scores, contrast_scores, num_pairs):
    params = {
        'edge_detect': float(np.mean(edge_scores)),
        'line_thickness': float(np.mean(line_scores)),
        'contrast': float(np.mean(contrast_scores)),
        'trained_on': num_pairs,
        'smoothness_factor': 1.0,
        'ink_weight': 0.0,
        'sketch_weight': 1.0,
        'version': 1
    }

    avg_edge = params['edge_detect']
    if avg_edge > 1.3:
        params['sketch_weight'] = 0.4
        params['ink_weight'] = 0.6
        params['line_thickness'] = min(2.0, params['line_thickness'] * 1.3)
        params['smoothness_factor'] = 0.8
    elif avg_edge > 1.0:
        params['sketch_weight'] = 0.7
        params['ink_weight'] = 0.3
        params['smoothness_factor'] = 1.0
    else:
        params['sketch_weight'] = 0.9
        params['ink_weight'] = 0.1
        params['smoothness_factor'] = 1.2

    avg_contrast = params['contrast']
    if avg_contrast > 1.5:
        params['contrast'] = min(2.0, avg_contrast * 1.1)
        params['edge_detect'] = min(1.8, avg_edge * 1.05)
    elif avg_contrast < 0.7:
        params['contrast'] = max(0.5, avg_contrast * 0.9)
        params['edge_detect'] = max(0.5, avg_edge * 0.95)

    num_pairs_bonus = min(num_pairs / 5.0, 1.0)
    noise_scale = 0.05 * (1.0 - num_pairs_bonus)
    params['edge_detect'] += random.uniform(-noise_scale, noise_scale)
    params['line_thickness'] += random.uniform(-noise_scale, noise_scale)
    params['contrast'] += random.uniform(-noise_scale, noise_scale)
    params['smoothness_factor'] += random.uniform(-noise_scale * 0.5, noise_scale * 0.5)

    params['edge_detect'] = round(max(0.3, min(2.5, params['edge_detect'])), 4)
    params['line_thickness'] = round(max(0.3, min(3.0, params['line_thickness'])), 4)
    params['contrast'] = round(max(0.3, min(2.5, params['contrast'])), 4)
    params['smoothness_factor'] = round(max(0.5, min(2.0, params['smoothness_factor'])), 4)
    params['ink_weight'] = round(max(0.0, min(1.0, params['ink_weight'])), 4)
    params['sketch_weight'] = round(max(0.0, min(1.0, params['sketch_weight'])), 4)

    style_name_key = None
    for key in user_styles:
        if key:
            style_name_key = key
            break
    if style_name_key and style_name_key in style_version:
        style_version[style_name_key] = style_version.get(style_name_key, 0) + 1
        params['version'] = style_version[style_name_key]

    return params


@app.route('/api/train-style', methods=['POST'])
def train_style():
    start_time = time.time()

    try:
        data = request.json
        style_name = data.get('style_name', 'custom_style')
        pairs = data.get('pairs', [])

        if len(pairs) == 0:
            return jsonify({'success': False, 'error': 'No training pairs provided'}), 400

        if len(pairs) > 5:
            return jsonify({'success': False, 'error': 'Maximum 5 training pairs allowed'}), 400

        edge_scores = []
        line_scores = []
        contrast_scores = []

        for pair in pairs:
            sketch_data = pair.get('sketch', '')
            target_data = pair.get('target', '')

            if not sketch_data or not target_data:
                continue

            try:
                sketch_img = decode_image(sketch_data)
                target_img = decode_image(target_data)

                sketch_gray = cv2.cvtColor(sketch_img, cv2.COLOR_BGR2GRAY)
                target_gray = cv2.cvtColor(target_img, cv2.COLOR_BGR2GRAY)

                sketch_edges = cv2.Canny(sketch_gray, 50, 150)
                target_edges = cv2.Canny(target_gray, 50, 150)

                s_area = max(sketch_edges.shape[0] * sketch_edges.shape[1], 1)
                t_area = max(target_edges.shape[0] * target_edges.shape[1], 1)

                sketch_edge_density = np.sum(sketch_edges > 0) / s_area
                target_edge_density = np.sum(target_edges > 0) / t_area

                density_ratio = target_edge_density / max(sketch_edge_density, 0.001)
                edge_scores.append(min(density_ratio, 5.0))

                if target_edge_density > sketch_edge_density * 1.5:
                    line_scores.append(1.8)
                elif target_edge_density > sketch_edge_density:
                    line_scores.append(1.2)
                else:
                    line_scores.append(0.7)

                sketch_std = max(np.std(sketch_gray), 1.0)
                target_std = max(np.std(target_gray), 1.0)
                contrast_scores.append(min(target_std / sketch_std, 3.0))

            except Exception:
                continue

        if not edge_scores:
            return jsonify({'success': False, 'error': 'Failed to process training images'}), 400

        params = simulate_training(edge_scores, line_scores, contrast_scores, len(pairs))
        user_styles[style_name] = params
        style_version[style_name] = params.get('version', 1)

        processing_time = time.time() - start_time

        return jsonify({
            'success': True,
            'style_name': style_name,
            'params': params,
            'processing_time': round(processing_time * 1000, 2)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/styles', methods=['GET'])
def get_styles():
    styles_info = {}
    for name, params in user_styles.items():
        styles_info[name] = {
            'edge_detect': params.get('edge_detect', 1.0),
            'line_thickness': params.get('line_thickness', 1.0),
            'contrast': params.get('contrast', 1.0),
            'trained_on': params.get('trained_on', 0),
            'version': params.get('version', 1)
        }

    return jsonify({
        'default': ['sketch', 'ink', 'tech'],
        'custom': list(user_styles.keys()),
        'custom_details': styles_info
    })


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'message': 'AI Contour Generator API is running',
        'custom_styles': len(user_styles)
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001)
