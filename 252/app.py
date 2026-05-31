from flask import Flask, render_template, request, jsonify, send_file, make_response
import os
import uuid
import csv
import io
from werkzeug.utils import secure_filename
from config import Config

from text_extractor import extract_text, allowed_file
from keyword_analyzer import (
    extract_keywords, calculate_match_score, calculate_density,
    generate_optimization_suggestions, generate_keyword_examples,
    batch_compare_resumes, calculate_ats_score
)
from thesaurus import suggest_power_verbs, get_power_verb_categories
from data_store import ResumeSnippetStore, AnalysisHistory

app = Flask(__name__)
app.config.from_object(Config)

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.dirname(app.config['RESUME_SNIPPETS_FILE']), exist_ok=True)

snippet_store = ResumeSnippetStore(app.config['RESUME_SNIPPETS_FILE'])
history_store = AnalysisHistory(app.config['ANALYSIS_HISTORY_FILE'])

def check_text_format_issues(text):
    issues = []
    text_lower = text.lower()
    
    format_markers = [
        ('[表格]', '检测到文本中包含[表格]标记，表格结构可能导致ATS解析失败'),
        ('[图片]', '检测到文本中包含[图片]标记，图片内容无法被ATS系统提取'),
        ('[图表]', '检测到文本中包含[图表]标记，建议用文字描述数据'),
        ('<table>', '检测到HTML表格标签，ATS可能无法正确解析'),
        ('<img>', '检测到HTML图片标签，图片内容无法被文本提取'),
        ('---表格开始---', '检测到表格分隔符，建议简化为纯文本列表'),
        ('| --- |', '检测到Markdown表格格式，ATS可能难以解析'),
        ('column', '建议避免使用多栏布局，使用单栏格式更易被ATS识别'),
    ]
    
    for marker, issue in format_markers:
        if marker.lower() in text_lower:
            issues.append(issue)
    
    special_chars = ['☐', '☑', '■', '●', '◆', '★', '✓', '✔']
    for char in special_chars:
        if char in text:
            issues.append('检测到特殊符号/图标，ATS系统可能无法正确识别')
            break
    
    if len(text.strip()) < 200:
        issues.append('简历内容过短，建议补充详细的工作经历和技能描述')
    
    return issues

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        job_description = request.form.get('job_description', '')
        resume_text = request.form.get('resume_text', '')
        custom_weights_str = request.form.get('custom_weights', '')
        resume_file = request.files.get('resume_file')
        
        format_issues = []
        resume_name = "粘贴文本"
        
        if resume_file and resume_file.filename:
            if allowed_file(resume_file.filename, app.config['ALLOWED_EXTENSIONS']):
                filename = secure_filename(resume_file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                resume_file.save(file_path)
                
                resume_text, format_issues = extract_text(file_path)
                resume_name = filename
                
                try:
                    os.remove(file_path)
                except:
                    pass
            else:
                return jsonify({
                    'success': False,
                    'error': '不支持的文件格式，请上传PDF、DOCX或TXT文件'
                }), 400
        
        if not resume_text:
            return jsonify({
                'success': False,
                'error': '请上传简历文件或粘贴简历文本'
            }), 400
        
        if not job_description:
            return jsonify({
                'success': False,
                'error': '请输入岗位描述'
            }), 400
        
        text_format_issues = check_text_format_issues(resume_text)
        format_issues.extend(text_format_issues)
        
        custom_weights = {}
        if custom_weights_str:
            try:
                for line in custom_weights_str.strip().split('\n'):
                    if ':' in line:
                        keyword, weight = line.split(':', 1)
                        custom_weights[keyword.strip().lower()] = float(weight.strip())
            except:
                pass
        
        job_keywords_data = extract_keywords(job_description, top_n=30)
        job_keywords = [kw for kw, count in job_keywords_data]
        
        match_result = calculate_match_score(resume_text, job_keywords, custom_weights)
        
        density_info = calculate_density(resume_text, job_keywords)
        
        suggestions = generate_optimization_suggestions(match_result, density_info)
        
        verb_suggestions = suggest_power_verbs(resume_text)[:15]
        
        ats_score = calculate_ats_score(resume_text, match_result)
        
        pass_probability = min(max(ats_score / 100, 0), 1)
        
        keyword_examples = {}
        for keyword in match_result['missing_keywords'][:10]:
            keyword_examples[keyword] = generate_keyword_examples(keyword)
        
        highlighted_resume = resume_text
        for detail in match_result['keyword_details']:
            if detail['found']:
                kw = detail['keyword']
                highlighted_resume = highlighted_resume.replace(
                    kw, f'<span class="highlight-matched">{kw}</span>'
                )
        
        history_store.add_record(job_description, resume_name, ats_score, match_result['coverage'])
        
        response = {
            'success': True,
            'resume_name': resume_name,
            'match_result': match_result,
            'density_info': density_info,
            'suggestions': suggestions,
            'verb_suggestions': verb_suggestions,
            'power_verb_categories': get_power_verb_categories(),
            'ats_score': round(ats_score, 1),
            'pass_probability': round(pass_probability * 100, 1),
            'keyword_examples': keyword_examples,
            'format_issues': format_issues,
            'highlighted_resume': highlighted_resume,
            'job_keywords': job_keywords_data
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'分析过程中发生错误: {str(e)}'
        }), 500

