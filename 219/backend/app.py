import os
import io
import time
import uuid
import zipfile
import threading
from queue import Queue

import cv2
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

from colorization import ColorizationModel

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

model = ColorizationModel()

task_queue = Queue()
queue_lock = threading.Lock()
current_queue_length = 0


def process_queue():
    global current_queue_length
    while True:
        task = task_queue.get()
        if task is None:
            break
        with queue_lock:
            current_queue_length = task_queue.qsize()
        func, args, kwargs, result_container = task
        try:
            result_container['result'] = func(*args, **kwargs)
            result_container['status'] = 'done'
        except Exception as e:
            result_container['error'] = str(e)
            result_container['status'] = 'error'
        with queue_lock:
            current_queue_length = task_queue.qsize()


queue_thread = threading.Thread(target=process_queue, daemon=True)
queue_thread.start()


def submit_task(func, *args, **kwargs):
    result_container = {'status': 'pending', 'result': None, 'error': None}
    task_queue.put((func, args, kwargs, result_container))
    return result_container


def wait_for_task(result_container, timeout=120):
    start = time.time()
    while result_container['status'] == 'pending':
        if time.time() - start > timeout:
            return None, 'Task timed out'
        time.sleep(0.05)
    if result_container['status'] == 'error':
        return None, result_container['error']
    return result_container['result'], None


def colorize_image(img_array, warmth=0.0, saturation=1.0):
    start_time = time.time()
    result = model.predict(img_array, warmth=warmth, saturation=saturation)
    inference_time = time.time() - start_time
    return result, inference_time


def colorize_region(img_array, mask_array, warmth=0.0, saturation=1.0):
    start_time = time.time()
    result = model.predict_region(img_array, mask_array, warmth=warmth, saturation=saturation)
    inference_time = time.time() - start_time
    return result, inference_time


def read_image_from_bytes(file_bytes):
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        gray = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        if gray is None:
            return None
        return gray
    return img


def encode_image(img_array, fmt='png', quality=95):
    _, buf = cv2.imencode(f'.{fmt}', img_array, [cv2.IMWRITE_PNG_COMPRESSION, 6] if fmt == 'png' else [cv2.IMWRITE_JPEG_QUALITY, quality])
    return buf.tobytes()


@app.route('/')
def index():
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'frontend'), 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'frontend'), path)


@app.route('/api/colorize', methods=['POST'])
def api_colorize():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    warmth = float(request.form.get('warmth', 0.0))
    saturation = float(request.form.get('saturation', 1.0))

    img = read_image_from_bytes(file.read())
    if img is None:
        return jsonify({'error': 'Invalid image'}), 400

    result_container = submit_task(colorize_image, img, warmth, saturation)
    result, err = wait_for_task(result_container)

    if err:
        return jsonify({'error': err}), 500

    colored_img, inference_time = result

    task_id = str(uuid.uuid4())
    output_path = os.path.join(UPLOAD_FOLDER, f'{task_id}.png')
    cv2.imwrite(output_path, colored_img)

    with queue_lock:
        ql = current_queue_length

    return jsonify({
        'task_id': task_id,
        'inference_time': round(inference_time, 3),
        'queue_length': ql,
        'output_url': f'/api/result/{task_id}'
    })


@app.route('/api/colorize_region', methods=['POST'])
def api_colorize_region():
    if 'image' not in request.files or 'mask' not in request.files:
        return jsonify({'error': 'Image and mask required'}), 400

    img_file = request.files['image']
    mask_file = request.files['mask']
    warmth = float(request.form.get('warmth', 0.0))
    saturation = float(request.form.get('saturation', 1.0))

    img = read_image_from_bytes(img_file.read())
    mask = read_image_from_bytes(mask_file.read())

    if img is None or mask is None:
        return jsonify({'error': 'Invalid image or mask'}), 400

    result_container = submit_task(colorize_region, img, mask, warmth, saturation)
    result, err = wait_for_task(result_container)

    if err:
        return jsonify({'error': err}), 500

    colored_img, inference_time = result

    task_id = str(uuid.uuid4())
    output_path = os.path.join(UPLOAD_FOLDER, f'{task_id}.png')
    cv2.imwrite(output_path, colored_img)

    with queue_lock:
        ql = current_queue_length

    return jsonify({
        'task_id': task_id,
        'inference_time': round(inference_time, 3),
        'queue_length': ql,
        'output_url': f'/api/result/{task_id}'
    })


