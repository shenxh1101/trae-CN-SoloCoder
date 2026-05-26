from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class ExecutionMode(str, Enum):
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class OnFailure(str, Enum):
    STOP = "stop"
    CONTINUE = "continue"


@dataclass
class Task:
    name: str
    commands: List[str]
    working_dir: str = "."
    execution_mode: ExecutionMode = ExecutionMode.SEQUENTIAL
    on_failure: OnFailure = OnFailure.STOP
    dependencies: List[str] = field(default_factory=list)
    env_vars: Dict[str, str] = field(default_factory=dict)
    parameters: Dict[str, str] = field(default_factory=dict)
    backup_paths: List[str] = field(default_factory=list)
    description: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["execution_mode"] = self.execution_mode.value
        data["on_failure"] = self.on_failure.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Task":
        return cls(
            name=data["name"],
            commands=data["commands"],
            working_dir=data.get("working_dir", "."),
            execution_mode=ExecutionMode(data.get("execution_mode", "sequential")),
            on_failure=OnFailure(data.get("on_failure", "stop")),
            dependencies=data.get("dependencies", []),
            env_vars=data.get("env_vars", {}),
            parameters=data.get("parameters", {}),
            backup_paths=data.get("backup_paths", []),
            description=data.get("description", ""),
            created_at=data.get("created_at", datetime.now().isoformat())
        )


@dataclass
class TaskGroup:
    name: str
    tasks: List[str]
    description: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TaskGroup":
        return cls(
            name=data["name"],
            tasks=data["tasks"],
            description=data.get("description", ""),
            created_at=data.get("created_at", datetime.now().isoformat())
        )


@dataclass
class ExecutionLog:
    task_name: str
    start_time: str
    end_time: str
    status: TaskStatus
    output: str
    exit_code: int
    parameters: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["status"] = self.status.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExecutionLog":
        return cls(
            task_name=data["task_name"],
            start_time=data["start_time"],
            end_time=data["end_time"],
            status=TaskStatus(data["status"]),
            output=data["output"],
            exit_code=data["exit_code"],
            parameters=data.get("parameters", {})
        )


@dataclass
class ScheduledTask:
    task_name: str
    cron_expression: str
    enabled: bool = True
    parameters: Dict[str, str] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScheduledTask":
        return cls(
            task_name=data["task_name"],
            cron_expression=data["cron_expression"],
            enabled=data.get("enabled", True),
            parameters=data.get("parameters", {}),
            created_at=data.get("created_at", datetime.now().isoformat())
        )


@dataclass
class TaskStats:
    task_name: str
    success_count: int = 0
    failure_count: int = 0
    last_execution: Optional[str] = None
    total_duration: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TaskStats":
        return cls(
            task_name=data["task_name"],
            success_count=data.get("success_count", 0),
            failure_count=data.get("failure_count", 0),
            last_execution=data.get("last_execution"),
            total_duration=data.get("total_duration", 0.0)
        )