@app.route('/batch-analyze', methods=['POST'])
def batch_analyze():
    try:
        job_description = request.form.get('job_description', '')
        custom_weights_str = request.form.get('custom_weights', '')
        resume_files = request.files.getlist('resume_files')
        
        if not job_description:
            return jsonify({
                'success': False,
                'error': '请输入岗位描述'
            }), 400
        
        if not resume_files or len(resume_files) == 0 or not resume_files[0].filename:
            return jsonify({
                'success': False,
                'error': '请上传至少一份简历文件'
            }), 400
        
        custom_weights = {}
        if custom_weights_str:
            try:
                for line in custom_weights_str.strip().split('\n'):
                    if ':' in line:
                        keyword, weight = line.split(':', 1)
                        custom_weights[keyword.strip().lower()] = float(weight.strip())
            except:
                pass
        
        job_keywords_data = extract_keywords(job_description, top_n=30)
        job_keywords = [kw for kw, count in job_keywords_data]
        
        resume_texts = []
        for resume_file in resume_files:
            if resume_file and resume_file.filename:
                if allowed_file(resume_file.filename, app.config['ALLOWED_EXTENSIONS']):
                    filename = secure_filename(resume_file.filename)
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    resume_file.save(file_path)
                    
                    text, _ = extract_text(file_path)
                    resume_texts.append({
                        'name': filename,
                        'text': text
                    })
                    
                    try:
                        os.remove(file_path)
                    except:
                        pass
        
        batch_results = batch_compare_resumes(resume_texts, job_keywords, custom_weights)
        
        return jsonify({
            'success': True,
            'batch_results': batch_results,
            'total_resumes': len(batch_results),
            'job_keywords': job_keywords_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'批量分析过程中发生错误: {str(e)}'
        }), 500

@app.route('/export-csv', methods=['POST'])
def export_csv():
    try:
        data = request.json.get('data', [])
        filename = request.json.get('filename', 'resume_analysis.csv')
        
        if not data:
            return jsonify({
                'success': False,
                'error': '没有数据可导出'
            }), 400
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        if isinstance(data[0], dict):
            headers = list(data[0].keys())
            writer.writerow(headers)
            
            for row in data:
                writer.writerow([str(row.get(h, '')) for h in headers])
        else:
            writer.writerows(data)
        
        output.seek(0)
        
        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Content-type"] = "text/csv"
        
        return response
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'导出CSV失败: {str(e)}'
        }), 500

@app.route('/snippets', methods=['GET'])
def get_snippets():
    category = request.args.get('category')
    keyword = request.args.get('keyword')
    
    if keyword:
        snippets = snippet_store.search_snippets(keyword)
    else:
        snippets = snippet_store.get_all_snippets(category)
    
    return jsonify({
        'success': True,
        'snippets': snippets,
        'categories': snippet_store.get_categories()
    })

@app.route('/snippets', methods=['POST'])
def add_snippet():
    try:
        data = request.json
        content = data.get('content', '')
        category = data.get('category', '未分类')
        keywords = data.get('keywords', [])
        
        if not content:
            return jsonify({
                'success': False,
                'error': '请输入片段内容'
            }), 400
        
        snippet = snippet_store.add_snippet(content, category, keywords)
        
        return jsonify({
            'success': True,
            'snippet': snippet
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'添加片段失败: {str(e)}'
        }), 500

@app.route('/snippets/<int:snippet_id>/rate', methods=['POST'])
def rate_snippet(snippet_id):
    try:
        data = request.json
        rating = data.get('rating', 0)
        
        if not (1 <= rating <= 5):
            return jsonify({
                'success': False,
                'error': '评分必须在1-5之间'
            }), 400
        
        success = snippet_store.rate_snippet(snippet_id, rating)
        
        if success:
            return jsonify({
                'success': True,
                'message': '评分成功'
            })
        else:
            return jsonify({
                'success': False,
                'error': '未找到该片段'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'评分失败: {str(e)}'
        }), 500

@app.route('/snippets/top', methods=['GET'])
def get_top_snippets():
    limit = int(request.args.get('limit', 5))
    snippets = snippet_store.get_top_rated(limit)
    
    return jsonify({
        'success': True,
        'snippets': snippets
    })

@app.route('/history', methods=['GET'])
def get_history():
    limit = int(request.args.get('limit', 20))
    history = history_store.get_history(limit)
    
    return jsonify({
        'success': True,
        'history': history
    })

@app.route('/power-verbs', methods=['GET'])
def get_power_verbs():
    return jsonify({
        'success': True,
        'categories': get_power_verb_categories()
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