@app.route('/api/batch_colorize', methods=['POST'])
def api_batch_colorize():
    if 'archive' not in request.files:
        return jsonify({'error': 'No ZIP archive provided'}), 400

    file = request.files['archive']
    warmth = float(request.form.get('warmth', 0.0))
    saturation = float(request.form.get('saturation', 1.0))

    try:
        zip_bytes = file.read()
        zip_stream = io.BytesIO(zip_bytes)
    except Exception:
        return jsonify({'error': 'Invalid ZIP file'}), 400

    total_inference_time = 0
    image_count = 0

    output_zip = io.BytesIO()
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf_out:
        with zipfile.ZipFile(zip_stream, 'r') as zf_in:
            for name in zf_in.namelist():
                if name.startswith('__MACOSX') or name.endswith('/'):
                    continue
                lower_name = name.lower()
                if not (lower_name.endswith('.png') or lower_name.endswith('.jpg') or
                        lower_name.endswith('.jpeg') or lower_name.endswith('.bmp') or
                        lower_name.endswith('.webp')):
                    continue

                data = zf_in.read(name)
                img = read_image_from_bytes(data)
                if img is None:
                    continue

                colored, inf_time = colorize_image(img, warmth, saturation)
                total_inference_time += inf_time
                image_count += 1

                result_bytes = encode_image(colored, 'png')
                basename = os.path.splitext(name)[0]
                zf_out.writestr(f'{basename}_colorized.png', result_bytes)

    output_zip.seek(0)
    batch_id = str(uuid.uuid4())
    batch_path = os.path.join(UPLOAD_FOLDER, f'{batch_id}.zip')
    with open(batch_path, 'wb') as f:
        f.write(output_zip.getvalue())

    with queue_lock:
        ql = current_queue_length

    return jsonify({
        'batch_id': batch_id,
        'image_count': image_count,
        'total_inference_time': round(total_inference_time, 3),
        'queue_length': ql,
        'output_url': f'/api/batch_result/{batch_id}'
    })


@app.route('/api/adjust', methods=['POST'])
def api_adjust():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    warmth = float(request.form.get('warmth', 0.0))
    saturation = float(request.form.get('saturation', 1.0))

    img = read_image_from_bytes(file.read())
    if img is None:
        return jsonify({'error': 'Invalid image'}), 400

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float64)
    a = lab[:, :, 1]
    b = lab[:, :, 2]

    a = 128.0 + (a - 128.0) * saturation + warmth * 20
    b = 128.0 + (b - 128.0) * saturation + warmth * 15

    lab[:, :, 1] = np.clip(a, 0, 255)
    lab[:, :, 2] = np.clip(b, 0, 255)

    result = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)

    task_id = str(uuid.uuid4())
    output_path = os.path.join(UPLOAD_FOLDER, f'{task_id}.png')
    cv2.imwrite(output_path, result)

    return jsonify({
        'task_id': task_id,
        'output_url': f'/api/result/{task_id}'
    })


@app.route('/api/result/<task_id>')
def api_result(task_id):
    safe_id = os.path.basename(task_id)
    path = os.path.join(UPLOAD_FOLDER, f'{safe_id}.png')
    if not os.path.exists(path):
        return jsonify({'error': 'Result not found'}), 404
    resp = send_file(path, mimetype='image/png')
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/api/batch_result/<batch_id>')
def api_batch_result(batch_id):
    safe_id = os.path.basename(batch_id)
    path = os.path.join(UPLOAD_FOLDER, f'{safe_id}.zip')
    if not os.path.exists(path):
        return jsonify({'error': 'Result not found'}), 404
    return send_file(path, mimetype='application/zip',
                     as_attachment=True, download_name='colorized_results.zip')


@app.route('/api/queue_status')
def api_queue_status():
    with queue_lock:
        ql = current_queue_length
    return jsonify({'queue_length': ql})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5555, debug=True)
