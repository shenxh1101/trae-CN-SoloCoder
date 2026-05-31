from typing import Optional, Dict
from data.knowledge_repository import KnowledgeRepository

class VoteService:
    def __init__(self):
        self.knowledge_repo = KnowledgeRepository()

    def submit_vote(self, entry_id: str, vote: str) -> Optional[Dict]:
        is_helpful = vote == "helpful"
        updated_entry = self.knowledge_repo.update_vote_count(entry_id, is_helpful)
        return updated_entry

    def get_vote_stats(self, entry_id: str) -> Optional[Dict]:
        entry = self.knowledge_repo.get_entry_by_id(entry_id)
        if not entry:
            return None
        
        helpful = entry.get("helpful_count", 0)
        not_helpful = entry.get("not_helpful_count", 0)
        total = helpful + not_helpful
        
        return {
            "entry_id": entry_id,
            "helpful_count": helpful,
            "not_helpful_count": not_helpful,
            "total_votes": total,
            "helpful_rate": helpful / total if total > 0 else 0,
            "current_weight": entry.get("weight", 1.0)
        }
