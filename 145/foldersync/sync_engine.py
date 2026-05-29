import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Dict, List, Optional, Tuple

from .config import SyncRule, load_last_sync_time, save_last_sync_time
from .file_utils import (
    FileInfo,
    compute_file_md5,
    copy_file,
    delete_file,
    get_all_subdirs,
    remove_empty_dirs,
    scan_directory,
)


class ActionType(Enum):
    COPY = "copy"
    OVERWRITE = "overwrite"
    DELETE = "delete"
    RENAME_AND_COPY = "rename_and_copy"
    SKIP = "skip"


@dataclass
class SyncAction:
    action_type: ActionType
    rel_path: str
    src_path: Optional[str] = None
    dst_path: Optional[str] = None
    reason: str = ""


@dataclass
class SyncResult:
    copied: List[str] = field(default_factory=list)
    overwritten: List[str] = field(default_factory=list)
    deleted: List[str] = field(default_factory=list)
    renamed: List[str] = field(default_factory=list)
    skipped: List[str] = field(default_factory=list)
    errors: List[Tuple[str, str]] = field(default_factory=list)

    @property
    def total_operations(self) -> int:
        return len(self.copied) + len(self.overwritten) + len(self.deleted) + len(self.renamed)

    @property
    def error_count(self) -> int:
        return len(self.errors)


