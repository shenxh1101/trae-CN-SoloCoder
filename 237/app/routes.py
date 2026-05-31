import os
import json
from flask import Blueprint, request, jsonify, render_template, send_from_directory, abort, current_app
from werkzeug.utils import secure_filename

from app.file_parser import parse_file, save_file, allowed_file
from app.diff_engine import DiffEngine
from app.exporter import Exporter
from app.template_manager import TemplateManager
from app.batch_processor import BatchProcessor
from app.config import CLAUSE_CATEGORIES, DEFAULT_IGNORE_PATTERNS

main_bp = Blueprint('main', __name__)
api_bp = Blueprint('api', __name__)

def get_diff_engine(request_data):
    use_transformer = request_data.get('use_transformer', False)
    if isinstance(use_transformer, str):
        use_transformer = use_transformer.lower() in ['true', '1', 'yes']
    
    threshold = request_data.get('threshold')
    if threshold:
        try:
            threshold = float(threshold)
        except (ValueError, TypeError):
            threshold = None
    
    ignore_patterns = request_data.get('ignore_patterns')
    
    if ignore_patterns:
        if isinstance(ignore_patterns, str):
            ignore_patterns = [p.strip() for p in ignore_patterns.split('\n') if p.strip()]
        elif isinstance(ignore_patterns, list):
            ignore_patterns = [p.strip() for p in ignore_patterns if p and p.strip()]
    
    return DiffEngine(
        use_transformer=use_transformer,
        ignore_patterns=ignore_patterns,
        threshold=threshold
    )

@main_bp.route('/')
def index():
    return render_template('index.html', 
                         categories=list(CLAUSE_CATEGORIES.keys()),
                         default_ignore_patterns=DEFAULT_IGNORE_PATTERNS)

@main_bp.route('/batch')
def batch_page():
    return render_template('batch.html')

@main_bp.route('/templates')
def templates_page():
    return render_template('templates.html')

