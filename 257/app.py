import uuid
import logging
from datetime import datetime
from flask import Flask, request, jsonify, render_template, Response
from flask_cors import CORS

from classifier import EmailClassifier
from storage import DataStore
from utils import CSVProcessor, WebhookNotifier

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

classifier = EmailClassifier(data_dir="data")
data_store = DataStore(data_dir="data")
csv_processor = CSVProcessor()
webhook_notifier = WebhookNotifier()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/health')
def health_check():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = classifier.get_available_categories()
    return jsonify({
        "categories": categories,
        "count": len(categories)
    })


@app.route('/api/classify', methods=['POST'])
def classify_email():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求数据为空"}), 400
    
    email_content = data.get('content', '').strip()
    if not email_content:
        return jsonify({"error": "邮件内容不能为空"}), 400
    
    email_id = data.get('email_id', str(uuid.uuid4()))
    
    result = classifier.process_email(email_content, email_id)
    
    log_entry = data_store.log_classification(result)
    result['log_id'] = log_entry.get('id')
    
    if result.get('priority') == '高':
        try:
            webhook_config = data_store.get_webhook_config()
            dingtalk_config = webhook_config.get('dingtalk', {})
            if dingtalk_config.get('enabled') and dingtalk_config.get('url'):
                ok, msg = webhook_notifier.send_dingtalk(dingtalk_config['url'], result)
                result['webhook_sent'] = ok
                result['webhook_message'] = msg
                if ok:
                    data_store.mark_webhook_sent(log_entry.get('id'))
                else:
                    logger.warning(f"Webhook推送失败: {msg}")
        except Exception as e:
            logger.error(f"Webhook处理异常: {e}")
            result['webhook_sent'] = False
            result['webhook_message'] = str(e)
    
    return jsonify({
        "success": True,
        "data": result
    })


@app.route('/api/classify/batch', methods=['POST'])
def classify_batch():
    data = request.get_json()
    if not data or 'emails' not in data:
        return jsonify({"error": "请提供邮件列表"}), 400
    
    emails = data.get('emails', [])
    if not isinstance(emails, list) or len(emails) == 0:
        return jsonify({"error": "邮件列表不能为空"}), 400
    
    results = []
    errors = []
    
    for idx, email_content in enumerate(emails):
        if email_content.strip():
            email_id = str(uuid.uuid4())
            try:
                result = classifier.process_email(email_content.strip(), email_id)
                log_entry = data_store.log_classification(result)
                result['log_id'] = log_entry.get('id')
                results.append(result)
                
                if result.get('priority') == '高':
                    try:
                        webhook_config = data_store.get_webhook_config()
                        dingtalk_config = webhook_config.get('dingtalk', {})
                        if dingtalk_config.get('enabled') and dingtalk_config.get('url'):
                            ok, msg = webhook_notifier.send_dingtalk(dingtalk_config['url'], result)
                            if not ok:
                                logger.warning(f"批量处理Webhook推送失败: {msg}")
                    except Exception as e:
                        logger.error(f"批量处理Webhook异常: {e}")
            except Exception as e:
                errors.append({"index": idx, "error": str(e)})
        else:
            errors.append({"index": idx, "error": "内容为空"})
    
    return jsonify({
        "success": True,
        "total": len(emails),
        "processed": len(results),
        "errors": errors,
        "data": results
    })


@app.route('/api/classify/csv', methods=['POST'])
def classify_csv():
    if 'file' not in request.files:
        return jsonify({"error": "请上传CSV文件，表单字段名需为file"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "未选择文件"}), 400
    
    if not file.filename.lower().endswith('.csv'):
        return jsonify({"error": "仅支持CSV文件格式"}), 400
    
    try:
        file_content = file.read()
    except Exception:
        return jsonify({"error": "文件读取失败"}), 400
    
    if len(file_content) == 0:
        return jsonify({"error": "上传的文件内容为空"}), 400
    
    emails, parse_errors = csv_processor.parse_emails(file_content)
    
    if not emails:
        return jsonify({"error": "CSV文件中没有有效的邮件内容", "parse_errors": parse_errors}), 400
    
    results = []
    process_errors = []
    
    for idx, email_content in enumerate(emails):
        email_id = str(uuid.uuid4())
        try:
            result = classifier.process_email(email_content, email_id)
            log_entry = data_store.log_classification(result)
            result['log_id'] = log_entry.get('id')
            results.append(result)
        except Exception as e:
            process_errors.append({"index": idx, "error": str(e)})
    
    csv_output = csv_processor.generate_results_csv(results)
    
    return Response(
        csv_output,
        mimetype='text/csv; charset=utf-8',
        headers={
            'Content-Disposition': 'attachment; filename="classification_results.csv"'
        }
    )


