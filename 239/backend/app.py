from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import time
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from image_processing import ImageProcessor

app = Flask(__name__)
CORS(app)

processor = ImageProcessor()

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return jsonify({
        'message': 'AI老照片修复API服务',
        'endpoints': {
            'POST /api/repair': '单张照片修复',
            'POST /api/batch-repair': '批量照片修复',
            'POST /api/simulate-damage': '模拟破损效果'
        }
    })

@app.route('/api/repair', methods=['POST'])
def repair():
    try:
        start_time = time.time()
        
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': '未找到图片文件'}), 400
        
        image_file = request.files['image']
        intensity = request.form.get('intensity', 'medium')
        operations_str = request.form.get('operations', '{}')
        mask_file = request.files.get('mask', None)
        
        try:
            operations = json.loads(operations_str)
        except:
            operations = {}
        
        image_data = image_file.read()
        
        mask_data = None
        if mask_file:
            mask_data = mask_file.read()
        
        import io
        from PIL import Image
        
        image = Image.open(io.BytesIO(image_data))
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG')
        import base64
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        image_data_uri = f'data:image/jpeg;base64,{image_base64}'
        
        mask_data_uri = None
        if mask_data:
            mask_image = Image.open(io.BytesIO(mask_data))
            mask_buffer = io.BytesIO()
            mask_image.save(mask_buffer, format='PNG')
            mask_base64 = base64.b64encode(mask_buffer.getvalue()).decode()
            mask_data_uri = f'data:image/png;base64,{mask_base64}'
        
        result = processor.repair_image(
            image_data_uri,
            operations=operations,
            intensity=intensity,
            mask=mask_data_uri
        )
        
        end_time = time.time()
        
        return jsonify({
            'success': True,
            'original': result['original'],
            'repaired': result['repaired'],
            'steps': result['steps'],
            'time': int((end_time - start_time) * 1000)
        })
        
    except Exception as e:
        print(f"修复错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/batch-repair', methods=['POST'])
def batch_repair():
    try:
        start_time = time.time()
        
        files = request.files.getlist('images')
        if not files:
            return jsonify({'success': False, 'error': '未找到图片文件'}), 400
        
        intensity = request.form.get('intensity', 'medium')
        operations_str = request.form.get('operations', '{}')
        
        try:
            operations = json.loads(operations_str)
        except:
            operations = {}
        
        results = []
        
        for image_file in files:
            try:
                import io
                from PIL import Image
                import base64
                
                image_data = image_file.read()
                image = Image.open(io.BytesIO(image_data))
                buffer = io.BytesIO()
                image.save(buffer, format='JPEG')
                image_base64 = base64.b64encode(buffer.getvalue()).decode()
                image_data_uri = f'data:image/jpeg;base64,{image_base64}'
                
                result = processor.repair_image(
                    image_data_uri,
                    operations=operations,
                    intensity=intensity
                )
                
                results.append({
                    'filename': image_file.filename,
                    'original': result['original'],
                    'repaired': result['repaired'],
                    'success': True
                })
                
            except Exception as e:
                results.append({
                    'filename': image_file.filename,
                    'success': False,
                    'error': str(e)
                })
        
        end_time = time.time()
        
        return jsonify({
            'success': True,
            'results': results,
            'time': int((end_time - start_time) * 1000)
        })
        
    except Exception as e:
        print(f"批量修复错误: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/simulate-damage', methods=['POST'])
def simulate_damage():
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': '未找到图片文件'}), 400
        
        image_file = request.files['image']
        damage_level = int(request.form.get('damageLevel', 30))
        scratch_count = int(request.form.get('scratchCount', 10))
        
        import io
        from PIL import Image
        import base64
        
        image_data = image_file.read()
        image = Image.open(io.BytesIO(image_data))
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        image_data_uri = f'data:image/jpeg;base64,{image_base64}'
        
        result = processor.simulate_damage(
            image_data_uri,
            damage_level=damage_level,
            scratch_count=scratch_count
        )
        
        return jsonify({
            'success': True,
            'damaged': result['damaged']
        })
        
    except Exception as e:
        print(f"模拟破损错误: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("启动AI老照片修复API服务...")
    print("服务地址: http://localhost:8001")
    app.run(host='0.0.0.0', port=8001, debug=False)
