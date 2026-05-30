import os
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from config import Config


class FeedbackManager:
    def __init__(self, feedback_dir: Optional[str] = None):
        self.feedback_dir = feedback_dir or Config.FEEDBACK_DIR
        self._ensure_dir()
    
    def _ensure_dir(self):
        if not os.path.exists(self.feedback_dir):
            os.makedirs(self.feedback_dir)
    
    def _get_feedback_file(self, meeting_id: str) -> str:
        return os.path.join(self.feedback_dir, f"feedback_{meeting_id}.json")
    
    def _generate_meeting_id(self, filename: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        basename = os.path.splitext(os.path.basename(filename))[0]
        return f"{basename}_{timestamp}"
    
    def save_feedback(self, 
                     meeting_result: Dict[str, Any],
                     accuracy_rating: int,
                     comments: str = "",
                     corrections: Optional[Dict[str, Any]] = None) -> str:
        meeting_id = self._generate_meeting_id(meeting_result.get("metadata", {}).get("filename", "unknown"))
        
        feedback_data = {
            "meeting_id": meeting_id,
            "meeting_result": meeting_result,
            "feedback": {
                "accuracy_rating": accuracy_rating,
                "comments": comments,
                "corrections": corrections or {},
                "submitted_at": datetime.now().isoformat()
            }
        }
        
        file_path = self._get_feedback_file(meeting_id)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(feedback_data, f, ensure_ascii=False, indent=2)
        
        return meeting_id
    
    def collect_feedback_interactive(self, meeting_result: Dict[str, Any]) -> str:
        print("\n" + "=" * 60)
        print("反馈收集")
        print("=" * 60)
        
        print("\n请对摘要准确性进行评分 (1-5):")
        print("  1 = 非常不准确")
        print("  2 = 不太准确")
        print("  3 = 一般")
        print("  4 = 比较准确")
        print("  5 = 非常准确")
        
        while True:
            try:
                rating = input("\n请输入评分 (1-5): ").strip()
                rating_int = int(rating)
                if 1 <= rating_int <= 5:
                    break
                else:
                    print("请输入1-5之间的数字")
            except ValueError:
                print("请输入有效的数字")
        
        comments = input("\n请输入补充说明或建议（可选，直接回车跳过）: ").strip()
        
        print("\n是否需要对特定部分进行修正？(y/n): ", end="")
        need_correction = input().strip().lower()
        
        corrections = {}
        if need_correction == 'y':
            print("\n可选修正部分:")
            print("  1. 整体摘要")
            print("  2. 发言人观点")
            print("  3. 会议共识")
            print("  4. 待办事项")
            print("  5. 时间节点")
            
            choice = input("\n请选择要修正的部分（输入序号，多个用逗号分隔）: ").strip()
            choices = [c.strip() for c in choice.split(",")]
            
            if "1" in choices:
                corrections["overall_summary"] = input("请输入修正后的整体摘要: ").strip()
            
            if "2" in choices:
                speaker = input("请输入发言人姓名: ").strip()
                corrections[f"speaker_{speaker}"] = input(f"请输入{speaker}的修正观点: ").strip()
            
            if "3" in choices:
                corrections["consensus"] = input("请输入修正后的会议共识: ").strip()
            
            if "4" in choices:
                corrections["todo_items"] = input("请输入修正后的待办事项: ").strip()
            
            if "5" in choices:
                corrections["time_events"] = input("请输入修正后的时间节点: ").strip()
        
        meeting_id = self.save_feedback(meeting_result, rating_int, comments, corrections)
        print(f"\n✓ 反馈已保存！反馈ID: {meeting_id}")
        return meeting_id
    
    def get_all_feedback(self) -> List[Dict[str, Any]]:
        feedback_list = []
        
        if not os.path.exists(self.feedback_dir):
            return feedback_list
        
        for filename in os.listdir(self.feedback_dir):
            if filename.startswith("feedback_") and filename.endswith(".json"):
                file_path = os.path.join(self.feedback_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        feedback_list.append(json.load(f))
                except:
                    continue
        
        return feedback_list
    
    def get_feedback_stats(self) -> Dict[str, Any]:
        all_feedback = self.get_all_feedback()
        
        if not all_feedback:
            return {"total": 0, "avg_rating": 0, "ratings": {}}
        
        ratings = [f["feedback"]["accuracy_rating"] for f in all_feedback]
        rating_distribution = {}
        for r in range(1, 6):
            rating_distribution[r] = ratings.count(r)
        
        return {
            "total": len(all_feedback),
            "avg_rating": round(sum(ratings) / len(ratings), 2),
            "rating_distribution": rating_distribution
        }
    
    def export_training_data(self, output_file: str) -> int:
        all_feedback = self.get_all_feedback()
        training_data = []
        
        for feedback in all_feedback:
            rating = feedback["feedback"]["accuracy_rating"]
            if rating >= 4:
                meeting_result = feedback["meeting_result"]
                training_data.append({
                    "input": {
                        "speakers": meeting_result.get("metadata", {}).get("speakers", []),
                        "utterances": meeting_result.get("metadata", {}).get("filename", "")
                    },
                    "output": {
                        "summary": meeting_result.get("summary", {}),
                        "consensus": meeting_result.get("meeting_consensus", []),
                        "todos": meeting_result.get("todo_items", [])
                    }
                })
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(training_data, f, ensure_ascii=False, indent=2)
        
        return len(training_data)
