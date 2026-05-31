from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class Resource:
    name: str
    type: str
    url: Optional[str] = None
    description: Optional[str] = None
    rating: int = 0
    upvotes: int = 0
    downvotes: int = 0


@dataclass
class Phase:
    id: str
    name: str
    description: str
    objectives: List[str]
    resources: List[Resource]
    estimated_hours: float
    difficulty: int
    dependencies: List[str] = field(default_factory=list)
    completed: bool = False
    completed_at: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class Roadmap:
    skill: str
    version: str = "1.0"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    total_hours: float = 0.0
    difficulty: int = 3
    time_budget: Optional[Dict[str, Any]] = None
    phases: List[Phase] = field(default_factory=list)
    skill_tree: Optional[Dict[str, Any]] = None

    def calculate_total_hours(self) -> float:
        self.total_hours = sum(phase.estimated_hours for phase in self.phases)
        return self.total_hours

    def get_completed_percentage(self) -> float:
        if not self.phases:
            return 0.0
        completed = sum(1 for phase in self.phases if phase.completed)
        return (completed / len(self.phases)) * 100

    def get_remaining_hours(self) -> float:
        return sum(phase.estimated_hours for phase in self.phases if not phase.completed)

    def mark_phase_completed(self, phase_id: str) -> bool:
        for phase in self.phases:
            if phase.id == phase_id:
                phase.completed = True
                phase.completed_at = datetime.now().isoformat()
                self.updated_at = datetime.now().isoformat()
                return True
        return False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "skill": self.skill,
            "version": self.version,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "total_hours": self.calculate_total_hours(),
            "difficulty": self.difficulty,
            "time_budget": self.time_budget,
            "skill_tree": self.skill_tree,
            "completion_percentage": self.get_completed_percentage(),
            "remaining_hours": self.get_remaining_hours(),
            "phases": [
                {
                    "id": phase.id,
                    "name": phase.name,
                    "description": phase.description,
                    "objectives": phase.objectives,
                    "resources": [
                        {
                            "name": r.name,
                            "type": r.type,
                            "url": r.url,
                            "description": r.description,
                            "rating": r.rating,
                            "upvotes": r.upvotes,
                            "downvotes": r.downvotes
                        }
                        for r in phase.resources
                    ],
                    "estimated_hours": phase.estimated_hours,
                    "difficulty": phase.difficulty,
                    "dependencies": phase.dependencies,
                    "completed": phase.completed,
                    "completed_at": phase.completed_at,
                    "notes": phase.notes
                }
                for phase in self.phases
            ]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Roadmap':
        roadmap = cls(
            skill=data.get("skill", ""),
            version=data.get("version", "1.0"),
            created_at=data.get("created_at", datetime.now().isoformat()),
            updated_at=data.get("updated_at", datetime.now().isoformat()),
            total_hours=data.get("total_hours", 0.0),
            difficulty=data.get("difficulty", 3),
            time_budget=data.get("time_budget"),
            skill_tree=data.get("skill_tree")
        )
        
        for phase_data in data.get("phases", []):
            resources = [
                Resource(
                    name=r.get("name", ""),
                    type=r.get("type", ""),
                    url=r.get("url"),
                    description=r.get("description"),
                    rating=r.get("rating", 0),
                    upvotes=r.get("upvotes", 0),
                    downvotes=r.get("downvotes", 0)
                )
                for r in phase_data.get("resources", [])
            ]
            
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
        
        return roadmap
