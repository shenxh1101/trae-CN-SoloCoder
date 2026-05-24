from flask import Flask
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from routes import register_routes

def create_app():
    app = Flask(__name__)
    
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
    
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    @app.route('/api/<path:path>', methods=['OPTIONS'])
    def handle_options(path):
        return '', 200
    
    register_routes(app)
    
    @app.route('/')
    def index():
        return {
            'name': 'AI Image Classification API',
            'version': '1.0.0',
            'endpoints': {
                'POST /api/classify': 'Classify uploaded images',
                'POST /api/classify/url': 'Classify image from URL',
                'POST /api/feedback': 'Submit classification feedback',
                'GET /api/feedback': 'Get all feedback',
                'GET /api/history': 'Get classification history',
                'GET /api/history/:id': 'Get single history item',
                'POST /api/history/:id/reclassify': 'Reclassify history item',
                'GET /api/confusion-matrix': 'Get confusion matrix',
                'GET /api/health': 'Health check'
            }
        }
    
    return app

if __name__ == '__main__':
    app = create_app()
    print("Starting AI Image Classification Server...")
    print("Loading MobileNetV2 model (this may take a few seconds)...")
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