@app.route('/api/csv/template', methods=['GET'])
def download_csv_template():
    csv_content = csv_processor.generate_template_csv()
    return Response(
        csv_content,
        mimetype='text/csv',
        headers={
            'Content-Disposition': 'attachment; filename="email_template.csv"'
        }
    )


@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求数据为空"}), 400
    
    email_id = data.get('email_id', '')
    if not email_id:
        return jsonify({"error": "email_id不能为空"}), 400
    
    feedback = data_store.save_feedback(
        email_id=email_id,
        original_category=data.get('original_category', ''),
        corrected_category=data.get('corrected_category', ''),
        original_priority=data.get('original_priority', ''),
        corrected_priority=data.get('corrected_priority', ''),
        email_content=data.get('email_content', ''),
        note=data.get('note', '')
    )
    
    if feedback:
        return jsonify({
            "success": True,
            "message": "反馈已保存，将用于优化分类规则",
            "data": feedback
        })
    else:
        return jsonify({"error": "保存反馈失败"}), 500


@app.route('/api/feedback', methods=['GET'])
def get_feedbacks():
    category = request.args.get('category')
    limit = int(request.args.get('limit', 100))
    feedbacks = data_store.get_feedbacks(limit=limit, category=category)
    return jsonify({
        "success": True,
        "count": len(feedbacks),
        "data": feedbacks
    })


@app.route('/api/logs', methods=['GET'])
def get_logs():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    priority = request.args.get('priority')
    limit = int(request.args.get('limit', 1000))
    
    logs = data_store.get_logs(
        start_date=start_date,
        end_date=end_date,
        category=category,
        priority=priority,
        limit=limit
    )
    
    return jsonify({
        "success": True,
        "count": len(logs),
        "data": logs
    })


@app.route('/api/logs/export', methods=['GET'])
def export_logs():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    priority = request.args.get('priority')
    
    filters = {}
    if start_date:
        filters['start_date'] = start_date
    if end_date:
        filters['end_date'] = end_date
    if category:
        filters['category'] = category
    if priority:
        filters['priority'] = priority
    
    csv_bytes = data_store.generate_logs_csv_bytes(filters if filters else None)
    
    if not csv_bytes:
        return jsonify({"error": "没有可导出的数据"}), 400
    
    return Response(
        csv_bytes,
        mimetype='text/csv; charset=utf-8',
        headers={
            'Content-Disposition': 'attachment; filename="classification_logs.csv"'
        }
    )


@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    stats = data_store.get_statistics(start_date=start_date, end_date=end_date)
    
    return jsonify({
        "success": True,
        "data": stats
    })


@app.route('/api/report', methods=['GET'])
def get_report():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    stats = data_store.get_statistics(start_date=start_date, end_date=end_date)
    
    report_lines = []
    report_lines.append("# 邮件处理统计报告")
    report_lines.append("=" * 50)
    report_lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"统计范围: {start_date or '开始'} 至 {end_date or '至今'}")
    report_lines.append("")
    report_lines.append("## 总体统计")
    report_lines.append(f"- 总邮件数: {stats['total_emails']}")
    report_lines.append(f"- 高优先级邮件: {stats['high_priority_count']} ({stats['high_priority_ratio']}%)")
    report_lines.append(f"- 负面情绪邮件: {stats['negative_sentiment_count']} ({stats['negative_sentiment_ratio']}%)")
    report_lines.append("")
    report_lines.append("## 按类别统计")
    for cat, count in stats['by_category'].items():
        rt = stats['avg_response_time'].get(cat, '24小时内')
        report_lines.append(f"- {cat}: {count} 封 (建议响应时间: {rt})")
    report_lines.append("")
    report_lines.append("## 按优先级统计")
    for pri, count in stats['by_priority'].items():
        report_lines.append(f"- {pri}优先级: {count} 封")
    report_lines.append("")
    report_lines.append("## 按情绪统计")
    for sent, count in stats['by_sentiment'].items():
        report_lines.append(f"- {sent}: {count} 封")
    
    report_text = "\n".join(report_lines)
    
    return Response(
        report_text,
        mimetype='text/plain; charset=utf-8',
        headers={
            'Content-Disposition': 'attachment; filename="email_report.txt"'
        }
    )


