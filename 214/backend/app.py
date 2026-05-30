import os
import json
import uuid
import base64
import io
import csv
from datetime import datetime
from collections import defaultdict

import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import pandas as pd
from sklearn.metrics import confusion_matrix
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

import config
import model as model_module
import image_utils

app = Flask(__name__)
CORS(app)

model = None
confusion_matrix_data = defaultdict(lambda: defaultdict(int))
error_statistics = defaultdict(int)


def get_model():
    global model
    if model is None:
        model = model_module.load_model()
    return model


def save_history_record(data):
    history_file = os.path.join(config.HISTORY_DIR, 'history.json')
    history = []
    
    if os.path.exists(history_file):
        with open(history_file, 'r', encoding='utf-8') as f:
            history = json.load(f)
    
    history.insert(0, data)
    
    if len(history) > 500:
        history = history[:500]
    
    with open(history_file, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def update_confusion_matrix(predicted, actual):
    confusion_matrix_data[actual][predicted] += 1
    if predicted != actual:
        error_statistics[f"{actual}->{predicted}"] += 1
    
    matrix_file = os.path.join(config.DATA_DIR, 'confusion_matrix.json')
    stats_file = os.path.join(config.DATA_DIR, 'error_statistics.json')
    
    with open(matrix_file, 'w', encoding='utf-8') as f:
        json.dump(dict(confusion_matrix_data), f, ensure_ascii=False, indent=2)
    
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(dict(error_statistics), f, ensure_ascii=False, indent=2)


def load_data_files():
    global confusion_matrix_data, error_statistics
    
    matrix_file = os.path.join(config.DATA_DIR, 'confusion_matrix.json')
    stats_file = os.path.join(config.DATA_DIR, 'error_statistics.json')
    
    if os.path.exists(matrix_file):
        with open(matrix_file, 'r', encoding='utf-8') as f:
            confusion_matrix_data = defaultdict(lambda: defaultdict(int), json.load(f))
    
    if os.path.exists(stats_file):
        with open(stats_file, 'r', encoding='utf-8') as f:
            error_statistics = defaultdict(int, json.load(f))


load_data_files()


@app.route('/api/recognize', methods=['POST'])
def recognize():
    try:
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
        
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        processed_image = model_module.preprocess_image_from_pil(image)
        
        model_instance = get_model()
        predictions = model_module.predict_character(model_instance, processed_image, top_k=3)
        
        record_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        history_record = {
            'id': record_id,
            'timestamp': timestamp,
            'type': 'single',
            'predictions': predictions,
            'corrected': None
        }
        save_history_record(history_record)
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'record_id': record_id,
            'timestamp': timestamp
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/correct', methods=['POST'])
def correct():
    try:
        data = request.get_json()
        record_id = data.get('record_id')
        correct_char = data.get('correct_char')
        image_data = data.get('image')
        
        if not all([record_id, correct_char, image_data]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{correct_char}_{timestamp}_{uuid.uuid4().hex[:8]}.png"
        save_path = os.path.join(config.SAMPLES_DIR, filename)
        image.save(save_path)
        
        history_file = os.path.join(config.HISTORY_DIR, 'history.json')
        if os.path.exists(history_file):
            with open(history_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
            
            for record in history:
                if record['id'] == record_id:
                    record['corrected'] = correct_char
                    record['corrected_at'] = datetime.now().isoformat()
                    
                    if record['predictions']:
                        predicted = record['predictions'][0]['character']
                        update_confusion_matrix(predicted, correct_char)
                    break
            
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump(history, f, ensure_ascii=False, indent=2)
        
        sample_count = len([f for f in os.listdir(config.SAMPLES_DIR) if f.endswith('.png')])
        needs_retrain = sample_count >= config.RETRAIN_THRESHOLD
        
        return jsonify({
            'success': True,
            'saved_path': filename,
            'sample_count': sample_count,
            'needs_retrain': needs_retrain,
            'retrain_threshold': config.RETRAIN_THRESHOLD
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/batch_recognize', methods=['POST'])
def batch_recognize():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        batch_id = str(uuid.uuid4())[:8]
        batch_dir = os.path.join(config.BATCH_DIR, f"{timestamp}_{batch_id}")
        os.makedirs(batch_dir, exist_ok=True)
        
        original_path = os.path.join(batch_dir, 'original.png')
        file.save(original_path)
        
        segmented = image_utils.segment_handwriting(original_path, batch_dir)
        
        model_instance = get_model()
        results = []
        
        for item in segmented:
            processed = model_module.preprocess_image_from_pil(item['image'])
            predictions = model_module.predict_character(model_instance, processed, top_k=3)
            
            char_filename = f"char_{item['index']:03d}.png"
            char_path = os.path.join(batch_dir, char_filename)
            
            results.append({
                'index': item['index'],
                'bbox': item['bbox'],
                'predictions': predictions,
                'image_path': char_filename
            })
        
        record = {
            'id': batch_id,
            'timestamp': datetime.now().isoformat(),
            'type': 'batch',
            'original_image': original_path,
            'segmented_count': len(results),
            'results': results,
            'batch_dir': batch_dir
        }
        save_history_record(record)
        
        return jsonify({
            'success': True,
            'batch_id': batch_id,
            'segmented_count': len(results),
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/practice/compare', methods=['POST'])
def practice_compare():
    try:
        data = request.get_json()
        target_char = data.get('target_char')
        user_image_data = data.get('user_image')
        
        if not all([target_char, user_image_data]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if user_image_data.startswith('data:image'):
            user_image_data = user_image_data.split(',')[1]
        
        user_image_bytes = base64.b64decode(user_image_data)
        user_image = Image.open(io.BytesIO(user_image_bytes))
        
        standard_img = image_utils.generate_standard_character(target_char)
        
        similarity = image_utils.calculate_similarity_from_pil(user_image, standard_img)
        
        score = int(similarity * 100)
        
        feedback = ""
        if score >= 90:
            feedback = "非常棒！书写非常标准！"
        elif score >= 75:
            feedback = "很好！继续保持！"
        elif score >= 60:
            feedback = "不错，还有提升空间！"
        elif score >= 40:
            feedback = "加油，注意笔画结构！"
        else:
            feedback = "需要多加练习哦！"
        
        return jsonify({
            'success': True,
            'similarity': similarity,
            'score': score,
            'feedback': feedback
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/practice/characters', methods=['GET'])
def practice_characters():
    try:
        category = request.args.get('category', 'all')
        
        char_list = config.CHAR_LIST
        
        if category == 'chinese':
            chars = [c for c in char_list if '\u4e00' <= c <= '\u9fff']
        elif category == 'english':
            chars = [c for c in char_list if c.isalpha()]
        elif category == 'number':
            chars = [c for c in char_list if c.isdigit()]
        else:
            chars = char_list
        
        return jsonify({
            'success': True,
            'characters': chars,
            'total': len(chars)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/practice/standard_image', methods=['GET'])
def practice_standard_image():
    try:
        char = request.args.get('char')
        if not char:
            return jsonify({'error': 'Character parameter required'}), 400
        
        standard_img = image_utils.generate_standard_character(char)
        
        buffer = io.BytesIO()
        standard_img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return send_file(buffer, mimetype='image/png', as_attachment=False, download_name='standard.png')
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/analytics/confusion_matrix', methods=['GET'])
def get_confusion_matrix():
    try:
        limit = int(request.args.get('limit', 20))
        
        matrix = dict(confusion_matrix_data)
        
        all_chars = set()
        for actual in matrix:
            all_chars.add(actual)
            for predicted in matrix[actual]:
                all_chars.add(predicted)
        
        all_chars = sorted(list(all_chars))[:limit]
        
        cm_data = []
        for actual in all_chars:
            row = []
            for predicted in all_chars:
                row.append(matrix.get(actual, {}).get(predicted, 0))
            cm_data.append(row)
        
        errors = sorted(error_statistics.items(), key=lambda x: x[1], reverse=True)[:10]
        common_errors = [{'error_pair': k, 'count': v} for k, v in errors]
        
        return jsonify({
            'success': True,
            'characters': all_chars,
            'matrix': cm_data,
            'common_errors': common_errors,
            'total_errors': sum(error_statistics.values())
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/analytics/confusion_matrix_image', methods=['GET'])
def get_confusion_matrix_image():
    try:
        limit = int(request.args.get('limit', 15))
        
        matrix = dict(confusion_matrix_data)
        
        all_chars = set()
        for actual in matrix:
            all_chars.add(actual)
            for predicted in matrix[actual]:
                all_chars.add(predicted)
        
        all_chars = sorted(list(all_chars))[:limit]
        
        cm = np.zeros((len(all_chars), len(all_chars)), dtype=int)
        for i, actual in enumerate(all_chars):
            for j, predicted in enumerate(all_chars):
                cm[i, j] = matrix.get(actual, {}).get(predicted, 0)
        
        plt.figure(figsize=(12, 10))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=all_chars, yticklabels=all_chars)
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        plt.title('Confusion Matrix')
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='PNG', dpi=100)
        buffer.seek(0)
        plt.close()
        
        return send_file(buffer, mimetype='image/png')
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/analytics/error_stats', methods=['GET'])
def get_error_stats():
    try:
        errors = sorted(error_statistics.items(), key=lambda x: x[1], reverse=True)[:20]
        error_list = [{'error_pair': k, 'count': v} for k, v in errors]
        
        return jsonify({
            'success': True,
            'errors': error_list,
            'total_errors': sum(error_statistics.values())
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    try:
        samples_dir = config.SAMPLES_DIR
        sample_files = [f for f in os.listdir(samples_dir) if f.endswith('.png')]
        
        if len(sample_files) == 0:
            return jsonify({'error': 'No samples to export'}), 404
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        export_path = os.path.join(config.EXPORT_DIR, f'training_data_{timestamp}.csv')
        
        data = []
        for sample_file in sample_files:
            try:
                parts = sample_file.split('_')
                if len(parts) < 2:
                    continue
                
                label = parts[0]
                img_path = os.path.join(samples_dir, sample_file)
                
                img = Image.open(img_path).convert('L')
                img = img.resize(config.IMAGE_SIZE)
                img_array = np.array(img).flatten()
                
                row = {'label': label, 'filename': sample_file}
                for i, pixel in enumerate(img_array):
                    row[f'pixel_{i}'] = pixel
                
                data.append(row)
            except Exception as e:
                print(f"Error processing {sample_file}: {e}")
                continue
        
        if len(data) == 0:
            return jsonify({'error': 'No valid samples to export'}), 404
        
        df = pd.DataFrame(data)
        df.to_csv(export_path, index=False, encoding='utf-8-sig')
        
        return jsonify({
            'success': True,
            'export_path': export_path,
            'sample_count': len(data),
            'filename': os.path.basename(export_path)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/download', methods=['GET'])
def download_export():
    try:
        filename = request.args.get('filename')
        if not filename:
            return jsonify({'error': 'Filename parameter required'}), 400
        
        export_path = os.path.join(config.EXPORT_DIR, filename)
        if not os.path.exists(export_path):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(export_path, as_attachment=True, download_name=filename)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        type_filter = request.args.get('type', 'all')
        
        history_file = os.path.join(config.HISTORY_DIR, 'history.json')
        history = []
        
        if os.path.exists(history_file):
            with open(history_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
        
        if type_filter != 'all':
            history = [h for h in history if h.get('type') == type_filter]
        
        total = len(history)
        start = (page - 1) * per_page
        end = start + per_page
        paginated = history[start:end]
        
        return jsonify({
            'success': True,
            'history': paginated,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/status', methods=['GET'])
def get_status():
    try:
        sample_count = len([f for f in os.listdir(config.SAMPLES_DIR) if f.endswith('.png')])
        needs_retrain = sample_count >= config.RETRAIN_THRESHOLD
        
        stats_path = os.path.join(config.DATA_DIR, 'training_stats.json')
        training_stats = {}
        if os.path.exists(stats_path):
            with open(stats_path, 'r', encoding='utf-8') as f:
                training_stats = json.load(f)
        
        history_file = os.path.join(config.HISTORY_DIR, 'history.json')
        history_count = 0
        if os.path.exists(history_file):
            with open(history_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
                history_count = len(history)
        
        return jsonify({
            'success': True,
            'sample_count': sample_count,
            'retrain_threshold': config.RETRAIN_THRESHOLD,
            'needs_retrain': needs_retrain,
            'history_count': history_count,
            'total_errors': sum(error_statistics.values()),
            'training_stats': training_stats,
            'character_count': len(config.CHAR_LIST)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/retrain', methods=['POST'])
def retrain_model():
    try:
        history = model_module.train_with_new_data()
        
        if history is None:
            return jsonify({'success': False, 'message': 'No new samples to train with'}), 400
        
        sample_files = [f for f in os.listdir(config.SAMPLES_DIR) if f.endswith('.png')]
        for sample_file in sample_files:
            src_path = os.path.join(config.SAMPLES_DIR, sample_file)
            trained_dir = os.path.join(config.DATA_DIR, 'trained_samples')
            os.makedirs(trained_dir, exist_ok=True)
            dst_path = os.path.join(trained_dir, sample_file)
            os.rename(src_path, dst_path)
        
        global model
        model = model_module.load_model()
        
        return jsonify({
            'success': True,
            'message': 'Model retrained successfully',
            'trained_samples': len(sample_files)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("Loading model...")
    get_model()
    print("Starting server on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