@main_bp.route('/exports/<path:filename>')
def download_export(filename):
    try:
        return send_from_directory(current_app.config['EXPORT_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        abort(404)
    except Exception as e:
        current_app.logger.error(f"下载文件失败: {str(e)}")
        abort(500)

@api_bp.route('/compare', methods=['POST'])
def api_compare():
    if 'contract_a' not in request.files or 'contract_b' not in request.files:
        return jsonify({'error': '请上传两份合同文件'}), 400
    
    file_a = request.files['contract_a']
    file_b = request.files['contract_b']
    
    if file_a.filename == '' or file_b.filename == '':
        return jsonify({'error': '请选择要上传的文件'}), 400
    
    if not allowed_file(file_a.filename) or not allowed_file(file_b.filename):
        return jsonify({'error': '仅支持 .txt 和 .docx 格式文件'}), 400
    
    try:
        path_a = save_file(file_a, current_app.config['UPLOAD_FOLDER'])
        path_b = save_file(file_b, current_app.config['UPLOAD_FOLDER'])
        
        text_a = parse_file(path_a)
        text_b = parse_file(path_b)
        
        diff_engine = get_diff_engine(request.form)
        
        focus_categories = request.form.getlist('focus_categories')
        if not focus_categories:
            focus_str = request.form.get('focus_categories')
            if focus_str:
                focus_categories = json.loads(focus_str) if isinstance(focus_str, str) else focus_str
        
        result = diff_engine.compare_contracts(text_a, text_b, focus_categories=focus_categories)
        
        return jsonify({
            'success': True,
            'contract_a_name': file_a.filename,
            'contract_b_name': file_b.filename,
            'text_a': text_a,
            'result': result
        })
    
    except Exception as e:
        return jsonify({'error': f'比对失败: {str(e)}'}), 500

@api_bp.route('/compare/text', methods=['POST'])
def api_compare_text():
    data = request.get_json()
    
    if 'text_a' not in data or 'text_b' not in data:
        return jsonify({'error': '请提供两份合同文本'}), 400
    
    try:
        diff_engine = get_diff_engine(data)
        focus_categories = data.get('focus_categories')
        
        result = diff_engine.compare_contracts(
            data['text_a'], data['text_b'], 
            focus_categories=focus_categories
        )
        
        return jsonify({
            'success': True,
            'text_a': data['text_a'],
            'result': result
        })
    
    except Exception as e:
        return jsonify({'error': f'比对失败: {str(e)}'}), 500

@api_bp.route('/compare/template/<template_id>', methods=['POST'])
def api_compare_template(template_id):
    if 'contract' not in request.files:
        return jsonify({'error': '请上传合同文件'}), 400
    
    file_b = request.files['contract']
    
    try:
        template_manager = TemplateManager(current_app.config['TEMPLATE_FOLDER'])
        template_text = template_manager.get_template_content(template_id)
        template = template_manager.get_template(template_id)
        
        if not template_text:
            return jsonify({'error': '模板不存在'}), 404
        
        path_b = save_file(file_b, current_app.config['UPLOAD_FOLDER'])
        text_b = parse_file(path_b)
        
        diff_engine = get_diff_engine(request.form)
        focus_categories = request.form.getlist('focus_categories')
        
        result = diff_engine.compare_contracts(template_text, text_b, focus_categories=focus_categories)
        
        return jsonify({
            'success': True,
            'contract_a_name': template['name'],
            'contract_b_name': file_b.filename,
            'text_a': template_text,
            'result': result
        })
    
    except Exception as e:
        return jsonify({'error': f'比对失败: {str(e)}'}), 500

@api_bp.route('/compare/templates', methods=['POST'])
def api_compare_with_templates():
    template_a = request.form.get('template_a')
    template_b = request.form.get('template_b')
    file_a = request.files.get('contract_a')
    file_b = request.files.get('contract_b')
    
    if not file_a and not template_a:
        return jsonify({'error': '请上传合同A或选择模板A'}), 400
    if not file_b and not template_b:
        return jsonify({'error': '请上传合同B或选择模板B'}), 400
    
    try:
        template_manager = TemplateManager(current_app.config['TEMPLATE_FOLDER'])
        
        text_a = None
        contract_a_name = None
        
        if template_a:
            text_a = template_manager.get_template_content(template_a)
            template_a_data = template_manager.get_template(template_a)
            if template_a_data:
                contract_a_name = template_a_data['name']
            if not text_a:
                return jsonify({'error': '模板A不存在'}), 404
        elif file_a:
            path_a = save_file(file_a, current_app.config['UPLOAD_FOLDER'])
            text_a = parse_file(path_a)
            contract_a_name = file_a.filename
        
        text_b = None
        contract_b_name = None
        
        if template_b:
            text_b = template_manager.get_template_content(template_b)
            template_b_data = template_manager.get_template(template_b)
            if template_b_data:
                contract_b_name = template_b_data['name']
            if not text_b:
                return jsonify({'error': '模板B不存在'}), 404
        elif file_b:
            path_b = save_file(file_b, current_app.config['UPLOAD_FOLDER'])
            text_b = parse_file(path_b)
            contract_b_name = file_b.filename
        
        diff_engine = get_diff_engine(request.form)
        focus_categories = request.form.getlist('focus_categories')
        
        result = diff_engine.compare_contracts(text_a, text_b, focus_categories=focus_categories)
        
        return jsonify({
            'success': True,
            'contract_a_name': contract_a_name,
            'contract_b_name': contract_b_name,
            'text_a': text_a,
            'result': result
        })
    
    except Exception as e:
        return jsonify({'error': f'比对失败: {str(e)}'}), 500

@api_bp.route('/templates/<template_id>/content', methods=['GET'])
def api_get_template_content(template_id):
    try:
        template_manager = TemplateManager(current_app.config['TEMPLATE_FOLDER'])
        content = template_manager.get_template_content(template_id)
        
        if content is None:
            return jsonify({'error': '模板不存在'}), 404
        
        return jsonify({
            'success': True,
            'content': content
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/export/html', methods=['POST'])
def api_export_html():

    
    data = request.get_json()
    exporter = Exporter(current_app.config['EXPORT_FOLDER'])
    
    filepath, filename = exporter.export_to_html(
        data['result'],
        data['contract_a_name'],
        data['contract_b_name'],
        data.get('focus_categories')
    )
    
    return jsonify({
        'success': True,
        'filename': filename,
        'download_url': f'/exports/{filename}'
    })

@api_bp.route('/export/excel', methods=['POST'])
def api_export_excel():

    
    data = request.get_json()
    exporter = Exporter(current_app.config['EXPORT_FOLDER'])
    
    filepath, filename = exporter.export_to_excel(
        data['result'],
        data['contract_a_name'],
        data['contract_b_name']
    )
    
    return jsonify({
        'success': True,
        'filename': filename,
        'download_url': f'/exports/{filename}'
    })

@api_bp.route('/export/json', methods=['POST'])
def api_export_json():

    
    data = request.get_json()
    exporter = Exporter(current_app.config['EXPORT_FOLDER'])
    
    filepath, filename = exporter.export_to_json(
        data['result'],
        data['contract_a_name'],
        data['contract_b_name']
    )
    
    return jsonify({
        'success': True,
        'filename': filename,
        'download_url': f'/exports/{filename}',
        'data': {
            'contract_a': data['contract_a_name'],
            'contract_b': data['contract_b_name'],
            'differences': [
                {
                    'category': item['category'],
                    'type': item['type'],
                    'similarity': item['similarity'],
                    'old_text': item['old_text'],
                    'new_text': item['new_text']
                }
                for item in data['result']['diff_results']
            ]
        }
    })

@api_bp.route('/generate-revised', methods=['POST'])
def api_generate_revised():

    
    data = request.get_json()
    diff_engine = get_diff_engine(data)
    
    revised_text = diff_engine.generate_revised_contract(
        data['text_a'],
        data['diff_results'],
        merge_strategy=data.get('merge_strategy', 'prefer_new')
    )
    
    format = data.get('format', 'txt')
    exporter = Exporter(current_app.config['EXPORT_FOLDER'])
    filepath, filename = exporter.export_revised_contract(revised_text, format=format)
    
    return jsonify({
        'success': True,
        'revised_text': revised_text,
        'filename': filename,
        'download_url': f'/exports/{filename}'
    })

@api_bp.route('/templates', methods=['GET'])
def api_list_templates():

    template_manager = TemplateManager(current_app.config['TEMPLATE_FOLDER'])
    templates = template_manager.list_templates()
    return jsonify({'success': True, 'templates': templates})

@api_bp.route('/templates', methods=['POST'])
def api_save_template():

    
    if 'file' not in request.files:
        return jsonify({'error': '请上传模板文件'}), 400
    
    file = request.files['file']
    name = request.form.get('name', file.filename)
    description = request.form.get('description', '')
    
    try:
        template_manager = TemplateManager(current_app.config['TEMPLATE_FOLDER'])
        template = template_manager.save_template(file, name, description)
        return jsonify({'success': True, 'template': template})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/templates/<template_id>', methods=['DELETE'])
def api_delete_template(template_id):

    template_manager = TemplateManager(current_app.config['TEMPLATE_FOLDER'])
    
    if template_manager.delete_template(template_id):
        return jsonify({'success': True})
    return jsonify({'error': '模板不存在'}), 404

@api_bp.route('/templates/<template_id>', methods=['PUT'])
def api_update_template(template_id):

    data = request.get_json()
    template_manager = TemplateManager(current_app.config['TEMPLATE_FOLDER'])
    
    template = template_manager.update_template(
        template_id,
        name=data.get('name'),
        description=data.get('description')
    )
    
    if template:
        return jsonify({'success': True, 'template': template})
    return jsonify({'error': '模板不存在'}), 404

@api_bp.route('/batch-compare', methods=['POST'])
@api_bp.route('/batch/compare', methods=['POST'])
def api_batch_compare():
    if 'base_contract' not in request.files:
        return jsonify({'error': '请上传基准合同'}), 400
    
    base_file = request.files['base_contract']
    compare_files = request.files.getlist('compare_files')
    
    folder_path = request.form.get('folder_path')
    
    if not compare_files and not folder_path:
        return jsonify({'error': '请上传待比对的合同文件或指定文件夹路径'}), 400
    
    try:
        import time
        batch_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'batch_' + str(int(time.time())))
        os.makedirs(batch_folder, exist_ok=True)
        
        base_path = save_file(base_file, batch_folder)
        
        if compare_files:
            for f in compare_files:
                if f and allowed_file(f.filename):
                    filename = secure_filename(f.filename)
                    f.save(os.path.join(batch_folder, filename))
        elif folder_path and os.path.isdir(folder_path):
            for filename in os.listdir(folder_path):
                if allowed_file(filename):
                    src = os.path.join(folder_path, filename)
                    dst = os.path.join(batch_folder, filename)
                    if os.path.isfile(src):
                        import shutil
                        shutil.copy2(src, dst)
        
        processor = BatchProcessor(
            current_app.config['UPLOAD_FOLDER'],
            current_app.config['EXPORT_FOLDER']
        )
        
        use_transformer = request.form.get('use_transformer', False)
        threshold = request.form.get('threshold')
        if threshold:
            threshold = float(threshold)
        ignore_patterns = request.form.get('ignore_patterns')
        if ignore_patterns:
            ignore_patterns = [p.strip() for p in ignore_patterns.split('\n') if p.strip()]
        focus_categories = request.form.getlist('focus_categories')
        
        result = processor.process_folder(
            base_path,
            batch_folder,
            use_transformer=use_transformer,
            ignore_patterns=ignore_patterns,
            threshold=threshold,
            focus_categories=focus_categories
        )
        
        exporter = Exporter(current_app.config['EXPORT_FOLDER'])
        filepath, summary_filename = exporter.export_batch_summary(
            result['results'],
            base_file.filename
        )
        
        result['summary_file'] = {
            'filename': summary_filename,
            'download_url': f'/exports/{summary_filename}'
        }
        
        return jsonify({'success': True, 'result': result})
    
    except Exception as e:
        import traceback
        return jsonify({'error': f'批量比对失败: {str(e)}', 'traceback': traceback.format_exc()}), 500

@api_bp.route('/categories', methods=['GET'])
def api_get_categories():
    return jsonify({
        'success': True,
        'categories': list(CLAUSE_CATEGORIES.keys()),
        'category_keywords': CLAUSE_CATEGORIES
    })

@api_bp.route('/ignore-patterns', methods=['GET'])
def api_get_ignore_patterns():
    return jsonify({
        'success': True,
        'default_patterns': DEFAULT_IGNORE_PATTERNS
    })
