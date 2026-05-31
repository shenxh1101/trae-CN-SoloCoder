from typing import Optional
from data.conversation_repository import ConversationRepository

class ExportService:
    def __init__(self):
        self.conversation_repo = ConversationRepository()

    def export_to_text(self, conversation_id: str) -> Optional[str]:
        conv = self.conversation_repo.get_conversation_by_id(conversation_id)
        if not conv:
            return None
        
        lines = []
        lines.append("=" * 60)
        lines.append("AI法律咨询对话记录")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"对话主题：{conv['title']}")
        lines.append(f"创建时间：{conv['created_at']}")
        lines.append(f"最后更新：{conv['updated_at']}")
        lines.append(f"对话ID：{conv['id']}")
        lines.append("")
        lines.append("-" * 60)
        lines.append("")
        
        for msg in conv["messages"]:
            role = "用户" if msg["role"] == "user" else "AI法律顾问"
            lines.append(f"【{role}】")
            lines.append(msg["content"])
            lines.append("")
            
            if msg["role"] == "assistant":
                if msg.get("legal_references"):
                    lines.append("法律依据：")
                    for ref in msg["legal_references"]:
                        lines.append(f"  - {ref}")
                    lines.append("")
                
                if msg.get("urgency_level"):
                    urgency_map = {
                        "low": "低",
                        "medium": "中",
                        "high": "高"
                    }
                    lines.append(f"紧急程度：{urgency_map.get(msg['urgency_level'], msg['urgency_level'])}")
                    if msg.get("urgency_reason"):
                        lines.append(f"说明：{msg['urgency_reason']}")
                    lines.append("")
                
                if msg.get("recommend_lawyer"):
                    lines.append("⚠️  建议：本问题涉及紧急法律事务，建议立即联系专业律师。")
                    lines.append("")
            
            lines.append("-" * 40)
            lines.append("")
        
        lines.append("")
        lines.append("=" * 60)
        lines.append("免责声明：本咨询意见仅供参考，不构成正式法律意见。")
        lines.append("具体法律问题请咨询专业律师。")
        lines.append("=" * 60)
        
        return "\n".join(lines)

    def get_export_filename(self, conversation_id: str) -> str:
        conv = self.conversation_repo.get_conversation_by_id(conversation_id)
        if not conv:
            return f"consultation_{conversation_id}.txt"
        safe_title = "".join(c for c in conv["title"][:20] if c.isalnum() or c in (" ", "-", "_"))
        return f"法律咨询记录_{safe_title}_{conversation_id}.txt"
