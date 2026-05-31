from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from services.knowledge_service import KnowledgeService
from services.llm_service import LLMService
from services.context_service import ContextService
from services.urgency_service import UrgencyService
from services.vote_service import VoteService
from services.export_service import ExportService
from data.missed_question_repository import MissedQuestionRepository

chat_bp = Blueprint('chat', __name__)

knowledge_service = KnowledgeService()
llm_service = LLMService()
context_service = ContextService()
urgency_service = UrgencyService()
vote_service = VoteService()
export_service = ExportService()
missed_question_repo = MissedQuestionRepository()

@chat_bp.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    question = data.get('question', '').strip()
    style = data.get('style', 'simple')
    session_id = data.get('sessionId')

    if not question:
        return jsonify({"success": False, "message": "问题不能为空"}), 400

    conversation = context_service.get_or_create_conversation(session_id, question)
    context_service.add_user_message(conversation["id"], question)

    enhanced = context_service.build_enhanced_context(conversation["id"], question)
    context = enhanced["context_messages"]
    enhanced_question = enhanced["enhanced_question"]

    matched_entry, score = knowledge_service.match_knowledge(enhanced_question)

    if not matched_entry:
        missed_question_repo.add_or_update(question)
        answer = "抱歉，我暂时无法回答您的这个问题。请尝试换一种问法，或者咨询其他劳动法律相关问题。您的问题已被记录，管理员会尽快补充相关知识。"
        urgency_level, urgency_reason, recommend_lawyer = urgency_service.assess_urgency(question)
        legal_references = []
        matched_entry_id = None
    else:
        answer = llm_service.generate_answer(question, matched_entry, style, context)
        urgency_level, urgency_reason, recommend_lawyer = urgency_service.assess_urgency(question)
        legal_references = matched_entry.get("legal_references", [])
        matched_entry_id = matched_entry["id"]

    assistant_msg = context_service.add_assistant_message(
        conversation["id"],
        answer,
        legal_references=legal_references,
        urgency_level=urgency_level,
        urgency_reason=urgency_reason,
        recommend_lawyer=recommend_lawyer,
        matched_entry_id=matched_entry_id
    )

    return jsonify({
        "success": True,
        "data": {
            "conversationId": conversation["id"],
            "messageId": assistant_msg["id"],
            "answer": answer,
            "legal_references": legal_references,
            "urgency_level": urgency_level,
            "urgency_reason": urgency_reason,
            "recommend_lawyer": recommend_lawyer,
            "matched_entry_id": matched_entry_id,
            "matched_score": score
        }
    })

@chat_bp.route('/api/chat/<sessionId>/followup', methods=['POST'])
def followup(sessionId):
    data = request.get_json()
    question = data.get('question', '').strip()
    style = data.get('style', 'simple')

    if not question:
        return jsonify({"success": False, "message": "问题不能为空"}), 400

    conversation = context_service.get_conversation(sessionId)
    if not conversation:
        return jsonify({"success": False, "message": "会话不存在"}), 404

    context_service.add_user_message(sessionId, question)

    enhanced = context_service.build_enhanced_context(sessionId, question)
    context = enhanced["context_messages"]
    enhanced_question = enhanced["enhanced_question"]

    matched_entry, score = knowledge_service.match_knowledge(enhanced_question)

    if not matched_entry:
        missed_question_repo.add_or_update(question)
        answer = "抱歉，我暂时无法回答您的这个问题。请尝试换一种问法，或者咨询其他劳动法律相关问题。"
        urgency_level, urgency_reason, recommend_lawyer = urgency_service.assess_urgency(question)
        legal_references = []
        matched_entry_id = None
    else:
        answer = llm_service.generate_answer(question, matched_entry, style, context)
        urgency_level, urgency_reason, recommend_lawyer = urgency_service.assess_urgency(question)
        legal_references = matched_entry.get("legal_references", [])
        matched_entry_id = matched_entry["id"]

    assistant_msg = context_service.add_assistant_message(
        sessionId,
        answer,
        legal_references=legal_references,
        urgency_level=urgency_level,
        urgency_reason=urgency_reason,
        recommend_lawyer=recommend_lawyer,
        matched_entry_id=matched_entry_id
    )

    return jsonify({
        "success": True,
        "data": {
            "conversationId": sessionId,
            "messageId": assistant_msg["id"],
            "answer": answer,
            "legal_references": legal_references,
            "urgency_level": urgency_level,
            "urgency_reason": urgency_reason,
            "recommend_lawyer": recommend_lawyer,
            "matched_entry_id": matched_entry_id,
            "matched_score": score
        }
    })

@chat_bp.route('/api/vote', methods=['POST'])
def vote():
    data = request.get_json()
    entry_id = data.get('entryId')
    vote = data.get('vote')
    message_id = data.get('messageId')
    conversation_id = data.get('conversationId')
    
    if not entry_id or not vote:
        return jsonify({"success": False, "message": "参数不完整"}), 400
    
    if vote not in ['helpful', 'not_helpful']:
        return jsonify({"success": False, "message": "无效的投票类型"}), 400
    
    updated_entry = vote_service.submit_vote(entry_id, vote)
    
    if not updated_entry:
        return jsonify({"success": False, "message": "知识库条目不存在"}), 404
    
    helpful = updated_entry.get("helpful_count", 0)
    not_helpful = updated_entry.get("not_helpful_count", 0)
    total = helpful + not_helpful
    helpful_rate = helpful / total if total > 0 else 0
    
    return jsonify({
        "success": True,
        "message": "投票成功",
        "data": {
            "entry_id": entry_id,
            "message_id": message_id,
            "conversation_id": conversation_id,
            "helpful_count": helpful,
            "not_helpful_count": not_helpful,
            "total_votes": total,
            "helpful_rate": helpful_rate,
            "current_weight": updated_entry["weight"],
            "weight_change": "+0.01" if vote == "helpful" else "-0.01"
        }
    })

@chat_bp.route('/api/export/<sessionId>', methods=['GET'])
def export(sessionId):
    content = export_service.export_to_text(sessionId)
    if not content:
        return jsonify({"success": False, "message": "会话不存在"}), 404
    
    filename = export_service.get_export_filename(sessionId)
    
    return Response(
        content.encode('utf-8'),
        mimetype='text/plain; charset=utf-8',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
    )

@chat_bp.route('/api/conversations', methods=['GET'])
def get_conversations():
    conversations = context_service.get_all_conversations()
    result = [{
        "id": conv["id"],
        "title": conv["title"],
        "message_count": len(conv["messages"]),
        "created_at": conv["created_at"],
        "updated_at": conv["updated_at"]
    } for conv in conversations]
    
    return jsonify({
        "success": True,
        "data": result
    })

@chat_bp.route('/api/conversations/<sessionId>', methods=['GET'])
def get_conversation(sessionId):
    conversation = context_service.get_conversation(sessionId)
    if not conversation:
        return jsonify({"success": False, "message": "会话不存在"}), 404
    
    return jsonify({
        "success": True,
        "data": conversation
    })

@chat_bp.route('/api/conversations/<sessionId>', methods=['DELETE'])
def delete_conversation(sessionId):
    success = context_service.delete_conversation(sessionId)
    if not success:
        return jsonify({"success": False, "message": "会话不存在"}), 404
    
    return jsonify({
        "success": True,
        "message": "删除成功"
    })
