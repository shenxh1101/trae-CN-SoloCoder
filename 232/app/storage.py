import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from .models import Roadmap


class LocalStorage:
    def __init__(self, base_dir: str = "data"):
        self.base_dir = base_dir
        self._ensure_dirs()
    
    def _ensure_dirs(self):
        dirs = [
            self.base_dir,
            os.path.join(self.base_dir, "roadmaps"),
            os.path.join(self.base_dir, "feedback"),
            os.path.join(self.base_dir, "skill_trees"),
            os.path.join(self.base_dir, "progress")
        ]
        for d in dirs:
            if not os.path.exists(d):
                os.makedirs(d, exist_ok=True)
    
    def _get_file_path(self, category: str, filename: str) -> str:
        return os.path.join(self.base_dir, category, filename)
    
    def save_roadmap(self, roadmap: Roadmap) -> str:
        filename = f"{roadmap.skill.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        filepath = self._get_file_path("roadmaps", filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(roadmap.to_dict(), f, ensure_ascii=False, indent=2)
        return filepath
    
    def load_roadmap(self, filename: str) -> Optional[Roadmap]:
        filepath = self._get_file_path("roadmaps", filename)
        if not os.path.exists(filepath):
            return None
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return Roadmap.from_dict(data)
    
    def list_roadmaps(self) -> List[str]:
        roadmaps_dir = os.path.join(self.base_dir, "roadmaps")
        return [f for f in os.listdir(roadmaps_dir) if f.endswith('.json')]
    
    def save_feedback(self, skill: str, phase_id: str, resource_name: str, feedback_type: str) -> str:
        filename = f"{skill.lower().replace(' ', '_')}_feedback.json"
        filepath = self._get_file_path("feedback", filename)
        
        feedback_data = self._load_json(filepath, default={"skill": skill, "feedback": []})
        
        feedback_entry = {
            "phase_id": phase_id,
            "resource_name": resource_name,
            "type": feedback_type,
            "timestamp": datetime.now().isoformat()
        }
        feedback_data["feedback"].append(feedback_entry)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(feedback_data, f, ensure_ascii=False, indent=2)
        
        return filepath
    
    def remove_feedback(self, skill: str, phase_id: str, resource_name: str, feedback_type: str) -> bool:
        filename = f"{skill.lower().replace(' ', '_')}_feedback.json"
        filepath = self._get_file_path("feedback", filename)
        
        feedback_data = self._load_json(filepath, default={"skill": skill, "feedback": []})
        
        original_len = len(feedback_data["feedback"])
        feedback_data["feedback"] = [
            entry for entry in feedback_data["feedback"]
            if not (entry.get("phase_id") == phase_id and 
                    entry.get("resource_name") == resource_name and 
                    entry.get("type") == feedback_type)
        ]
        
        removed = len(feedback_data["feedback"]) < original_len
        if removed:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(feedback_data, f, ensure_ascii=False, indent=2)
        
        return removed
    
    def get_feedback_for_skill(self, skill: str) -> Dict[str, Any]:
        filename = f"{skill.lower().replace(' ', '_')}_feedback.json"
        filepath = self._get_file_path("feedback", filename)
        return self._load_json(filepath, default={"skill": skill, "feedback": []})
    
    def get_resource_rating(self, skill: str, resource_name: str) -> Dict[str, int]:
        feedback = self.get_feedback_for_skill(skill)
        upvotes = 0
        downvotes = 0
        for entry in feedback.get("feedback", []):
            if entry["resource_name"] == resource_name:
                if entry["type"] == "upvote":
                    upvotes += 1
                elif entry["type"] == "downvote":
                    downvotes += 1
        return {"upvotes": upvotes, "downvotes": downvotes, "rating": upvotes - downvotes}
    
    def save_skill_tree(self, user_id: str, skill_tree: Dict[str, Any]) -> str:
        filename = f"{user_id}_skill_tree.json"
        filepath = self._get_file_path("skill_trees", filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(skill_tree, f, ensure_ascii=False, indent=2)
        return filepath
    
    def load_skill_tree(self, user_id: str) -> Optional[Dict[str, Any]]:
        filename = f"{user_id}_skill_tree.json"
        filepath = self._get_file_path("skill_trees", filename)
        if not os.path.exists(filepath):
            return None
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def get_mastered_skills(self, user_id: str) -> List[str]:
        skill_tree = self.load_skill_tree(user_id)
        if not skill_tree:
            return []
        mastered = []
        self._extract_mastered_skills(skill_tree, mastered)
        return mastered
    
    def _extract_mastered_skills(self, node: Dict[str, Any], result: List[str], prefix: str = ""):
        skill_name = node.get("name", "")
        if node.get("mastered", False):
            full_name = f"{prefix} {skill_name}".strip() if prefix else skill_name
            result.append(full_name)
        
        for child in node.get("children", []):
            new_prefix = f"{prefix} {skill_name}".strip() if prefix else skill_name
            self._extract_mastered_skills(child, result, new_prefix)
    
    def save_progress(self, user_id: str, skill: str, completed_phases: List[str]) -> str:
        filename = f"{user_id}_{skill.lower().replace(' ', '_')}_progress.json"
        filepath = self._get_file_path("progress", filename)
        data = {
            "user_id": user_id,
            "skill": skill,
            "completed_phases": completed_phases,
            "updated_at": datetime.now().isoformat()
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return filepath
    
    def load_progress(self, user_id: str, skill: str) -> Optional[Dict[str, Any]]:
        filename = f"{user_id}_{skill.lower().replace(' ', '_')}_progress.json"
        filepath = self._get_file_path("progress", filename)
        if not os.path.exists(filepath):
            return None
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _load_json(self, filepath: str, default: Any = None) -> Any:
        if not os.path.exists(filepath):
            return default
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
