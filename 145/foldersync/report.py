import io
import os
from datetime import datetime
from typing import Optional

from .sync_engine import SyncResult, SyncAction, ActionType


class SyncReport:
    def __init__(self, rule_name: str, result: SyncResult, actions: list):
        self.rule_name = rule_name
        self.result = result
        self.actions = actions
        self.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def to_text(self) -> str:
        buf = io.StringIO()
        buf.write(f"{'=' * 60}\n")
        buf.write(f"Sync Report: {self.rule_name}\n")
        buf.write(f"Time: {self.timestamp}\n")
        buf.write(f"{'=' * 60}\n\n")

        copied = [a for a in self.actions if a.action_type == ActionType.COPY]
        overwritten = [a for a in self.actions if a.action_type == ActionType.OVERWRITE]
        deleted = [a for a in self.actions if a.action_type == ActionType.DELETE]
        renamed = [a for a in self.actions if a.action_type == ActionType.RENAME_AND_COPY]
        skipped = [a for a in self.actions if a.action_type == ActionType.SKIP]

        if copied:
            buf.write(f"[Copied] ({len(copied)} files)\n")
            for a in copied:
                buf.write(f"  + {a.rel_path}  ({a.reason})\n")
            buf.write("\n")

        if overwritten:
            buf.write(f"[Overwritten] ({len(overwritten)} files)\n")
            for a in overwritten:
                buf.write(f"  ~ {a.rel_path}  ({a.reason})\n")
            buf.write("\n")

        if deleted:
            buf.write(f"[Deleted] ({len(deleted)} files)\n")
            for a in deleted:
                buf.write(f"  - {a.rel_path}  ({a.reason})\n")
            buf.write("\n")

        if renamed:
            buf.write(f"[Renamed (conflict)] ({len(renamed)} files)\n")
            for a in renamed:
                buf.write(f"  * {a.rel_path}  ({a.reason})\n")
            buf.write("\n")

        if skipped:
            buf.write(f"[Skipped] ({len(skipped)} files)\n")
            for a in skipped:
                buf.write(f"  = {a.rel_path}  ({a.reason})\n")
            buf.write("\n")

        buf.write(f"{'-' * 60}\n")
        buf.write(f"Summary:\n")
        buf.write(f"  Copied:      {len(copied)}\n")
        buf.write(f"  Overwritten: {len(overwritten)}\n")
        buf.write(f"  Deleted:     {len(deleted)}\n")
        buf.write(f"  Renamed:     {len(renamed)}\n")
        buf.write(f"  Skipped:     {len(skipped)}\n")
        buf.write(f"  Errors:      {self.result.error_count}\n")

        if self.result.errors:
            buf.write(f"\n[Errors]\n")
            for path, err in self.result.errors:
                buf.write(f"  ! {path}: {err}\n")

        buf.write(f"{'=' * 60}\n")
        return buf.getvalue()

    def save(self, report_dir: str) -> str:
        os.makedirs(report_dir, exist_ok=True)
        safe_name = self.rule_name.replace(" ", "_").replace("/", "_")
        filename = f"sync_report_{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        filepath = os.path.join(report_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(self.to_text())
        return filepath


def preview_actions(actions: list) -> str:
    buf = io.StringIO()
    buf.write(f"\n{'=' * 60}\n")
    buf.write("Preview: Actions to be performed\n")
    buf.write(f"{'=' * 60}\n\n")

    copied = [a for a in actions if a.action_type == ActionType.COPY]
    overwritten = [a for a in actions if a.action_type == ActionType.OVERWRITE]
    deleted = [a for a in actions if a.action_type == ActionType.DELETE]
    renamed = [a for a in actions if a.action_type == ActionType.RENAME_AND_COPY]
    skipped = [a for a in actions if a.action_type == ActionType.SKIP]

    if copied:
        buf.write(f"[Will Copy] ({len(copied)} files)\n")
        for a in copied:
            buf.write(f"  + {a.rel_path}\n")
        buf.write("\n")

    if overwritten:
        buf.write(f"[Will Overwrite] ({len(overwritten)} files)\n")
        for a in overwritten:
            buf.write(f"  ~ {a.rel_path}  ({a.reason})\n")
        buf.write("\n")

    if deleted:
        buf.write(f"[Will Delete] ({len(deleted)} files)\n")
        for a in deleted:
            buf.write(f"  - {a.rel_path}\n")
        buf.write("\n")

    if renamed:
        buf.write(f"[Will Rename (conflict)] ({len(renamed)} files)\n")
        for a in renamed:
            buf.write(f"  * {a.rel_path}\n")
        buf.write("\n")

    if skipped:
        buf.write(f"[Will Skip] ({len(skipped)} files)\n")
        for a in skipped:
            buf.write(f"  = {a.rel_path}\n")
        buf.write("\n")

    total = len(copied) + len(overwritten) + len(deleted) + len(renamed)
    buf.write(f"Total operations: {total}\n")
    buf.write(f"{'=' * 60}\n")
    return buf.getvalue()
