#!/usr/bin/env python3
import os
import json
import uuid
import tempfile
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_from_directory
from config import Config
from manual_generator import ManualGenerator, ProductManual
from preview_editor import PreviewEditor

app = Flask(__name__, template_folder=str(Config.BASE_DIR / "templates"))
Config.ensure_dirs()

generator = ManualGenerator()
editor = PreviewEditor()

manual_store = {}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/generate', methods=['POST'])
def api_generate():
    try:
        data = request.json
        manual = generator.generate(
            product_name=data['product_name'],
            features=data['features'],
            positioning=data['positioning'],
            style=data['style'],
            language=data['language']
        )
        
        manual_id = str(uuid.uuid4())
        manual_store[manual_id] = manual
        
        html_content = markdown_to_html(manual.content)
        
        return jsonify({
            'success': True,
            'manual_id': manual_id,
            'html': html_content,
            'slogan': manual.slogan,
            'meta': {
                'style': manual.style,
                'language': manual.language,
                'positioning': manual.positioning
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/revise', methods=['POST'])
def api_revise():
    try:
        data = request.json
        manual_id = data['manual_id']
        
        if manual_id not in manual_store:
            return jsonify({'success': False, 'error': '说明书不存在'}), 404
        
        manual = manual_store[manual_id]
        revised_manual = generator.revise(
            manual=manual,
            revision_suggestions=data['suggestions'],
            section=data.get('section')
        )
        
        manual_store[manual_id] = revised_manual
        
        return jsonify({
            'success': True,
            'html': markdown_to_html(revised_manual.content)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/slogan', methods=['POST'])
def api_slogan():
    try:
        data = request.json
        manual_id = data['manual_id']
        
        if manual_id not in manual_store:
            return jsonify({'success': False, 'error': '说明书不存在'}), 404
        
        manual = manual_store[manual_id]
        new_slogan = generator.generate_slogan(
            product_name=manual.product_name,
            features=manual.features,
            positioning=manual.positioning,
            language=manual.language,
            style='marketing'
        )
        manual.slogan = new_slogan
        
        return jsonify({'success': True, 'slogan': new_slogan})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/download/<manual_id>/<format>')
def api_download(manual_id, format):
    try:
        if manual_id not in manual_store:
            return '说明书不存在', 404
        
        manual = manual_store[manual_id]
        
        if format == 'json':
            temp_path = Path(tempfile.gettempdir()) / f"{manual_id}.json"
            editor.save_manual_data(manual, str(temp_path))
            return send_from_directory(str(temp_path.parent), temp_path.name, as_attachment=True)
        
        ext = 'md' if format == 'markdown' else format
        temp_path = Path(tempfile.gettempdir()) / f"{manual_id}.{ext}"
        generator.save_manual(manual, str(temp_path), format)
        
        return send_from_directory(str(temp_path.parent), temp_path.name, as_attachment=True)
    except Exception as e:
        return str(e), 500


def markdown_to_html(md_content):
    try:
        import markdown
        return markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
    except Exception:
        import re
        html = md_content
        html = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
        html = re.sub(r'^## (.*?)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
        html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
        html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
        html = html.replace('\n', '<br>')
        return html


def run_server(host='0.0.0.0', port=5000, debug=False):
    print(f"🌐 Web服务器启动: http://{host}:{port}")
    app.run(host=host, port=port, debug=debug, use_reloader=False)


if __name__ == '__main__':
    run_server()
