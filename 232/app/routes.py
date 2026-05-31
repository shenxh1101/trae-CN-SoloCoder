from flask import Blueprint, request, jsonify, render_template, Response, send_file
import json
import tempfile
from typing import Dict, Any
from datetime import datetime

from .generator import RoadmapGenerator
from .storage import LocalStorage
from .output_formatter import OutputFormatter
from .pdf_exporter import PDFExporter
from .models import Roadmap

main_bp = Blueprint('main', __name__)

storage = LocalStorage()
generator = RoadmapGenerator(storage=storage)
pdf_exporter = PDFExporter()


@main_bp.route('/')
def index():
    return render_template('index.html')


@main_bp.route('/api/generate', methods=['POST'])
def generate_roadmap():
    data = request.get_json() or {}
    skill = data.get('skill', '').strip()
    
    if not skill:
        return jsonify({'error': '请输入要学习的技能名称'}), 400
    
    time_budget = data.get('time_budget')
    user_id = data.get('user_id')
    existing_roadmap_data = data.get('existing_roadmap')
    adjust_only = data.get('adjust_only', False)
    
    try:
        if adjust_only and existing_roadmap_data:
            existing_roadmap = Roadmap.from_dict(existing_roadmap_data)
            roadmap = generator.adjust_time_budget(existing_roadmap, time_budget)
        else:
            roadmap = generator.generate(skill, time_budget, user_id)
        
        filepath = storage.save_roadmap(roadmap)
        
        return jsonify({
            'success': True,
            'roadmap': roadmap.to_dict(),
            'filepath': filepath,
            'dag': generator.get_dag_data(roadmap)
        })
    except Exception as e:
        return jsonify({'error': f'生成路线图失败: {str(e)}'}), 500


@main_bp.route('/api/generate/batch', methods=['POST'])
def generate_batch():
    data = request.get_json() or {}
    skills = data.get('skills', [])
    
    if not skills or not isinstance(skills, list):
        return jsonify({'error': '请提供技能列表'}), 400
    
    time_budget = data.get('time_budget')
    user_id = data.get('user_id')
    
    try:
        roadmaps = generator.generate_batch(skills, time_budget, user_id)
        comparison = generator.compare_roadmaps(roadmaps)
        
        roadmap_data = []
        for rm in roadmaps:
            filepath = storage.save_roadmap(rm)
            roadmap_data.append({
                'roadmap': rm.to_dict(),
                'filepath': filepath
            })
        
        return jsonify({
            'success': True,
            'roadmaps': roadmap_data,
            'comparison': comparison
        })
    except Exception as e:
        return jsonify({'error': f'批量生成失败: {str(e)}'}), 500


@main_bp.route('/api/roadmap/<skill>/export/<format>', methods=['GET'])
def export_roadmap(skill, format):
    roadmaps = storage.list_roadmaps()
    matching = [f for f in roadmaps if f.startswith(skill.lower().replace(' ', '_'))]
    
    if not matching:
        return jsonify({'error': '未找到该技能的路线图'}), 404
    
    roadmap = storage.load_roadmap(sorted(matching)[-1])
    if not roadmap:
        return jsonify({'error': '加载路线图失败'}), 500
    
    filename = f"{skill.lower().replace(' ', '_')}_roadmap"
    
    if format == 'json':
        content = OutputFormatter.to_json(roadmap)
        return Response(
            content,
            mimetype='application/json',
            headers={'Content-Disposition': f'attachment; filename={filename}.json'}
        )
    elif format == 'md':
        content = OutputFormatter.to_markdown(roadmap)
        return Response(
            content,
            mimetype='text/markdown',
            headers={'Content-Disposition': f'attachment; filename={filename}.md'}
        )
    elif format == 'html':
        content = OutputFormatter.to_html(roadmap)
        return Response(
            content,
            mimetype='text/html',
            headers={'Content-Disposition': f'attachment; filename={filename}.html'}
        )
    elif format == 'pdf':
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            output_path = tmp.name
        
        result = pdf_exporter.export(roadmap, output_path)
        if result and result.endswith('.pdf'):
            return send_file(
                result,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'{filename}.pdf'
            )
        else:
            return jsonify({'error': 'PDF导出失败'}), 500
    else:
        return jsonify({'error': '不支持的导出格式'}), 400


