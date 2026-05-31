from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class Severity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    @property
    def weight(self):
        weights = {
            Severity.LOW: 1,
            Severity.MEDIUM: 3,
            Severity.HIGH: 5,
            Severity.CRITICAL: 10,
        }
        return weights[self]


class SmellCategory(Enum):
    COMPLEXITY = "complexity"
    DUPLICATION = "duplication"
    COUPLING = "coupling"
    MAINTAINABILITY = "maintainability"
    PERFORMANCE = "performance"
    NAMING = "naming"


@dataclass
class SourceLocation:
    file_path: str
    start_line: int
    end_line: int

    def __str__(self):
        return f"{self.file_path}:{self.start_line}-{self.end_line}"


@dataclass
class SmellResult:
    smell_type: str
    category: SmellCategory
    severity: Severity
    location: SourceLocation
    description: str
    code_snippet: str
    maintenance_issue: str
    refactoring_suggestion: str
    is_false_positive: bool = False

    def to_dict(self):
        return {
            "smell_type": self.smell_type,
            "category": self.category.value,
            "severity": self.severity.value,
            "file_path": self.location.file_path,
            "start_line": self.location.start_line,
            "end_line": self.location.end_line,
            "description": self.description,
            "code_snippet": self.code_snippet,
            "maintenance_issue": self.maintenance_issue,
            "refactoring_suggestion": self.refactoring_suggestion,
            "is_false_positive": self.is_false_positive,
        }


class BaseDetector:
    smell_type: str = "base"
    category: SmellCategory = SmellCategory.MAINTAINABILITY
    default_severity: Severity = Severity.MEDIUM

    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}

    def detect(self, file_path: str, content: str, lines: List[str]) -> List[SmellResult]:
        raise NotImplementedError

    def _make_result(self, file_path: str, start_line: int, end_line: int,
                     description: str, code_snippet: str,
                     maintenance_issue: str, refactoring_suggestion: str,
                     severity: Optional[Severity] = None) -> SmellResult:
        return SmellResult(
            smell_type=self.smell_type,
            category=self.category,
            severity=severity or self.default_severity,
            location=SourceLocation(file_path=file_path, start_line=start_line, end_line=end_line),
            description=description,
            code_snippet=code_snippet,
            maintenance_issue=maintenance_issue,
            refactoring_suggestion=refactoring_suggestion,
        )
