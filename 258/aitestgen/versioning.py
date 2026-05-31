import os
import json
import hashlib
import difflib
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict, field
import yaml

_version_manager = None


@dataclass
class TestVersion:
    version_id: str
    timestamp: str
    original_content: str
    edited_content: Optional[str] = None
    is_edited: bool = False
    function_name: str = ""
    file_path: str = ""
    language: str = "python"
    source_code: str = ""
    function_signature: str = ""
    edit_reason: str = ""


@dataclass
class VersionHistory:
    file_path: str
    function_name: str
    versions: List[TestVersion] = field(default_factory=list)
    
    def add_version(self, version: TestVersion):
        self.versions.append(version)
    
    def get_latest(self) -> Optional[TestVersion]:
        if self.versions:
            return self.versions[-1]
        return None
    
    def get_edited_versions(self) -> List[TestVersion]:
        return [v for v in self.versions if v.is_edited]
    
    def get_diff(self, version_id: str) -> Optional[str]:
        for v in self.versions:
            if v.version_id == version_id and v.is_edited:
                diff = difflib.unified_diff(
                    v.original_content.splitlines(keepends=True),
                    v.edited_content.splitlines(keepends=True),
                    fromfile='original',
                    tofile='edited',
                    n=3
                )
                return ''.join(diff)
        return None


