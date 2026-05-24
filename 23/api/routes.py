from flask import request, jsonify
import io
import time
import os
import base64
from PIL import Image
from typing import Dict, Any, List, Tuple

from model import MobileNetClassifier
from utils import (
    success_response,
    error_response,
    save_feedback,
    load_feedback,
    load_history,
    save_history,
    get_history_item,
    add_feedback_to_history,
    compute_confusion_matrix,
    generate_id,
)

classifier = MobileNetClassifier()

def register_routes(app):
    @app.route('/api/classify', methods=['POST'])
    def classify_images():
        try:
            if 'images' not in request.files:
                return jsonify(error_response('No images provided')), 400
            
            files = request.files.getlist('images')
            
            if len(files) > 10:
                return jsonify(error_response('Maximum 10 images allowed')), 400
            
            if len(files) == 0:
                return jsonify(error_response('No images selected')), 400
            
            pil_images: List[Tuple[Image.Image, str]] = []
            for file in files:
                if file and file.filename:
                    try:
                        img_bytes = file.read()
                        img = Image.open(io.BytesIO(img_bytes))
                        pil_images.append((img, file.filename))
                    except Exception as e:
                        print(f"Failed to open image {file.filename}: {e}")
            
            if len(pil_images) == 0:
                return jsonify(error_response('Invalid image files')), 400
            
            results = classifier.classify_batch([img for img, _ in pil_images])
            
            for i, result in enumerate(results):
                if result.get('success'):
                    result['id'] = generate_id()
                    result['filename'] = pil_images[i][1]
                    result['timestamp'] = int(time.time() * 1000)
                    save_history(result)
            
            return jsonify(success_response(results))
            
        except Exception as e:
            print(f"Classification error: {e}")
            return jsonify(error_response(f'Classification failed: {str(e)}')), 500

    @app.route('/api/classify/url', methods=['POST'])
    def classify_from_url():
        try:
            data = request.get_json()
            if not data or 'url' not in data:
                return jsonify(error_response('URL is required')), 400
            
            url = data['url']
            result = classifier.classify_from_url(url)
            
            if result.get('success'):
                result['id'] = generate_id()
                result['filename'] = url.split('/')[-1] or 'url_image'
                result['timestamp'] = int(time.time() * 1000)
                save_history(result)
            
            return jsonify(success_response([result]))
            
        except Exception as e:
            print(f"URL classification error: {e}")
            return jsonify(error_response(f'Failed to classify from URL: {str(e)}')), 500

    @app.route('/api/feedback', methods=['POST'])
    def submit_feedback():
        try:
            data = request.get_json()
            if not data:
                return jsonify(error_response('No data provided')), 400
            
            required_fields = ['imageId', 'predictedClass', 'isCorrect']
            for field in required_fields:
                if field not in data:
                    return jsonify(error_response(f'Missing required field: {field}')), 400
            
            feedback_id = generate_id()
            feedback_data = {
                'id': feedback_id,
                'imageId': data['imageId'],
                'predictedClass': data['predictedClass'],
                'isCorrect': data['isCorrect'],
                'correctClass': data.get('correctClass'),
                'timestamp': int(time.time() * 1000)
            }
            
            save_feedback(feedback_data)
            
            feedback_for_history = {
                'isCorrect': data['isCorrect'],
                'correctClass': data.get('correctClass'),
                'timestamp': int(time.time() * 1000)
            }
            add_feedback_to_history(data['imageId'], feedback_for_history)
            
            return jsonify(success_response(message='Feedback saved successfully'))
            
        except Exception as e:
            print(f"Feedback error: {e}")
            return jsonify(error_response(f'Failed to save feedback: {str(e)}')), 500

    @app.route('/api/feedback', methods=['GET'])
    def get_feedback():
        try:
            feedbacks = load_feedback()
            return jsonify(success_response(feedbacks))
        except Exception as e:
            print(f"Get feedback error: {e}")
            return jsonify(error_response(f'Failed to load feedback: {str(e)}')), 500

    @app.route('/api/history', methods=['GET'])
    def get_history():
        try:
            limit = request.args.get('limit', default=20, type=int)
            limit = min(limit, 100)
            history = load_history(limit)
            return jsonify(success_response(history))
        except Exception as e:
            print(f"Get history error: {e}")
            return jsonify(error_response(f'Failed to load history: {str(e)}')), 500

    @app.route('/api/history/<item_id>', methods=['GET'])
    def get_history_single(item_id):
        try:
            item = get_history_item(item_id)
            if not item:
                return jsonify(error_response('History item not found')), 404
            return jsonify(success_response(item))
        except Exception as e:
            print(f"Get history item error: {e}")
            return jsonify(error_response(f'Failed to load history item: {str(e)}')), 500

    @app.route('/api/history/<item_id>/reclassify', methods=['POST'])
    def reclassify_history(item_id):
        try:
            item = get_history_item(item_id)
            if not item:
                return jsonify(error_response('History item not found')), 404
            
            thumbnail = item.get('thumbnail', '')
            if not thumbnail.startswith('data:image'):
                return jsonify(error_response('Cannot reclassify: no image data')), 400
            
            header, encoded = thumbnail.split(',', 1)
            image_data = base64.b64decode(encoded)
            
            result = classifier.classify(image_data, item.get('filename', 'reclassified.jpg'))
            result['id'] = item_id
            
            save_history(result)
            
            return jsonify(success_response(result))
            
        except Exception as e:
            print(f"Reclassify error: {e}")
            return jsonify(error_response(f'Failed to reclassify: {str(e)}')), 500

    @app.route('/api/confusion-matrix', methods=['GET'])
    def get_confusion_matrix():
        try:
            matrix_data = compute_confusion_matrix()
            return jsonify(success_response(matrix_data))
        except Exception as e:
            print(f"Confusion matrix error: {e}")
            return jsonify(error_response(f'Failed to compute confusion matrix: {str(e)}')), 500

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify(success_response({
            'status': 'ok',
            'model': 'MobileNetV2',
            'timestamp': int(time.time() * 1000)
        }))