@main_bp.route('/api/feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json() or {}
    skill = data.get('skill')
    phase_id = data.get('phase_id')
    resource_name = data.get('resource_name')
    feedback_type = data.get('type')
    previous_vote = data.get('previous_vote')
    is_cancel = data.get('is_cancel', False)
    
    if not all([skill, phase_id, resource_name]):
        return jsonify({'error': '缺少必要参数'}), 400
    
    if feedback_type and feedback_type not in ['upvote', 'downvote']:
        return jsonify({'error': '无效的反馈类型'}), 400
    
    try:
        if previous_vote:
            storage.remove_feedback(skill, phase_id, resource_name, previous_vote)
        
        if not is_cancel and feedback_type:
            filepath = storage.save_feedback(skill, phase_id, resource_name, feedback_type)
        else:
            filepath = None
        
        rating = storage.get_resource_rating(skill, resource_name)
        
        return jsonify({
            'success': True,
            'filepath': filepath,
            'rating': rating,
            'canceled': is_cancel
        })
    except Exception as e:
        return jsonify({'error': f'保存反馈失败: {str(e)}'}), 500


@main_bp.route('/api/progress', methods=['POST'])
def update_progress():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'default')
    skill = data.get('skill')
    completed_phases = data.get('completed_phases', [])
    
    if not skill:
        return jsonify({'error': '请提供技能名称'}), 400
    
    try:
        filepath = storage.save_progress(user_id, skill, completed_phases)
        
        roadmaps = storage.list_roadmaps()
        matching = [f for f in roadmaps if f.startswith(skill.lower().replace(' ', '_'))]
        
        if matching:
            roadmap = storage.load_roadmap(sorted(matching)[-1])
            if roadmap:
                roadmap = generator.adjust_for_progress(roadmap, completed_phases)
                storage.save_roadmap(roadmap)
                
                return jsonify({
                    'success': True,
                    'filepath': filepath,
                    'roadmap': roadmap.to_dict()
                })
        
        return jsonify({
            'success': True,
            'filepath': filepath
        })
    except Exception as e:
        return jsonify({'error': f'更新进度失败: {str(e)}'}), 500


@main_bp.route('/api/skill-tree', methods=['POST', 'GET'])
def skill_tree():
    user_id = request.args.get('user_id', 'default')
    
    if request.method == 'POST':
        data = request.get_json() or {}
        skill_tree = data.get('skill_tree')
        
        if not skill_tree:
            return jsonify({'error': '请提供技能树数据'}), 400
        
        try:
            filepath = storage.save_skill_tree(user_id, skill_tree)
            mastered = storage.get_mastered_skills(user_id)
            
            return jsonify({
                'success': True,
                'filepath': filepath,
                'mastered_skills': mastered
            })
        except Exception as e:
            return jsonify({'error': f'保存技能树失败: {str(e)}'}), 500
    else:
        try:
            skill_tree = storage.load_skill_tree(user_id)
            mastered = storage.get_mastered_skills(user_id)
            
            return jsonify({
                'success': True,
                'skill_tree': skill_tree,
                'mastered_skills': mastered
            })
        except Exception as e:
            return jsonify({'error': f'加载技能树失败: {str(e)}'}), 500


@main_bp.route('/api/skill-tree/upload', methods=['POST'])
def upload_skill_tree():
    user_id = request.args.get('user_id', 'default')
    
    if 'file' not in request.files:
        return jsonify({'error': '请上传技能树文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
    
    try:
        content = file.read().decode('utf-8')
        skill_tree = json.loads(content)
        
        filepath = storage.save_skill_tree(user_id, skill_tree)
        mastered = storage.get_mastered_skills(user_id)
        
        return jsonify({
            'success': True,
            'filepath': filepath,
            'mastered_skills': mastered,
            'skill_tree': skill_tree
        })
    except json.JSONDecodeError:
        return jsonify({'error': '无效的JSON文件'}), 400
    except Exception as e:
        return jsonify({'error': f'上传技能树失败: {str(e)}'}), 500


@main_bp.route('/api/roadmaps')
def list_roadmaps():
    try:
        files = storage.list_roadmaps()
        return jsonify({
            'success': True,
            'roadmaps': files
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main_bp.route('/api/roadmap/<filename>')
def get_roadmap(filename):
    try:
        roadmap = storage.load_roadmap(filename)
        if roadmap:
            return jsonify({
                'success': True,
                'roadmap': roadmap.to_dict(),
                'dag': generator.get_dag_data(roadmap)
            })
        return jsonify({'error': '未找到路线图'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main_bp.route('/api/dag/<skill>')
def get_dag(skill):
    roadmaps = storage.list_roadmaps()
    matching = [f for f in roadmaps if f.startswith(skill.lower().replace(' ', '_'))]
    
    if not matching:
        return jsonify({'error': '未找到该技能的路线图'}), 404
    
    roadmap = storage.load_roadmap(sorted(matching)[-1])
    if not roadmap:
        return jsonify({'error': '加载路线图失败'}), 500
    
    try:
        dag = generator.get_dag_data(roadmap)
        return jsonify({
            'success': True,
            'dag': dag
        })
    except ValueError as e:
        return jsonify({'error': str(e), 'validation_failed': True}), 400
