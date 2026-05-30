import os
import uuid
import zipfile
import json
from datetime import datetime
from flask import Flask, render_template, request, send_file, jsonify, redirect, url_for
from werkzeug.utils import secure_filename
from risk_engine import RiskEngine
from pdf_exporter import PDFExporter


app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['SECRET_KEY'] = 'your-secret-key-here'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('data', exist_ok=True)

risk_engine = RiskEngine()
pdf_exporter = PDFExporter()


def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def save_uploaded_file(file, allowed_extensions):
    if file and allowed_file(file.filename, allowed_extensions):
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        return filepath, filename
    return None, None


def read_text_file(filepath):
    encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
    for encoding in encodings:
        try:
            with open(filepath, 'r', encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    return ''


@app.route('/')
def index():
    contract_types = risk_engine.get_contract_types()
    return render_template('index.html', contract_types=contract_types)


@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': '未选择文件'}), 400

    file = request.files['file']
    contract_type = request.form.get('contract_type', 'general')

    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400

    filepath, original_filename = save_uploaded_file(file, {'txt'})
    if not filepath:
        return jsonify({'error': '文件格式不支持，请上传TXT文件'}), 400

    text = read_text_file(filepath)
    if not text:
        return jsonify({'error': '无法读取文件内容'}), 400

    risks = risk_engine.analyze(text, contract_type)
    risk_level = risk_engine.calculate_risk_level(risks)
    summary = risk_engine.generate_summary(text, risks)
    heatmap_data = risk_engine.get_heatmap_data(text, risks)

    session_id = str(uuid.uuid4())
    session_data = {
        'filename': original_filename,
        'contract_type': contract_type,
        'text': text,
        'risks': risks,
        'risk_level': risk_level,
        'summary': summary,
        'heatmap_data': heatmap_data
    }

    with open(f'data/session_{session_id}.json', 'w', encoding='utf-8') as f:
        json.dump(session_data, f, ensure_ascii=False)

    return jsonify({
        'session_id': session_id,
        'redirect_url': url_for('result', session_id=session_id)
    })


@app.route('/result/<session_id>')
def result(session_id):
    session_file = f'data/session_{session_id}.json'
    if not os.path.exists(session_file):
        return redirect(url_for('index'))

    with open(session_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return render_template('result.html',
                           session_id=session_id,
                           filename=data['filename'],
                           contract_type=data['contract_type'],
                           risks=data['risks'],
                           risk_level=data['risk_level'],
                           summary=data['summary'],
                           heatmap_data=data['heatmap_data'])


@app.route('/batch_upload', methods=['POST'])
def batch_upload():
    if 'file' not in request.files:
        return jsonify({'error': '未选择文件'}), 400

    file = request.files['file']
    contract_type = request.form.get('contract_type', 'general')

    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400

    filepath, original_filename = save_uploaded_file(file, {'zip'})
    if not filepath:
        return jsonify({'error': '文件格式不支持，请上传ZIP文件'}), 400

    results = []
    extract_dir = os.path.join(app.config['UPLOAD_FOLDER'], f"extract_{uuid.uuid4().hex}")
    os.makedirs(extract_dir, exist_ok=True)

    try:
        with zipfile.ZipFile(filepath, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        for root, dirs, files in os.walk(extract_dir):
            for filename in files:
                if filename.endswith('.txt'):
                    file_path = os.path.join(root, filename)
                    text = read_text_file(file_path)
                    if text:
                        risks = risk_engine.analyze(text, contract_type)
                        risk_level = risk_engine.calculate_risk_level(risks)
                        results.append({
                            'filename': filename,
                            'risk_count': len(risks),
                            'risk_level': risk_level,
                            'risks': risks
                        })

        total_risks = sum(r['risk_count'] for r in results)
        high_risk_count = sum(1 for r in results if r['risk_level'] == 'high')
        medium_risk_count = sum(1 for r in results if r['risk_level'] == 'medium')
        low_risk_count = sum(1 for r in results if r['risk_level'] == 'low')

        overall_level = 'low'
        if high_risk_count > 0:
            overall_level = 'high'
        elif medium_risk_count > len(results) * 0.3:
            overall_level = 'medium'

        batch_id = str(uuid.uuid4())
        batch_data = {
            'original_filename': original_filename,
            'contract_type': contract_type,
            'results': results,
            'total_files': len(results),
            'total_risks': total_risks,
            'high_risk_count': high_risk_count,
            'medium_risk_count': medium_risk_count,
            'low_risk_count': low_risk_count,
            'overall_level': overall_level
        }

        with open(f'data/batch_{batch_id}.json', 'w', encoding='utf-8') as f:
            json.dump(batch_data, f, ensure_ascii=False)

        return jsonify({
            'batch_id': batch_id,
            'redirect_url': url_for('batch_result', batch_id=batch_id)
        })

    except Exception as e:
        return jsonify({'error': f'处理ZIP文件失败: {str(e)}'}), 400


@app.route('/batch_result/<batch_id>')
def batch_result(batch_id):
    batch_file = f'data/batch_{batch_id}.json'
    if not os.path.exists(batch_file):
        return redirect(url_for('index'))

    with open(batch_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return render_template('batch_result.html',
                           batch_id=batch_id,
                           data=data)


@app.route('/feedback', methods=['POST'])
def feedback():
    rule_id = request.form.get('rule_id')
    feedback_value = request.form.get('feedback')

    if not rule_id or feedback_value not in ['important', 'ignore']:
        return jsonify({'error': '参数错误'}), 400

    risk_engine.record_feedback(rule_id, feedback_value)
    return jsonify({'success': True})


@app.route('/export/<session_id>/<format_type>')
def export(session_id, format_type):
    session_file = f'data/session_{session_id}.json'
    if not os.path.exists(session_file):
        return redirect(url_for('index'))

    with open(session_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if format_type == 'html':
        high_count = len([r for r in data['risks'] if r['severity'] == 'high'])
        medium_count = len([r for r in data['risks'] if r['severity'] == 'medium'])
        low_count = len([r for r in data['risks'] if r['severity'] == 'low'])
        html_content = render_template('export.html',
                                       filename=data['filename'],
                                       risks=data['risks'],
                                       risk_level=data['risk_level'],
                                       summary=data['summary'],
                                       high_count=high_count,
                                       medium_count=medium_count,
                                       low_count=low_count,
                                       total_count=len(data['risks']),
                                       now=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

        export_path = f'data/export_{session_id}.html'
        with open(export_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return send_file(export_path,
                         as_attachment=True,
                         download_name=f"{data['filename'].replace('.txt', '')}_风险报告.html",
                         mimetype='text/html')

    elif format_type == 'pdf':
        pdf_path = f'data/export_{session_id}.pdf'
        exported_file = pdf_exporter.export_report(data, pdf_path)

        if exported_file.endswith('.pdf'):
            return send_file(exported_file,
                             as_attachment=True,
                             download_name=f"{data['filename'].replace('.txt', '')}_风险报告.pdf",
                             mimetype='application/pdf')
        else:
            return send_file(exported_file,
                             as_attachment=True,
                             download_name=f"{data['filename'].replace('.txt', '')}_风险报告_可打印.html",
                             mimetype='text/html')

    return jsonify({'error': '不支持的导出格式'}), 400


@app.route('/export_batch/<batch_id>/<format_type>')
def export_batch(batch_id, format_type):
    batch_file = f'data/batch_{batch_id}.json'
    if not os.path.exists(batch_file):
        return redirect(url_for('index'))

    with open(batch_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if format_type == 'html':
        html_content = render_template('export_batch.html',
                                       data=data,
                                       now=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

        export_path = f'data/export_batch_{batch_id}.html'
        with open(export_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return send_file(export_path,
                         as_attachment=True,
                         download_name=f"批量风险报告_{datetime.now().strftime('%Y%m%d')}.html",
                         mimetype='text/html')

    elif format_type == 'pdf':
        pdf_path = f'data/export_batch_{batch_id}.pdf'
        exported_file = pdf_exporter.export_batch_report(data, pdf_path)

        if exported_file.endswith('.pdf'):
            return send_file(exported_file,
                             as_attachment=True,
                             download_name=f"批量风险报告_{datetime.now().strftime('%Y%m%d')}.pdf",
                             mimetype='application/pdf')
        else:
            return send_file(exported_file,
                             as_attachment=True,
                             download_name=f"批量风险报告_{datetime.now().strftime('%Y%m%d')}_可打印.html",
                             mimetype='text/html')

    return jsonify({'error': '不支持的导出格式'}), 400


@app.route('/templates/<contract_type>')
def get_template(contract_type):
    template = risk_engine.get_template(contract_type)
    return jsonify({'template': template})


@app.route('/custom_rules')
def custom_rules():
    return render_template('custom_rules.html')


@app.route('/save_custom_rule', methods=['POST'])
def save_custom_rule():
    try:
        rule_data = {
            'id': request.form.get('rule_id'),
            'name': request.form.get('name'),
            'description': request.form.get('description'),
            'keywords': [k.strip() for k in request.form.get('keywords', '').split(',') if k.strip()],
            'pattern': request.form.get('pattern', ''),
            'severity': request.form.get('severity', 'medium'),
            'category': request.form.get('category', '自定义'),
            'suggestion': request.form.get('suggestion'),
            'supported_types': request.form.getlist('supported_types') or ['all']
        }

        custom_rules_file = 'rules/custom_rules.json'
        existing_rules = []
        if os.path.exists(custom_rules_file):
            with open(custom_rules_file, 'r', encoding='utf-8') as f:
                existing_rules = json.load(f)

        existing_ids = [r['id'] for r in existing_rules]
        if rule_data['id'] in existing_ids:
            return jsonify({'error': '规则ID已存在'}), 400

        existing_rules.append(rule_data)
        with open(custom_rules_file, 'w', encoding='utf-8') as f:
            json.dump(existing_rules, f, ensure_ascii=False, indent=2)

        risk_engine.rules = []
        risk_engine._load_rules()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/get_rules')
def get_rules():
    rules_info = []
    for rule in risk_engine.rules:
        rules_info.append({
            'id': rule.id,
            'name': rule.name,
            'description': rule.description,
            'severity': rule.severity,
            'category': rule.category,
            'weight': rule.weight,
            'supported_types': rule.supported_types
        })
    return jsonify({'rules': rules_info})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