@app.route('/api/train', methods=['POST'])
def train_classifier():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求数据为空"}), 400
    
    category = data.get('category', '').strip()
    examples = data.get('examples', [])
    
    if not category:
        return jsonify({"error": "分类标签不能为空"}), 400
    
    if not examples or not isinstance(examples, list):
        return jsonify({"error": "请提供示例邮件列表"}), 400
    
    success = classifier.train_from_examples(category, examples)
    
    if success:
        return jsonify({
            "success": True,
            "message": f"已成功为「{category}」分类添加了新的关键词权重"
        })
    else:
        return jsonify({"error": "训练失败，请提供更多有意义的示例"}), 400


@app.route('/api/keywords', methods=['POST'])
def add_keywords():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求数据为空"}), 400
    
    category = data.get('category', '').strip()
    keywords = data.get('keywords', [])
    weight = float(data.get('weight', 1.0))
    
    if not category:
        return jsonify({"error": "分类标签不能为空"}), 400
    
    if not keywords or not isinstance(keywords, list):
        return jsonify({"error": "请提供关键词列表"}), 400
    
    success = classifier.save_custom_keywords(category, keywords, weight)
    
    if success:
        return jsonify({
            "success": True,
            "message": f"已成功为「{category}」分类添加关键词"
        })
    else:
        return jsonify({"error": "保存关键词失败"}), 500


@app.route('/api/keywords', methods=['GET'])
def get_keywords():
    return jsonify({
        "success": True,
        "data": classifier.category_keywords
    })


@app.route('/api/webhook/config', methods=['GET'])
def get_webhook_config():
    config = data_store.get_webhook_config()
    return jsonify({
        "success": True,
        "data": config
    })


@app.route('/api/webhook/config', methods=['POST'])
def save_webhook_config():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求数据为空"}), 400
    
    platform = data.get('platform', '').strip()
    url = data.get('url', '').strip()
    enabled = data.get('enabled', True)
    
    if not platform:
        return jsonify({"error": "平台名称不能为空"}), 400
    
    if not url:
        return jsonify({"error": "Webhook URL不能为空"}), 400
    
    success = data_store.save_webhook_config(platform, url, enabled)
    
    if success:
        return jsonify({
            "success": True,
            "message": "Webhook配置已保存"
        })
    else:
        return jsonify({"error": "保存配置失败"}), 500


@app.route('/api/webhook/test', methods=['POST'])
def test_webhook():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求数据为空"}), 400
    
    platform = data.get('platform', 'dingtalk')
    url = data.get('url', '')
    
    if not url:
        webhook_config = data_store.get_webhook_config()
        platform_config = webhook_config.get(platform, {})
        url = platform_config.get('url', '')
    
    if not url:
        return jsonify({"error": "Webhook URL不能为空"}), 400
    
    test_data = {
        "email_id": "test_" + str(uuid.uuid4()),
        "summary": "这是一条测试消息，用于验证Webhook配置是否正常工作。",
        "category": "测试",
        "priority": "高",
        "sentiment": "中性",
        "content": "您好！这是一条测试邮件内容，用于验证Webhook通知功能是否正常工作。",
        "category_explanation": "测试消息",
        "priority_explanation": "测试消息",
        "suggested_response_time": "立即",
        "created_at": datetime.now().isoformat()
    }
    
    if platform == 'dingtalk':
        ok, msg = webhook_notifier.send_dingtalk(url, test_data)
    else:
        ok, msg = webhook_notifier.send_generic(url, test_data, platform)
    
    if ok:
        return jsonify({
            "success": True,
            "message": "Webhook测试成功！请检查目标平台是否收到消息。"
        })
    else:
        return jsonify({"error": f"Webhook测试失败: {msg}"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
