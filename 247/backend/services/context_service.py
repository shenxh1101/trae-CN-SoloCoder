from typing import List, Optional, Dict
import re
from data.conversation_repository import ConversationRepository

LABOR_LAW_KEYWORDS = [
    "试用期", "工资", "拖欠", "加班费", "加班", "辞退", "开除", "解雇",
    "合同", "劳动合同", "社保", "工伤保险", "工伤", "赔偿", "经济补偿",
    "年假", "病假", "产假", "婚假", "离职", "辞职", "仲裁", "劳动仲裁",
    "保险", "福利", "奖金", "绩效", "调岗", "降薪", "双倍工资",
    "违法解除", "竞业限制", "保密协议", "培训费", "服务期",
    "节假日", "工时", "最低工资", "生育", "医疗期", "停工留薪"
]

class ContextService:
    def __init__(self):
        self.conversation_repo = ConversationRepository()

    def get_or_create_conversation(self, session_id: Optional[str], title: str) -> Dict:
        if session_id:
            conv = self.conversation_repo.get_conversation_by_id(session_id)
            if conv:
                return conv
        return self.conversation_repo.create_conversation(title)

    def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        return self.conversation_repo.get_conversation_by_id(conversation_id)

    def get_all_conversations(self) -> List[Dict]:
        return self.conversation_repo.get_all_conversations()

    def add_user_message(self, conversation_id: str, content: str) -> Optional[Dict]:
        return self.conversation_repo.add_message(
            conversation_id,
            {"role": "user", "content": content}
        )

    def add_assistant_message(self, conversation_id: str, content: str,
                              legal_references: Optional[List[str]] = None,
                              urgency_level: Optional[str] = None,
                              urgency_reason: Optional[str] = None,
                              recommend_lawyer: bool = False,
                              matched_entry_id: Optional[str] = None) -> Optional[Dict]:
        message = {
            "role": "assistant",
            "content": content,
            "legal_references": legal_references or [],
            "urgency_level": urgency_level,
            "urgency_reason": urgency_reason,
            "recommend_lawyer": recommend_lawyer,
            "matched_entry_id": matched_entry_id
        }
        return self.conversation_repo.add_message(conversation_id, message)

    def get_context(self, conversation_id: str, limit: int = 10) -> List[Dict]:
        return self.conversation_repo.get_conversation_context(conversation_id, limit)

    def get_full_context(self, conversation_id: str) -> List[Dict]:
        conv = self.get_conversation(conversation_id)
        if not conv:
            return []
        return conv.get("messages", [])

    def build_enhanced_context(self, conversation_id: str, current_question: str) -> Dict:
        full_messages = self.get_full_context(conversation_id)
        if not full_messages:
            return {
                "context_messages": [],
                "topic_keywords": [],
                "summary": "",
                "enhanced_question": current_question
            }

        topic_keywords = self._extract_all_topic_keywords(full_messages)
        relevant_history = self._retrieve_relevant_history(full_messages, current_question, topic_keywords)
        summary = self._build_topic_summary(full_messages, topic_keywords)
        enhanced_question = self._build_enhanced_question(current_question, topic_keywords, summary)

        return {
            "context_messages": relevant_history,
            "topic_keywords": topic_keywords,
            "summary": summary,
            "enhanced_question": enhanced_question
        }

    def _extract_all_topic_keywords(self, messages: List[Dict]) -> List[str]:
        keywords = []
        for msg in messages:
            if msg["role"] == "user":
                content = msg["content"]
                for word in LABOR_LAW_KEYWORDS:
                    if word in content and word not in keywords:
                        keywords.append(word)
        return keywords

    def _retrieve_relevant_history(self, messages: List[Dict], current_question: str, topic_keywords: List[str]) -> List[Dict]:
        if not messages:
            return []

        relevant = []
        for msg in messages:
            content = msg.get("content", "")
            score = 0
            for kw in topic_keywords:
                if kw in content:
                    score += 1
            for kw in topic_keywords:
                if kw in current_question:
                    if kw in content:
                        score += 2
            msg["_relevance"] = score
            relevant.append(msg)

        relevant.sort(key=lambda x: x.get("_relevance", 0), reverse=True)

        selected = [m for m in relevant if m.get("_relevance", 0) > 0][:8]

        selected.sort(key=lambda x: messages.index(x))

        result = []
        for m in selected:
            clean_m = {k: v for k, v in m.items() if k != "_relevance"}
            result.append(clean_m)

        if len(result) < 3:
            recent = messages[-3:]
            for m in recent:
                clean_m = {k: v for k, v in m.items() if k != "_relevance"}
                if clean_m not in result:
                    result.append(clean_m)
            result.sort(key=lambda x: messages.index(
                next((om for om in messages if om.get("id") == x.get("id")), messages[0])
            ))

        return result

    def _build_topic_summary(self, messages: List[Dict], topic_keywords: List[str]) -> str:
        if not topic_keywords:
            return ""

        user_messages = [m for m in messages if m["role"] == "user"]
        if not user_messages:
            return ""

        summary_parts = []
        for msg in user_messages:
            content = msg["content"]
            has_keyword = any(kw in content for kw in topic_keywords)
            if has_keyword:
                summary_parts.append(f"用户曾询问: {content[:100]}")

        if not summary_parts:
            summary_parts.append(f"用户曾询问: {user_messages[0]['content'][:100]}")

        return "; ".join(summary_parts[:5])

    def _build_enhanced_question(self, question: str, topic_keywords: List[str], summary: str) -> str:
        parts = [question]

        if topic_keywords:
            parts.append("相关话题: " + " ".join(topic_keywords[:8]))

        if summary:
            parts.append("对话背景: " + summary)

        return " ".join(parts)

    def get_topic_keywords(self, conversation_id: str) -> List[str]:
        full_context = self.get_full_context(conversation_id)
        return self._extract_all_topic_keywords(full_context)

    def build_context_summary(self, conversation_id: str, max_chars: int = 2000) -> str:
        full_context = self.get_full_context(conversation_id)
        if not full_context:
            return ""

        summary_parts = []
        total_chars = 0

        for msg in reversed(full_context):
            role = "用户" if msg["role"] == "user" else "律师"
            content = msg["content"]

            if total_chars + len(content) > max_chars and summary_parts:
                break

            summary_parts.insert(0, f"{role}：{content}")
            total_chars += len(content)

        return "\n".join(summary_parts)

    def delete_conversation(self, conversation_id: str) -> bool:
        return self.conversation_repo.delete_conversation(conversation_id)
