import json
import os
import csv
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any


class DataStore:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.feedback_file = os.path.join(data_dir, "feedback.json")
        self.logs_file = os.path.join(data_dir, "classification_logs.json")
        self.webhook_config_file = os.path.join(data_dir, "webhook_config.json")
        self._ensure_files()

    def _ensure_files(self):
        os.makedirs(self.data_dir, exist_ok=True)
        for f in [self.feedback_file, self.logs_file, self.webhook_config_file]:
            if not os.path.exists(f):
                with open(f, 'w', encoding='utf-8') as fp:
                    if f == self.webhook_config_file:
                        json.dump({"dingtalk": {"url": "", "enabled": False}}, fp, ensure_ascii=False, indent=2)
                    else:
                        json.dump([], fp, ensure_ascii=False, indent=2)

    def _read_json(self, filepath: str) -> Any:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return [] if filepath != self.webhook_config_file else {}

    def _write_json(self, filepath: str, data: Any) -> bool:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"写入JSON失败: {e}")
            return False

    def save_feedback(self, email_id: str, original_category: str, 
                      corrected_category: str, original_priority: str,
                      corrected_priority: str, email_content: str,
                      note: str = "") -> Dict:
        feedback_id = str(uuid.uuid4())
        feedback = {
            "id": feedback_id,
            "email_id": email_id,
            "email_content": email_content,
            "original_category": original_category,
            "corrected_category": corrected_category,
            "original_priority": original_priority,
            "corrected_priority": corrected_priority,
            "note": note,
            "created_at": datetime.now().isoformat()
        }
        
        feedbacks = self._read_json(self.feedback_file)
        feedbacks.append(feedback)
        
        if self._write_json(self.feedback_file, feedbacks):
            return feedback
        return {}

    def get_feedbacks(self, limit: int = 100, category: str = None) -> List[Dict]:
        feedbacks = self._read_json(self.feedback_file)
        if category:
            feedbacks = [f for f in feedbacks if f.get("corrected_category") == category]
        return sorted(feedbacks, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]

    def log_classification(self, result: Dict) -> Dict:
        log_id = str(uuid.uuid4())
        log_entry = {
            "id": log_id,
            "email_id": result.get("email_id", str(uuid.uuid4())),
            "content": result.get("content", ""),
            "summary": result.get("summary", ""),
            "category": result.get("category", ""),
            "category_confidence": result.get("category_confidence", 0),
            "category_explanation": result.get("category_explanation", ""),
            "sentiment": result.get("sentiment", ""),
            "sentiment_confidence": result.get("sentiment_confidence", 0),
            "priority": result.get("priority", ""),
            "priority_score": result.get("priority_score", 0),
            "priority_explanation": result.get("priority_explanation", ""),
            "suggested_response_time": result.get("suggested_response_time", ""),
            "webhook_sent": result.get("webhook_sent", False),
            "created_at": datetime.now().isoformat()
        }
        
        logs = self._read_json(self.logs_file)
        logs.append(log_entry)
        
        if self._write_json(self.logs_file, logs):
            return log_entry
        return {}

    def get_logs(self, start_date: str = None, end_date: str = None, 
                 category: str = None, priority: str = None,
                 limit: int = 1000) -> List[Dict]:
        logs = self._read_json(self.logs_file)
        
        if start_date:
            logs = [l for l in logs if l.get("created_at", "") >= start_date]
        if end_date:
            logs = [l for l in logs if l.get("created_at", "") <= end_date + "T23:59:59"]
        if category:
            logs = [l for l in logs if l.get("category") == category]
        if priority:
            logs = [l for l in logs if l.get("priority") == priority]
        
        return sorted(logs, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]

    def export_logs_csv(self, filepath: str, filters: Dict = None) -> bool:
        logs = self.get_logs(**(filters or {}))
        if not logs:
            return False
        
        try:
            with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
                fieldnames = ["id", "email_id", "created_at", "category", "priority", 
                             "sentiment", "summary", "category_explanation", 
                             "priority_explanation", "suggested_response_time",
                             "category_confidence", "sentiment_confidence",
                             "priority_score", "content"]
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for log in logs:
                    row = {k: log.get(k, "") for k in fieldnames}
                    writer.writerow(row)
            return True
        except Exception as e:
            print(f"导出CSV失败: {e}")
            return False

    def generate_logs_csv_bytes(self, filters: Dict = None) -> bytes:
        import io as _io
        logs = self.get_logs(**(filters or {}))
        if not logs:
            return b''
        
        try:
            output = _io.StringIO()
            fieldnames = ["id", "email_id", "created_at", "category", "priority", 
                         "sentiment", "summary", "category_explanation", 
                         "priority_explanation", "suggested_response_time",
                         "category_confidence", "sentiment_confidence",
                         "priority_score", "content"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for log in logs:
                row = {k: str(log.get(k, "")) for k in fieldnames}
                writer.writerow(row)
            return output.getvalue().encode('utf-8-sig')
        except Exception as e:
            print(f"生成CSV字节流失败: {e}")
            return b''

    def get_statistics(self, start_date: str = None, end_date: str = None) -> Dict:
        logs = self.get_logs(start_date=start_date, end_date=end_date)
        
        stats = {
            "total_emails": len(logs),
            "by_category": {},
            "by_priority": {},
            "by_sentiment": {},
            "avg_response_time": {},
            "high_priority_count": 0,
            "negative_sentiment_count": 0
        }
        
        category_response_times = {}
        for log in logs:
            cat = log.get("category", "未知")
            pri = log.get("priority", "未知")
            sent = log.get("sentiment", "未知")
            rt = log.get("suggested_response_time", "24小时内")
            
            stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1
            stats["by_priority"][pri] = stats["by_priority"].get(pri, 0) + 1
            stats["by_sentiment"][sent] = stats["by_sentiment"].get(sent, 0) + 1
            
            if cat not in category_response_times:
                category_response_times[cat] = rt
            
            if pri == "高":
                stats["high_priority_count"] += 1
            if sent == "负面":
                stats["negative_sentiment_count"] += 1
        
        for cat, rt in category_response_times.items():
            stats["avg_response_time"][cat] = rt
        
        if stats["total_emails"] > 0:
            stats["high_priority_ratio"] = round(stats["high_priority_count"] / stats["total_emails"] * 100, 2)
            stats["negative_sentiment_ratio"] = round(stats["negative_sentiment_count"] / stats["total_emails"] * 100, 2)
        else:
            stats["high_priority_ratio"] = 0
            stats["negative_sentiment_ratio"] = 0
        
        return stats

    def get_webhook_config(self) -> Dict:
        return self._read_json(self.webhook_config_file)

    def save_webhook_config(self, platform: str, url: str, enabled: bool = True) -> bool:
        config = self._read_json(self.webhook_config_file)
        config[platform] = {
            "url": url,
            "enabled": enabled
        }
        return self._write_json(self.webhook_config_file, config)

    def mark_webhook_sent(self, log_id: str) -> bool:
        logs = self._read_json(self.logs_file)
        for log in logs:
            if log.get("id") == log_id:
                log["webhook_sent"] = True
                return self._write_json(self.logs_file, logs)
        return False