class VersionManager:
    def __init__(self, storage_dir: str = ".aitestgen/versions"):
        self.storage_dir = storage_dir
        self.index_file = os.path.join(storage_dir, "index.json")
        self._ensure_storage()

    def _ensure_storage(self):
        os.makedirs(self.storage_dir, exist_ok=True)
        if not os.path.exists(self.index_file):
            with open(self.index_file, 'w') as f:
                json.dump({"histories": {}}, f, indent=2)

    def _get_key(self, file_path: str, function_name: str) -> str:
        rel_path = os.path.relpath(os.path.abspath(file_path))
        return f"{rel_path}:{function_name}"

    def _generate_version_id(self, content: str) -> str:
        hash_obj = hashlib.md5(content.encode() + datetime.now().isoformat().encode())
        return hash_obj.hexdigest()[:12]

    def save_original(self, file_path: str, function_name: str, content: str,
                     language: str = "python", source_code: str = "",
                     function_signature: str = "") -> TestVersion:
        version = TestVersion(
            version_id=self._generate_version_id(content),
            timestamp=datetime.now().isoformat(),
            original_content=content,
            function_name=function_name,
            file_path=os.path.abspath(file_path),
            language=language,
            source_code=source_code,
            function_signature=function_signature
        )
        
        self._save_version(file_path, function_name, version)
        return version

    def save_edited(self, file_path: str, function_name: str, edited_content: str,
                   edit_reason: str = "") -> TestVersion:
        history = self.load_history(file_path, function_name)
        latest = history.get_latest()
        
        if latest:
            version = TestVersion(
                version_id=self._generate_version_id(edited_content),
                timestamp=datetime.now().isoformat(),
                original_content=latest.original_content,
                edited_content=edited_content,
                is_edited=True,
                function_name=function_name,
                file_path=os.path.abspath(file_path),
                language=latest.language,
                source_code=latest.source_code,
                function_signature=latest.function_signature,
                edit_reason=edit_reason
            )
            self._save_version(file_path, function_name, version)
            return version
        else:
            version = TestVersion(
                version_id=self._generate_version_id(edited_content),
                timestamp=datetime.now().isoformat(),
                original_content=edited_content,
                edited_content=edited_content,
                is_edited=True,
                function_name=function_name,
                file_path=os.path.abspath(file_path),
                edit_reason=edit_reason
            )
            self._save_version(file_path, function_name, version)
            return version

    def _save_version(self, file_path: str, function_name: str, version: TestVersion):
        with open(self.index_file, 'r') as f:
            index = json.load(f)
        
        key = self._get_key(file_path, function_name)
        
        if key not in index["histories"]:
            index["histories"][key] = {
                "file_path": os.path.abspath(file_path),
                "function_name": function_name,
                "versions": []
            }
        
        version_file = os.path.join(self.storage_dir, f"{version.version_id}.json")
        with open(version_file, 'w') as f:
            json.dump(asdict(version), f, indent=2)
        
        index["histories"][key]["versions"].append({
            "version_id": version.version_id,
            "timestamp": version.timestamp,
            "is_edited": version.is_edited
        })
        
        with open(self.index_file, 'w') as f:
            json.dump(index, f, indent=2)

    def load_history(self, file_path: str, function_name: str) -> VersionHistory:
        with open(self.index_file, 'r') as f:
            index = json.load(f)
        
        key = self._get_key(file_path, function_name)
        history = VersionHistory(file_path=file_path, function_name=function_name)
        
        if key in index["histories"]:
            for ver_info in index["histories"][key]["versions"]:
                version_file = os.path.join(self.storage_dir, f"{ver_info['version_id']}.json")
                if os.path.exists(version_file):
                    with open(version_file, 'r') as f:
                        version_data = json.load(f)
                        history.versions.append(TestVersion(**version_data))
        
        return history

    def get_edited_pairs(self, include_diffs: bool = False) -> List[Dict[str, str]]:
        pairs = []
        
        with open(self.index_file, 'r') as f:
            index = json.load(f)
        
        for key, history_info in index["histories"].items():
            for ver_info in history_info["versions"]:
                if ver_info.get("is_edited"):
                    version_file = os.path.join(self.storage_dir, f"{ver_info['version_id']}.json")
                    if os.path.exists(version_file):
                        with open(version_file, 'r') as f:
                            version_data = json.load(f)
                            if version_data.get("edited_content"):
                                pair = {
                                    "original": version_data["original_content"],
                                    "edited": version_data["edited_content"],
                                    "function_name": version_data["function_name"],
                                    "file_path": version_data["file_path"],
                                    "language": version_data.get("language", "python"),
                                    "source_code": version_data.get("source_code", ""),
                                    "function_signature": version_data.get("function_signature", ""),
                                    "edit_reason": version_data.get("edit_reason", ""),
                                    "timestamp": version_data["timestamp"]
                                }
                                if include_diffs:
                                    pair["diff"] = self._get_diff_string(
                                        version_data["original_content"],
                                        version_data["edited_content"]
                                    )
                                pairs.append(pair)
        
        return pairs
    
    def _get_diff_string(self, original: str, edited: str) -> str:
        diff = difflib.unified_diff(
            original.splitlines(keepends=True),
            edited.splitlines(keepends=True),
            fromfile='original',
            tofile='edited',
            n=3
        )
        return ''.join(diff)

    def export_training_data(self, output_file: str, format: str = 'json', 
                            include_diffs: bool = False):
        pairs = self.get_edited_pairs(include_diffs=include_diffs)
        
        if not pairs:
            print("Warning: No edited test pairs found")
        
        if format == 'json':
            with open(output_file, 'w') as f:
                json.dump(pairs, f, indent=2, ensure_ascii=False)
        elif format == 'yaml':
            with open(output_file, 'w') as f:
                yaml.dump(pairs, f, default_flow_style=False, allow_unicode=True)
        elif format == 'jsonl':
            with open(output_file, 'w') as f:
                for pair in pairs:
                    f.write(json.dumps(pair, ensure_ascii=False) + '\n')
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        return len(pairs)

    def list_functions(self) -> List[Dict[str, any]]:
        with open(self.index_file, 'r') as f:
            index = json.load(f)
        
        results = []
        for key, history_info in index["histories"].items():
            edited_count = sum(1 for v in history_info["versions"] if v.get("is_edited"))
            latest_version = history_info["versions"][-1] if history_info["versions"] else None
            results.append({
                "file_path": history_info["file_path"],
                "function_name": history_info["function_name"],
                "total_versions": len(history_info["versions"]),
                "edited_count": edited_count,
                "last_edited": latest_version.get("timestamp", "") if latest_version else ""
            })
        
        return results
    
    def get_diff(self, file_path: str, function_name: str, version_id: str = None) -> Optional[str]:
        history = self.load_history(file_path, function_name)
        
        if version_id:
            return history.get_diff(version_id)
        else:
            latest = history.get_latest()
            if latest and latest.is_edited:
                return self._get_diff_string(latest.original_content, latest.edited_content)
        return None
    
    def compare_versions(self, file_path: str, function_name: str, 
                       version_id1: str, version_id2: str) -> Optional[str]:
        history = self.load_history(file_path, function_name)
        
        v1 = next((v for v in history.versions if v.version_id == version_id1), None)
        v2 = next((v for v in history.versions if v.version_id == version_id2), None)
        
        if v1 and v2:
            content1 = v1.edited_content or v1.original_content
            content2 = v2.edited_content or v2.original_content
            return self._get_diff_string(content1, content2)
        return None


def get_version_manager(storage_dir: Optional[str] = None) -> VersionManager:
    global _version_manager
    
    if storage_dir is None:
        env_home = os.getenv('AITESTGEN_HOME')
        if env_home:
            storage_dir = os.path.join(env_home, 'versions')
        else:
            storage_dir = ".aitestgen/versions"
    
    if _version_manager is None or _version_manager.storage_dir != storage_dir:
        _version_manager = VersionManager(storage_dir)
    return _version_manager


def reset_version_manager():
    """Reset the singleton instance (for testing)"""
    global _version_manager
    _version_manager = None
