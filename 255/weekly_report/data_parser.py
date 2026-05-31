import csv
import re
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timedelta


class DataParser:
    @staticmethod
    def parse_csv(file_path: str) -> List[Dict]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"CSV file not found: {file_path}")
        
        results = []
        
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                member_data = {
                    "name": row.get("姓名", row.get("name", "")),
                    "work_items": [],
                    "extra_context": row.get("备注", row.get("context", ""))
                }
                
                items_str = row.get("工作要点", row.get("work_items", row.get("要点", "")))
                if items_str:
                    items = [item.strip() for item in re.split(r'[、,，;；\n]', items_str) if item.strip()]
                    member_data["work_items"] = items
                
                results.append(member_data)
        
        return results

    @staticmethod
    def parse_git_log(file_path: str, author_filter: Optional[str] = None, 
                      days: int = 7) -> str:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Git log file not found: {file_path}")
        
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        if not content.strip():
            return ""
        
        commits = DataParser._parse_git_commits(content)
        filtered_commits = DataParser._filter_commits(commits, author_filter, days)
        
        return DataParser._format_commits(filtered_commits)

    @staticmethod
    def _parse_git_commits(content: str) -> List[Dict]:
        commits = []
        current_commit = None
        
        commit_pattern = re.compile(
            r'^commit\s+([a-f0-9]+)',
            re.MULTILINE
        )
        author_pattern = re.compile(
            r'^Author:\s+(.+?)\s*<(.+?)>',
            re.MULTILINE
        )
        date_pattern = re.compile(
            r'^Date:\s+(.+?)$',
            re.MULTILINE
        )
        
        lines = content.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            commit_match = commit_pattern.match(line)
            if commit_match:
                if current_commit:
                    commits.append(current_commit)
                
                current_commit = {
                    "hash": commit_match.group(1),
                    "message": "",
                    "author": "",
                    "email": "",
                    "date": None
                }
                i += 1
                continue
            
            if current_commit:
                author_match = author_pattern.match(line)
                if author_match:
                    current_commit["author"] = author_match.group(1)
                    current_commit["email"] = author_match.group(2)
                    i += 1
                    continue
                
                date_match = date_pattern.match(line)
                if date_match:
                    date_str = date_match.group(1).strip()
                    try:
                        current_commit["date"] = datetime.strptime(
                            date_str, "%a %b %d %H:%M:%S %Y %z"
                        )
                    except ValueError:
                        try:
                            current_commit["date"] = datetime.strptime(
                                date_str, "%Y-%m-%d %H:%M:%S %z"
                            )
                        except ValueError:
                            pass
                    i += 1
                    continue
                
                if line.strip() and not line.startswith(' ' * 4):
                    if current_commit["message"]:
                        current_commit["message"] += "\n"
                    current_commit["message"] += line.strip()
            
            i += 1
        
        if current_commit:
            commits.append(current_commit)
        
        return commits

    @staticmethod
    def _filter_commits(commits: List[Dict], author_filter: Optional[str], 
                        days: int) -> List[Dict]:
        if not commits:
            return []
        
        cutoff_date = datetime.now(commits[0]["date"].tzinfo) - timedelta(days=days) if commits[0]["date"] else None
        
        filtered = []
        for commit in commits:
            if author_filter and author_filter.lower() not in commit["author"].lower():
                continue
            
            if cutoff_date and commit["date"] and commit["date"] < cutoff_date:
                continue
            
            filtered.append(commit)
        
        return filtered

    @staticmethod
    def _format_commits(commits: List[Dict]) -> str:
        if not commits:
            return ""
        
        lines = []
        for commit in commits:
            date_str = commit["date"].strftime("%Y-%m-%d") if commit["date"] else "未知日期"
            lines.append(f"[{date_str}] {commit['author']}: {commit['message']}")
        
        return "\n".join(lines)

    @staticmethod
    def extract_work_items_from_text(text: str) -> List[str]:
        items = []
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if line.startswith('-') or line.startswith('*') or re.match(r'^\d+[.、)]', line):
                item = re.sub(r'^[-*\d+[.、)]\s*', '', line).strip()
                if item:
                    items.append(item)
            elif len(line) < 100 and not line.endswith('。'):
                items.append(line)
        
        return items if items else [text.strip()]
