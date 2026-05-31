import os
import shutil
from datetime import datetime
from typing import List, Dict
from config import Config
from utils.json_utils import load_json_file

class BackupService:
    def __init__(self):
        self.backup_dir = Config.BACKUP_DIR
        self.knowledge_file = Config.KNOWLEDGE_BASE_FILE
        os.makedirs(self.backup_dir, exist_ok=True)

    def create_backup(self) -> Dict:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"knowledge_base_{timestamp}.json"
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        if os.path.exists(self.knowledge_file):
            shutil.copy2(self.knowledge_file, backup_path)
            file_size = os.path.getsize(backup_path)
            
            return {
                "success": True,
                "backup_file": backup_filename,
                "backup_path": backup_path,
                "file_size_bytes": file_size,
                "created_at": datetime.now().isoformat()
            }
        
        return {
            "success": False,
            "error": "Knowledge base file not found"
        }

    def list_backups(self) -> List[Dict]:
        if not os.path.exists(self.backup_dir):
            return []
        
        backups = []
        for filename in os.listdir(self.backup_dir):
            if filename.startswith("knowledge_base_") and filename.endswith(".json"):
                filepath = os.path.join(self.backup_dir, filename)
                stat = os.stat(filepath)
                backups.append({
                    "filename": filename,
                    "path": filepath,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        backups.sort(key=lambda x: x["created_at"], reverse=True)
        return backups

    def restore_backup(self, backup_filename: str) -> Dict:
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        if not os.path.exists(backup_path):
            return {
                "success": False,
                "error": "Backup file not found"
            }
        
        try:
            data = load_json_file(backup_path)
            if "entries" not in data:
                return {
                    "success": False,
                    "error": "Invalid backup file format"
                }
            
            from utils.json_utils import save_json_file
            save_json_file(self.knowledge_file, data)
            
            return {
                "success": True,
                "restored_from": backup_filename,
                "entries_count": len(data.get("entries", []))
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def delete_backup(self, backup_filename: str) -> Dict:
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        if not os.path.exists(backup_path):
            return {
                "success": False,
                "error": "Backup file not found"
            }
        
        try:
            os.remove(backup_path)
            return {
                "success": True,
                "deleted_file": backup_filename
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def cleanup_old_backups(self, keep_count: int = 10) -> Dict:
        backups = self.list_backups()
        if len(backups) <= keep_count:
            return {
                "success": True,
                "deleted_count": 0,
                "message": f"No backups to delete. Only {len(backups)} backups exist."
            }
        
        to_delete = backups[keep_count:]
        deleted = 0
        failed = 0
        
        for backup in to_delete:
            result = self.delete_backup(backup["filename"])
            if result["success"]:
                deleted += 1
            else:
                failed += 1
        
        return {
            "success": True,
            "deleted_count": deleted,
            "failed_count": failed,
            "remaining_count": len(backups) - deleted
        }
