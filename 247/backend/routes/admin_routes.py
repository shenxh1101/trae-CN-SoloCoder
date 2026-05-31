from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.auth_service import AuthService
from services.knowledge_service import KnowledgeService
from services.backup_service import BackupService
from services.vote_service import VoteService
from data.missed_question_repository import MissedQuestionRepository
from data.conversation_repository import ConversationRepository
from data.knowledge_repository import KnowledgeRepository

admin_bp = Blueprint('admin', __name__)

auth_service = AuthService()
knowledge_service = KnowledgeService()
backup_service = BackupService()
vote_service = VoteService()
missed_question_repo = MissedQuestionRepository()
conversation_repo = ConversationRepository()
knowledge_repo = KnowledgeRepository()

@admin_bp.route('/api/admin/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')
    
    result = auth_service.login(username, password)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 401

@admin_bp.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def get_stats():
    conversations = conversation_repo.get_all_conversations()
    knowledge_entries = knowledge_repo.get_all_entries()
    missed_stats = missed_question_repo.get_stats()
    
    total_messages = sum(len(conv["messages"]) for conv in conversations)
    total_helpful = sum(entry.get("helpful_count", 0) for entry in knowledge_entries)
    total_not_helpful = sum(entry.get("not_helpful_count", 0) for entry in knowledge_entries)
    
    matched_count = 0
    for conv in conversations:
        for msg in conv["messages"]:
            if msg["role"] == "assistant" and msg.get("matched_entry_id"):
                matched_count += 1
    
    total_assistant_messages = sum(
        1 for conv in conversations 
        for msg in conv["messages"] 
        if msg["role"] == "assistant"
    )
    
    match_rate = matched_count / total_assistant_messages if total_assistant_messages > 0 else 0
    helpful_rate = total_helpful / (total_helpful + total_not_helpful) if (total_helpful + total_not_helpful) > 0 else 0
    
    return jsonify({
        "success": True,
        "data": {
            "total_conversations": len(conversations),
            "total_messages": total_messages,
            "total_knowledge_entries": len(knowledge_entries),
            "total_votes": total_helpful + total_not_helpful,
            "helpful_rate": helpful_rate,
            "match_rate": match_rate,
            "missed_questions": missed_stats
        }
    })

@admin_bp.route('/api/admin/missed', methods=['GET'])
@jwt_required()
def get_missed_questions():
    limit = request.args.get('limit', 100, type=int)
    questions = missed_question_repo.get_all(limit=limit)
    return jsonify({
        "success": True,
        "data": questions
    })

@admin_bp.route('/api/admin/missed/<missedId>', methods=['DELETE'])
@jwt_required()
def delete_missed_question(missedId):
    success = missed_question_repo.delete(missedId)
    if not success:
        return jsonify({"success": False, "message": "记录不存在"}), 404
    return jsonify({"success": True, "message": "删除成功"})

@admin_bp.route('/api/admin/knowledge', methods=['GET'])
@jwt_required()
def get_knowledge_entries():
    keyword = request.args.get('keyword', '')
    if keyword:
        entries = knowledge_service.search_entries(keyword)
    else:
        entries = knowledge_service.get_all_entries()
    
    return jsonify({
        "success": True,
        "data": entries
    })

@admin_bp.route('/api/admin/knowledge', methods=['POST'])
@jwt_required()
def add_knowledge_entry():
    data = request.get_json()
    
    required_fields = ['question', 'answer_points']
    for field in required_fields:
        if field not in data:
            return jsonify({"success": False, "message": f"缺少必填字段: {field}"}), 400
    
    new_entry = knowledge_service.add_entry(data)
    return jsonify({
        "success": True,
        "message": "添加成功",
        "data": new_entry
    }), 201

@admin_bp.route('/api/admin/knowledge/<entryId>', methods=['PUT'])
@jwt_required()
def update_knowledge_entry(entryId):
    data = request.get_json()
    updated = knowledge_service.update_entry(entryId, data)
    if not updated:
        return jsonify({"success": False, "message": "条目不存在"}), 404
    return jsonify({
        "success": True,
        "message": "更新成功",
        "data": updated
    })

@admin_bp.route('/api/admin/knowledge/<entryId>', methods=['DELETE'])
@jwt_required()
def delete_knowledge_entry(entryId):
    success = knowledge_service.delete_entry(entryId)
    if not success:
        return jsonify({"success": False, "message": "条目不存在"}), 404
    return jsonify({"success": True, "message": "删除成功"})

@admin_bp.route('/api/admin/knowledge/from-missed', methods=['POST'])
@jwt_required()
def add_from_missed():
    data = request.get_json()
    missed_id = data.get('missedId')
    
    missed_questions = missed_question_repo.get_all()
    missed = next((mq for mq in missed_questions if mq["id"] == missed_id), None)
    
    if not missed:
        return jsonify({"success": False, "message": "未命中问题不存在"}), 404
    
    entry_data = {
        "question": missed["question"],
        "keywords": data.get("keywords", []),
        "answer_points": data.get("answer_points", []),
        "legal_references": data.get("legal_references", []),
        "category": data.get("category", "未分类"),
        "weight": 1.0
    }
    
    new_entry = knowledge_service.add_entry(entry_data)
    missed_question_repo.delete(missed_id)
    
    return jsonify({
        "success": True,
        "message": "添加成功",
        "data": new_entry
    }), 201

@admin_bp.route('/api/admin/backup', methods=['POST'])
@jwt_required()
def create_backup():
    result = backup_service.create_backup()
    if result["success"]:
        return jsonify(result)
    return jsonify(result), 500

@admin_bp.route('/api/admin/backups', methods=['GET'])
@jwt_required()
def list_backups():
    backups = backup_service.list_backups()
    return jsonify({
        "success": True,
        "data": backups
    })

@admin_bp.route('/api/admin/backups/<filename>/restore', methods=['POST'])
@jwt_required()
def restore_backup(filename):
    result = backup_service.restore_backup(filename)
    if result["success"]:
        return jsonify(result)
    return jsonify(result), 400

@admin_bp.route('/api/admin/backups/<filename>', methods=['DELETE'])
@jwt_required()
def delete_backup(filename):
    result = backup_service.delete_backup(filename)
    if result["success"]:
        return jsonify(result)
    return jsonify(result), 400

@admin_bp.route('/api/admin/vote-stats/<entryId>', methods=['GET'])
@jwt_required()
def get_vote_stats(entryId):
    stats = vote_service.get_vote_stats(entryId)
    if not stats:
        return jsonify({"success": False, "message": "条目不存在"}), 404
    return jsonify({
        "success": True,
        "data": stats
    })
