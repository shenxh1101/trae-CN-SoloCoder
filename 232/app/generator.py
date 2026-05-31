from typing import Dict, Any, Optional, List
from datetime import datetime
from .models import Roadmap, Phase, Resource
from .llm_client import LLMClient
from .storage import LocalStorage


class RoadmapGenerator:
    def __init__(self, storage: Optional[LocalStorage] = None, llm_client: Optional[LLMClient] = None):
        self.storage = storage or LocalStorage()
        self.llm_client = llm_client or LLMClient()
    
    def generate(self, skill: str, time_budget: Optional[Dict[str, Any]] = None,
                user_id: Optional[str] = None) -> Roadmap:
        mastered_skills = []
        skill_tree = None
        if user_id:
            mastered_skills = self.storage.get_mastered_skills(user_id)
            skill_tree = self.storage.load_skill_tree(user_id)
        
        llm_data = self.llm_client.generate_roadmap(skill, time_budget, mastered_skills)
        
        roadmap = self._build_roadmap_from_llm_data(llm_data, skill, time_budget, skill_tree)
        
        roadmap = self._apply_feedback_ratings(roadmap)
        
        if user_id:
            progress = self.storage.load_progress(user_id, skill)
            if progress:
                roadmap = self._apply_progress(roadmap, progress)
        
        return roadmap
    
    def generate_batch(self, skills: List[str], time_budget: Optional[Dict[str, Any]] = None,
                      user_id: Optional[str] = None) -> List[Roadmap]:
        roadmaps = []
        for skill in skills:
            roadmap = self.generate(skill, time_budget, user_id)
            roadmaps.append(roadmap)
        return roadmaps
    
    def compare_roadmaps(self, roadmaps: List[Roadmap]) -> Dict[str, Any]:
        comparison = {
            "total_roadmaps": len(roadmaps),
            "roadmaps": [],
            "summary": {
                "min_hours": float('inf'),
                "max_hours": 0.0,
                "avg_hours": 0.0,
                "min_difficulty": 5,
                "max_difficulty": 0,
                "avg_difficulty": 0.0
            }
        }
        
        total_hours = 0
        total_difficulty = 0
        
        for roadmap in roadmaps:
            total = roadmap.calculate_total_hours()
            diff = roadmap.difficulty
            completion = roadmap.get_completed_percentage()
            
            comparison["roadmaps"].append({
                "skill": roadmap.skill,
                "total_hours": total,
                "difficulty": diff,
                "completion_percentage": completion,
                "phases_count": len(roadmap.phases),
                "remaining_hours": roadmap.get_remaining_hours()
            })
            
            total_hours += total
            total_difficulty += diff
            
            if total < comparison["summary"]["min_hours"]:
                comparison["summary"]["min_hours"] = total
            if total > comparison["summary"]["max_hours"]:
                comparison["summary"]["max_hours"] = total
            if diff < comparison["summary"]["min_difficulty"]:
                comparison["summary"]["min_difficulty"] = diff
            if diff > comparison["summary"]["max_difficulty"]:
                comparison["summary"]["max_difficulty"] = diff
        
        if roadmaps:
            comparison["summary"]["avg_hours"] = round(total_hours / len(roadmaps), 1)
            comparison["summary"]["avg_difficulty"] = round(total_difficulty / len(roadmaps), 1)
        
        comparison["summary"]["min_hours"] = comparison["summary"]["min_hours"] if comparison["summary"]["min_hours"] != float('inf') else 0
        
        return comparison
    
    def adjust_for_progress(self, roadmap: Roadmap, completed_phase_ids: List[str]) -> Roadmap:
        for phase_id in completed_phase_ids:
            roadmap.mark_phase_completed(phase_id)
        
        roadmap = self._adjust_remaining_schedule(roadmap)
        
        return roadmap
    
    def adjust_time_budget(self, roadmap: Roadmap, time_budget: Dict[str, Any]) -> Roadmap:
        if not time_budget:
            return roadmap
        
        daily_hours = time_budget.get("daily_hours", 2)
        total_days = time_budget.get("total_days", 90)
        
        total_available = daily_hours * total_days
        original_total = sum(p.estimated_hours for p in roadmap.phases if not p.completed)
        
        if original_total <= 0:
            return roadmap
        
        ratio = total_available / original_total
        
        for phase in roadmap.phases:
            if not phase.completed:
                original = phase.estimated_hours
                phase.estimated_hours = round(original * ratio, 1)
                phase.notes = f"根据时间预算调整，原{original}小时"
        
        roadmap.time_budget = time_budget
        roadmap.calculate_total_hours()
        
        return roadmap
    
    def _adjust_remaining_schedule(self, roadmap: Roadmap) -> Roadmap:
        remaining_phases = [p for p in roadmap.phases if not p.completed]
        if not remaining_phases:
            return roadmap
        
        total_remaining = sum(p.estimated_hours for p in remaining_phases)
        
        if roadmap.time_budget:
            daily_hours = roadmap.time_budget.get("daily_hours", 2)
            total_days = roadmap.time_budget.get("total_days", 90)
            total_available = daily_hours * total_days
            
            completed_phases = [p for p in roadmap.phases if p.completed]
            completed_hours = sum(p.estimated_hours for p in completed_phases)
            remaining_available = total_available - completed_hours
            
            if remaining_available > 0 and total_remaining > 0:
                ratio = remaining_available / total_remaining
                
                for phase in remaining_phases:
                    original = phase.estimated_hours
                    phase.estimated_hours = round(original * ratio, 1)
                    phase.notes = f"根据进度动态调整，原{original}小时"
        
        return roadmap
    
    def _build_roadmap_from_llm_data(self, llm_data: Dict[str, Any], skill: str,
                                    time_budget: Optional[Dict[str, Any]],
                                    skill_tree: Optional[Dict[str, Any]]) -> Roadmap:
        roadmap = Roadmap(
            skill=llm_data.get("skill", skill),
            difficulty=llm_data.get("difficulty", 3),
            time_budget=time_budget,
            skill_tree=skill_tree
        )
        
        for phase_data in llm_data.get("phases", []):
            resources = []
            for res_data in phase_data.get("resources", []):
                resource = Resource(
                    name=res_data.get("name", ""),
                    type=res_data.get("type", ""),
                    url=res_data.get("url"),
                    description=res_data.get("description"),
                    rating=res_data.get("rating", 0),
                    upvotes=res_data.get("upvotes", 0),
                    downvotes=res_data.get("downvotes", 0)
                )
                resources.append(resource)
            
            phase = Phase(
                id=phase_data.get("id", ""),
                name=phase_data.get("name", ""),
                description=phase_data.get("description", ""),
                objectives=phase_data.get("objectives", []),
                resources=resources,
                estimated_hours=phase_data.get("estimated_hours", 0.0),
                difficulty=phase_data.get("difficulty", 3),
                dependencies=phase_data.get("dependencies", []),
                completed=phase_data.get("completed", False),
                completed_at=phase_data.get("completed_at"),
                notes=phase_data.get("notes")
            )
            roadmap.phases.append(phase)
        
        roadmap.calculate_total_hours()
        return roadmap
    
    def _apply_feedback_ratings(self, roadmap: Roadmap) -> Roadmap:
        for phase in roadmap.phases:
            for resource in phase.resources:
                ratings = self.storage.get_resource_rating(roadmap.skill, resource.name)
                resource.upvotes = ratings["upvotes"]
                resource.downvotes = ratings["downvotes"]
                resource.rating = ratings["rating"]
        
        for phase in roadmap.phases:
            phase.resources.sort(key=lambda r: r.rating, reverse=True)
        
        return roadmap
    
    def _apply_progress(self, roadmap: Roadmap, progress: Dict[str, Any]) -> Roadmap:
        completed_phases = progress.get("completed_phases", [])
        for phase_id in completed_phases:
            roadmap.mark_phase_completed(phase_id)
        return roadmap
    
    def _validate_dag(self, roadmap: Roadmap) -> List[str]:
        in_degree = {p.id: 0 for p in roadmap.phases}
        adj_list = {p.id: [] for p in roadmap.phases}
        
        for phase in roadmap.phases:
            for dep_id in phase.dependencies:
                if dep_id in in_degree:
                    in_degree[phase.id] += 1
                    adj_list[dep_id].append(phase.id)
        
        queue = [pid for pid, deg in in_degree.items() if deg == 0]
        topo_order = []
        
        while queue:
            node = queue.pop(0)
            topo_order.append(node)
            for neighbor in adj_list[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        return topo_order if len(topo_order) == len(roadmap.phases) else None
    
    def get_dag_data(self, roadmap: Roadmap) -> Dict[str, Any]:
        topo_order = self._validate_dag(roadmap)
        if topo_order is None:
            raise ValueError("DAG验证失败：存在循环依赖或无效的依赖关系")
        
        valid_ids = {p.id for p in roadmap.phases}
        for phase in roadmap.phases:
            for dep_id in phase.dependencies:
                if dep_id not in valid_ids:
                    raise ValueError(f"DAG验证失败：阶段 '{phase.name} 引用了不存在的依赖 '{dep_id}'")
        
        layers = self._topo_sort_layers(roadmap.phases)
        
        nodes = []
        edges = []
        
        for phase in roadmap.phases:
            nodes.append({
                "id": phase.id,
                "name": phase.name,
                "difficulty": phase.difficulty,
                "hours": phase.estimated_hours,
                "completed": phase.completed
            })
            
            for dep_id in phase.dependencies:
                edges.append({
                    "source": dep_id,
                    "target": phase.id
                })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "topo_order": topo_order,
            "layers": layers
        }
    
    def _topo_sort_layers(self, phases: List[Phase]) -> List[List[str]]:
        in_degree = {p.id: 0 for p in phases}
        adj_list = {p.id: [] for p in phases}
        phase_map = {p.id: p for p in phases}
        
        for phase in phases:
            for dep_id in phase.dependencies:
                if dep_id in in_degree:
                    in_degree[phase.id] += 1
                    adj_list[dep_id].append(phase.id)
        
        layers = []
        remaining = {p.id for p in phases}
        
        while remaining:
            current_layer = [pid for pid in in_degree if in_degree[pid] == 0 and pid in remaining]
            if not current_layer:
                break
            
            layers.append(current_layer)
            for pid in current_layer:
                remaining.remove(pid)
                for neighbor in adj_list[pid]:
                    in_degree[neighbor] -= 1
        
        return layers
