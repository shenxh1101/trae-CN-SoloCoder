import json
import os
from datetime import datetime
from typing import List, Optional


class GenerationLog:
    def __init__(self, log_file: str = "annotation_log.json"):
        self.log_file = log_file
        self.entries = []

    def add_entry(self, file_path: str, language: str, blocks_processed: int,
                  comments_added: int, comment_lines: int, status: str = "success",
                  error: str = None):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "file": file_path,
            "language": language,
            "blocks_processed": blocks_processed,
            "comments_added": comments_added,
            "comment_lines": comment_lines,
            "status": status,
        }
        if error:
            entry["error"] = error
        self.entries.append(entry)

    def get_summary(self) -> dict:
        total_files = len(self.entries)
        successful = len([e for e in self.entries if e["status"] == "success"])
        total_blocks = sum(e["blocks_processed"] for e in self.entries)
        total_comments = sum(e["comments_added"] for e in self.entries)
        total_comment_lines = sum(e["comment_lines"] for e in self.entries)

        by_language = {}
        for entry in self.entries:
            lang = entry["language"]
            if lang not in by_language:
                by_language[lang] = {
                    "files": 0, "blocks_processed": 0,
                    "comments_added": 0, "comment_lines": 0,
                }
            by_language[lang]["files"] += 1
            by_language[lang]["blocks_processed"] += entry["blocks_processed"]
            by_language[lang]["comments_added"] += entry["comments_added"]
            by_language[lang]["comment_lines"] += entry["comment_lines"]

        return {
            "total_files": total_files,
            "successful_files": successful,
            "failed_files": total_files - successful,
            "total_blocks_processed": total_blocks,
            "total_comments_added": total_comments,
            "total_comment_lines": total_comment_lines,
            "by_language": by_language,
        }

    def export(self, file_path: str = None):
        output_path = file_path or self.log_file
        data = {
            "generated_at": datetime.now().isoformat(),
            "summary": self.get_summary(),
            "entries": self.entries,
        }
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def export_text(self, file_path: str):
        summary = self.get_summary()
        lines = [
            "=" * 60,
            "  AI Code Annotation - Generation Log",
            "=" * 60,
            f"  Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "-" * 60,
            "  Summary",
            "-" * 60,
            f"  Total files processed:    {summary['total_files']}",
            f"  Successful:               {summary['successful_files']}",
            f"  Failed:                   {summary['failed_files']}",
            f"  Total blocks processed:   {summary['total_blocks_processed']}",
            f"  Total comments added:     {summary['total_comments_added']}",
            f"  Total comment lines:      {summary['total_comment_lines']}",
            "",
        ]

        if summary["by_language"]:
            lines.append("-" * 60)
            lines.append("  By Language")
            lines.append("-" * 60)
            for lang, stats in summary["by_language"].items():
                lines.append(f"  [{lang}]")
                lines.append(f"    Files: {stats['files']}, Blocks: {stats['blocks_processed']}, "
                             f"Comments: {stats['comments_added']}, Lines: {stats['comment_lines']}")
            lines.append("")

        lines.append("-" * 60)
        lines.append("  Per-File Details")
        lines.append("-" * 60)
        for entry in self.entries:
            status_icon = "✓" if entry["status"] == "success" else "✗"
            lines.append(f"  {status_icon} {entry['file']}")
            lines.append(f"    Language: {entry['language']}, "
                         f"Blocks: {entry['blocks_processed']}, "
                         f"Comments: {entry['comments_added']}, "
                         f"Lines: {entry['comment_lines']}")
            if entry.get("error"):
                lines.append(f"    Error: {entry['error']}")

        lines.append("")
        lines.append("=" * 60)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
