from flask import Blueprint, request, jsonify, render_template, send_file
import io
from proxy.rules import rule_manager
from proxy.logger import logger
from proxy.cache import cache_manager

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/')
def index():
    return render_template('admin/index.html')

@admin_bp.route('/api/rules', methods=['GET'])
def get_rules():
    return jsonify(rule_manager.get_all_rules())

@admin_bp.route('/api/rules', methods=['POST'])
def add_rule():
    data = request.get_json()
    rule = rule_manager.add_rule(data)
    return jsonify(rule), 201

@admin_bp.route('/api/rules/<rule_id>', methods=['PUT'])
def update_rule(rule_id):
    data = request.get_json()
    rule = rule_manager.update_rule(rule_id, data)
    if rule:
        return jsonify(rule)
    return jsonify({'error': 'Rule not found'}), 404

@admin_bp.route('/api/rules/<rule_id>', methods=['DELETE'])
def delete_rule(rule_id):
    rule_manager.delete_rule(rule_id)
    return jsonify({'success': True})

@admin_bp.route('/api/logs', methods=['GET'])
def get_logs():
    limit = int(request.args.get('limit', 100))
    offset = int(request.args.get('offset', 0))
    return jsonify(logger.get_logs(limit, offset))

@admin_bp.route('/api/logs', methods=['DELETE'])
def clear_logs():
    logger.clear_logs()
    return jsonify({'success': True})

@admin_bp.route('/api/cache', methods=['DELETE'])
def clear_cache():
    cache_manager.clear()
    return jsonify({'success': True})

@admin_bp.route('/api/rules/export', methods=['GET'])
def export_rules():
    rules_json = rule_manager.export_rules()
    buffer = io.BytesIO()
    buffer.write(rules_json.encode('utf-8'))
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype='application/json',
        as_attachment=True,
        download_name='proxy-rules.json'
    )

@admin_bp.route('/api/rules/import', methods=['POST'])
def import_rules():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    content = file.read().decode('utf-8')
    
    if rule_manager.import_rules(content):
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid JSON format'}), 400

@admin_bp.route('/api/test', methods=['POST'])
def test_proxy():
    data = request.get_json()
    target_url = data.get('url')
    method = data.get('method', 'GET')
    
    import requests
    try:
        response = requests.request(
            method=method,
            url=target_url,
            timeout=10
        )
        return jsonify({
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'content': response.text[:5000]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