class SyncEngine:
    def __init__(
        self,
        rule: SyncRule,
        state_dir: Optional[str] = None,
        conflict_resolver: Optional[Callable[[str], str]] = None,
    ):
        self.rule = rule
        self.state_dir = state_dir or os.path.expanduser("~/.foldersync/state")
        if conflict_resolver is not None:
            self.conflict_resolver = conflict_resolver
        elif rule.conflict_strategy in ("source", "target", "rename"):
            self.conflict_resolver = lambda _path: rule.conflict_strategy
        else:
            self.conflict_resolver = self._default_conflict_resolver
        self.result = SyncResult()

    @staticmethod
    def _default_conflict_resolver(rel_path: str) -> str:
        return "source"

    def _compute_md5_if_needed(self, fi: FileInfo) -> str:
        if fi.md5 is None:
            return fi.compute_md5()
        return fi.md5

    def _files_differ(self, src_fi: FileInfo, dst_fi: FileInfo) -> bool:
        if self.rule.use_md5:
            return self._compute_md5_if_needed(src_fi) != self._compute_md5_if_needed(dst_fi)
        return src_fi.size != dst_fi.size or abs(src_fi.mtime - dst_fi.mtime) > 1.0

    def _is_conflict(self, src_fi: FileInfo, dst_fi: FileInfo) -> bool:
        if not self._files_differ(src_fi, dst_fi):
            return False
        last_sync = load_last_sync_time(self.state_dir, self.rule.name)
        if last_sync is not None:
            src_modified = src_fi.mtime > last_sync
            dst_modified = dst_fi.mtime > last_sync
            return src_modified and dst_modified
        return False

    def plan_unidirectional(
        self,
        src_files: Dict[str, FileInfo],
        dst_files: Dict[str, FileInfo],
    ) -> List[SyncAction]:
        actions = []
        src_dirs = get_all_subdirs(self.rule.source, self.rule.excludes)
        dst_dirs = get_all_subdirs(self.rule.target, self.rule.excludes)

        for rel_path, src_fi in src_files.items():
            dst_fi = dst_files.get(rel_path)
            if dst_fi is None:
                actions.append(SyncAction(
                    action_type=ActionType.COPY,
                    rel_path=rel_path,
                    src_path=src_fi.abs_path,
                    dst_path=os.path.join(self.rule.target, rel_path),
                    reason="new file in source",
                ))
            elif self._files_differ(src_fi, dst_fi):
                actions.append(SyncAction(
                    action_type=ActionType.OVERWRITE,
                    rel_path=rel_path,
                    src_path=src_fi.abs_path,
                    dst_path=dst_fi.abs_path,
                    reason="content differs",
                ))
            else:
                actions.append(SyncAction(
                    action_type=ActionType.SKIP,
                    rel_path=rel_path,
                    reason="identical",
                ))

        for rel_path in dst_files:
            if rel_path not in src_files:
                actions.append(SyncAction(
                    action_type=ActionType.DELETE,
                    rel_path=rel_path,
                    dst_path=os.path.join(self.rule.target, rel_path),
                    reason="deleted from source",
                ))

        return actions

    def _resolve_conflict(self, rel_path: str, src_fi: FileInfo, dst_fi: FileInfo, prefix: str = "") -> SyncAction:
        strategy = self.conflict_resolver(rel_path)
        if strategy == "source":
            return SyncAction(
                action_type=ActionType.OVERWRITE,
                rel_path=rel_path,
                src_path=src_fi.abs_path,
                dst_path=dst_fi.abs_path,
                reason=f"{prefix}conflict resolved: keep source",
            )
        elif strategy == "target":
            return SyncAction(
                action_type=ActionType.OVERWRITE,
                rel_path=rel_path,
                src_path=dst_fi.abs_path,
                dst_path=src_fi.abs_path,
                reason=f"{prefix}conflict resolved: keep target",
            )
        elif strategy == "rename":
            return SyncAction(
                action_type=ActionType.RENAME_AND_COPY,
                rel_path=rel_path,
                src_path=src_fi.abs_path,
                dst_path=dst_fi.abs_path,
                reason=f"{prefix}conflict resolved: rename both",
            )
        return SyncAction(
            action_type=ActionType.SKIP,
            rel_path=rel_path,
            reason=f"{prefix}conflict resolved: skip",
        )

    def plan_bidirectional(
        self,
        src_files: Dict[str, FileInfo],
        dst_files: Dict[str, FileInfo],
    ) -> List[SyncAction]:
        actions = []
        all_paths = set(src_files.keys()) | set(dst_files.keys())

        for rel_path in all_paths:
            src_fi = src_files.get(rel_path)
            dst_fi = dst_files.get(rel_path)

            if src_fi is None and dst_fi is not None:
                actions.append(SyncAction(
                    action_type=ActionType.COPY,
                    rel_path=rel_path,
                    src_path=dst_fi.abs_path,
                    dst_path=os.path.join(self.rule.source, rel_path),
                    reason="new in target, copy to source",
                ))
            elif src_fi is not None and dst_fi is None:
                actions.append(SyncAction(
                    action_type=ActionType.COPY,
                    rel_path=rel_path,
                    src_path=src_fi.abs_path,
                    dst_path=os.path.join(self.rule.target, rel_path),
                    reason="new in source, copy to target",
                ))
            elif src_fi is not None and dst_fi is not None:
                if not self._files_differ(src_fi, dst_fi):
                    actions.append(SyncAction(
                        action_type=ActionType.SKIP,
                        rel_path=rel_path,
                        reason="identical (MD5 match)" if self.rule.use_md5 else "identical",
                    ))
                elif self._is_conflict(src_fi, dst_fi):
                    actions.append(self._resolve_conflict(rel_path, src_fi, dst_fi))
                elif src_fi.mtime > dst_fi.mtime:
                    actions.append(SyncAction(
                        action_type=ActionType.OVERWRITE,
                        rel_path=rel_path,
                        src_path=src_fi.abs_path,
                        dst_path=dst_fi.abs_path,
                        reason="source is newer",
                    ))
                elif dst_fi.mtime > src_fi.mtime:
                    actions.append(SyncAction(
                        action_type=ActionType.OVERWRITE,
                        rel_path=rel_path,
                        src_path=dst_fi.abs_path,
                        dst_path=src_fi.abs_path,
                        reason="target is newer",
                    ))
                else:
                    actions.append(self._resolve_conflict(rel_path, src_fi, dst_fi, prefix="same mtime, "))

        return actions

    def execute_action(self, action: SyncAction) -> None:
        try:
            if action.action_type == ActionType.COPY:
                copy_file(action.src_path, action.dst_path)
                self.result.copied.append(action.rel_path)
            elif action.action_type == ActionType.OVERWRITE:
                copy_file(action.src_path, action.dst_path)
                self.result.overwritten.append(action.rel_path)
            elif action.action_type == ActionType.DELETE:
                delete_file(action.dst_path)
                self.result.deleted.append(action.rel_path)
            elif action.action_type == ActionType.RENAME_AND_COPY:
                base, ext = os.path.splitext(action.dst_path)
                renamed_path = f"{base}_conflict{ext}"
                copy_file(action.dst_path, renamed_path)
                copy_file(action.src_path, action.dst_path)
                self.result.renamed.append(action.rel_path)
            elif action.action_type == ActionType.SKIP:
                self.result.skipped.append(action.rel_path)
        except Exception as e:
            self.result.errors.append((action.rel_path, str(e)))

    def execute_actions(self, actions: List[SyncAction]) -> SyncResult:
        self.result = SyncResult()
        copy_actions = [a for a in actions if a.action_type in (ActionType.COPY, ActionType.OVERWRITE, ActionType.RENAME_AND_COPY)]
        other_actions = [a for a in actions if a.action_type not in (ActionType.COPY, ActionType.OVERWRITE, ActionType.RENAME_AND_COPY)]

        with ThreadPoolExecutor(max_workers=self.rule.max_workers) as executor:
            futures = {executor.submit(self.execute_action, a): a for a in copy_actions}
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    act = futures[future]
                    self.result.errors.append((act.rel_path, str(e)))

        for action in other_actions:
            self.execute_action(action)

        remove_empty_dirs(self.rule.target, self.rule.excludes)
        if self.rule.mode == "bidirectional":
            remove_empty_dirs(self.rule.source, self.rule.excludes)

        return self.result

    def plan(self) -> List[SyncAction]:
        since_time = None
        if self.rule.incremental:
            since_time = load_last_sync_time(self.state_dir, self.rule.name)

        src_files = scan_directory(
            self.rule.source,
            excludes=self.rule.excludes,
            extensions=self.rule.extensions,
            compute_md5s=self.rule.use_md5,
            since_time=None,
            max_workers=self.rule.max_workers,
        )
        dst_files = scan_directory(
            self.rule.target,
            excludes=self.rule.excludes,
            extensions=self.rule.extensions,
            compute_md5s=self.rule.use_md5,
            since_time=None,
            max_workers=self.rule.max_workers,
        )

        if self.rule.mode == "unidirectional":
            actions = self.plan_unidirectional(src_files, dst_files)
        else:
            actions = self.plan_bidirectional(src_files, dst_files)

        if since_time is not None:
            filtered = []
            for action in actions:
                if action.action_type == ActionType.SKIP:
                    continue
                if action.action_type == ActionType.DELETE:
                    filtered.append(action)
                    continue
                src_fi = src_files.get(action.rel_path)
                dst_fi = dst_files.get(action.rel_path)
                src_changed = src_fi is not None and src_fi.mtime > since_time
                dst_changed = dst_fi is not None and dst_fi.mtime > since_time
                if src_changed or dst_changed:
                    filtered.append(action)
            actions = filtered

        return actions

    def sync(self, actions: List[SyncAction]) -> SyncResult:
        result = self.execute_actions(actions)
        if self.rule.incremental:
            save_last_sync_time(self.state_dir, self.rule.name, time.time())
        return result
