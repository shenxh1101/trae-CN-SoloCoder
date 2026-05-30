import re
from typing import Dict, List, Any, Optional
from llm_client import LLMClient, LLMCallError, BaseLLMService
from parser import Utterance, MeetingParser


class MeetingSummarizer(BaseLLMService):
    def _build_system_prompt(self) -> str:
        return """你是一个专业的会议记录分析助手。请仔细分析会议内容，提取关键信息并以JSON格式输出。

请按以下要求分析：
1. 按发言人提取每个人的核心观点（key_points）
2. 提取会议中提出的问题（questions）
3. 提取会议达成的共识（consensus）
4. 识别待办事项（todo_items），包括：
   - task: 任务描述
   - assignee: 负责人
   - deadline: 截止时间（如果有）
5. 提取会议中的关键时间节点（time_events），包括：
   - event: 事件描述
   - time: 时间描述
   - original_text: 原文

输出格式必须是严格的JSON，结构如下：
{
  "summary_by_speaker": {
    "发言人姓名": {
      "key_points": ["观点1", "观点2", ...],
      "questions": ["问题1", "问题2", ...]
    }
  },
  "meeting_consensus": ["共识1", "共识2", ...],
  "todo_items": [
    {"task": "任务描述", "assignee": "负责人", "deadline": "截止时间或空字符串"}
  ],
  "time_events": [
    {"event": "事件描述", "time": "时间描述", "original_text": "原文"}
  ],
  "overall_summary": "会议整体摘要"
}"""

    def _build_user_prompt(self, meeting_text: str, speakers: List[str]) -> str:
        speaker_list = "、".join(speakers)
        return f"""请分析以下会议记录。参会人员包括：{speaker_list}

会议记录：
{meeting_text}

请按要求输出JSON格式的分析结果。"""

    def execute(self, utterances: List[Utterance], parser: MeetingParser) -> Dict[str, Any]:
        meeting_text = parser.get_full_text(utterances)
        speakers = list(set(utt.speaker for utt in utterances))
        
        messages = [
            {"role": "system", "content": self._build_system_prompt()},
            {"role": "user", "content": self._build_user_prompt(meeting_text, speakers)}
        ]
        
        try:
            result = self.llm.chat_completion_with_json(messages)
            
            required_keys = ["summary_by_speaker", "meeting_consensus", "todo_items", "time_events", "overall_summary"]
            for key in required_keys:
                if key not in result:
                    result[key] = [] if key != "summary_by_speaker" and key != "overall_summary" else ({} if key == "summary_by_speaker" else "")
            
            if not isinstance(result.get("summary_by_speaker"), dict):
                result["summary_by_speaker"] = {}
            if not isinstance(result.get("meeting_consensus"), list):
                result["meeting_consensus"] = []
            if not isinstance(result.get("todo_items"), list):
                result["todo_items"] = []
            if not isinstance(result.get("time_events"), list):
                result["time_events"] = []
            if not isinstance(result.get("overall_summary"), str):
                result["overall_summary"] = str(result.get("overall_summary", ""))
            
            return result
            
        except LLMCallError as e:
            print(f"  ✗ AI总结调用失败: {e}")
            print(f"  ↻ 自动降级为关键词提取模式...")
            return self._fallback_summary(utterances)
        except Exception as e:
            print(f"  ✗ AI总结未知错误: {e}")
            print(f"  ↻ 自动降级为关键词提取模式...")
            return self._fallback_summary(utterances)
    
    def _fallback_summary(self, utterances: List[Utterance]) -> Dict[str, Any]:
        fallback = SimpleSummarizer()
        return {
            "summary_by_speaker": {},
            "meeting_consensus": [],
            "todo_items": fallback.extract_todo_simple(utterances),
            "time_events": fallback.extract_time_events_simple(utterances),
            "overall_summary": "(AI总结调用失败，已降级为关键词提取模式)"
        }


class SimpleSummarizer:
    def __init__(self):
        self._todo_patterns = [
            r'(\S+?)\s*负责\s*(.+?)(?=。|$)',
            r'(\S+?)\s*需要\s*(.+?)(?=。|$)',
            r'(\S+?)\s*应该\s*(.+?)(?=。|$)',
            r'我(?:来|负责|需要|要)\s*(.+?)(?=。|$)',
        ]
        self._deadline_pattern = re.compile(
            r'(?:在|于|截止到?)?\s*'
            r'(今天|明天|后天|大后天|'
            r'(?:下|这)?周[一二三四五六日]|'
            r'(?:下|这)?星期[一二三四五六日]|'
            r'(?:下|这)?(?:周一|周二|周三|周四|周五|周六|周日)|'
            r'\d{1,2}月\d{1,2}[日号]|'
            r'\d{4}年\d{1,2}月\d{1,2}[日号]?|'
            r'(?:上午|下午|晚上|早上)\s*\d{1,2}点|'
            r'\d{1,2}点\d{0,2}分?|'
            r'月底|本月底|下月底)'
            r'(?:\s*(?:之前|以前|前))?'
        )
    
    def extract_todo_simple(self, utterances: List[Utterance]) -> List[Dict[str, str]]:
        self._current_utterances = utterances
        todos = []
        todo_keywords = ["负责", "需要", "应该", "必须", "得要"]
        action_keywords = ["完成", "提交", "准备", "整理", "发送", "跟进", "写", "部署", "部署好"]
        seen = set()
        
        for utt in utterances:
            content = utt.clean_content
            raw = utt.raw_content
            has_todo = any(k in content for k in todo_keywords)
            has_action = any(k in content for k in action_keywords)
            
            if has_todo or has_action:
                assignee = self._extract_assignee(content, utt.speaker)
                task = self._extract_task(content)
                deadline = self._extract_deadline(raw)
                
                dedup_key = f"{assignee}:{task[:20]}"
                if dedup_key in seen:
                    continue
                seen.add(dedup_key)
                
                todo = {
                    "task": task,
                    "assignee": assignee,
                    "deadline": deadline
                }
                todos.append(todo)
        
        return todos
    
    def _extract_assignee(self, content: str, speaker: str) -> str:
        if re.search(r'我(?:来|负责|需要|要)', content):
            return speaker
        
        known_names = set()
        for utt in getattr(self, '_current_utterances', []):
            known_names.add(utt.speaker)
        
        named_match = re.search(r'(\S{1,4})负责', content)
        if named_match:
            name = named_match.group(1)
            if known_names and name in known_names:
                return name
            if re.match(r'^[\u4e00-\u9fff]{2,4}$', name) and name not in ("的", "让", "要", "把", "被", "谁"):
                if not re.search(r'[，。、！？]$', name) and len(name) >= 2:
                    return name
        
        need_match = re.search(r'(\S{1,4})需要', content)
        if need_match:
            name = need_match.group(1)
            if known_names and name in known_names:
                return name
            if re.match(r'^[\u4e00-\u9fff]{1,4}$', name) and name not in ("的", "让", "要"):
                return name
        
        return speaker
    
    def _extract_task(self, content: str) -> str:
        for pattern in [r'负责\s*(.+?)(?=。|$)', r'需要\s*(.+?)(?=。|$)', r'准备\s*(.+?)(?=。|$)']:
            match = re.search(pattern, content)
            if match:
                return match.group(1).strip()
        sentences = re.split(r'[。！？]', content)
        for s in sentences:
            if any(k in s for k in ["完成", "提交", "准备", "部署"]):
                return s.strip()
        return content[:60].strip()
    
    def _extract_deadline(self, text: str) -> str:
        match = self._deadline_pattern.search(text)
        if match:
            return match.group(1).strip()
        
        simple_time = re.search(r'(今天|明天|后天|下周[一二三四五六日]|周[一二三四五六日]|\d+月\d+[日号])', text)
        if simple_time:
            return simple_time.group(1)
        return ""
    
    def extract_time_events_simple(self, utterances: List[Utterance]) -> List[Dict[str, str]]:
        events = []
        time_keywords = ["周一", "周二", "周三", "周四", "周五", "周六", "周日",
                         "下周一", "下周二", "下周三", "下周四", "下周五", "下周六", "下周日",
                         "今天", "明天", "后天", "评审", "截止", "发布", "联调", "测试"]
        seen = set()
        
        for utt in utterances:
            content = utt.clean_content
            raw = utt.raw_content
            
            time_expr = self._extract_time_expression(raw)
            if not time_expr:
                continue
            
            has_time = any(k in content for k in time_keywords)
            if not has_time:
                continue
            
            dedup_key = time_expr
            if dedup_key in seen:
                continue
            seen.add(dedup_key)
            
            event = {
                "event": self._extract_event_description(content),
                "time": time_expr,
                "original_text": f"{utt.speaker}: {utt.raw_content}"
            }
            events.append(event)
        
        return events
    
    def _extract_time_expression(self, text: str) -> str:
        patterns = [
            r'(下?周[一二三四五六日]\s*(?:下午|上午|晚上)?\s*\d{1,2}点\d{0,2}分?)',
            r'(下?星期[一二三四五六日]\s*(?:下午|上午|晚上)?\s*\d{1,2}点\d{0,2}分?)',
            r'(下?周[一二三四五六日]\s*(?:下午|上午|晚上))',
            r'((?:今天|明天|后天)\s*(?:下午|上午|晚上)?\s*\d{0,2}[点:]?\d{0,2}[分]?)',
            r'(\d{1,2}月\d{1,2}[日号]\s*(?:下午|上午|晚上)?\s*\d{0,2}[点:]?\d{0,2}[分]?)',
            r'((?:下午|上午|晚上)\s*\d{1,2}点\d{0,2}分?)',
            r'(下?周[一二三四五六日])',
            r'(今天|明天|后天)',
            r'(周[一二三四五六日])',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        return ""
    
    def _extract_event_description(self, content: str) -> str:
        patterns = [
            r'(?:有|进行|参加|安排)(?:一个|一次)?(.{2,20}?(?:会议|评审|测试|联调|发布|培训|面试))',
            r'(.{2,15}?(?:会议|评审|测试|联调|发布))',
        ]
        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                desc = match.group(1).strip()
                desc = re.sub(r'^[，,\s]+', '', desc)
                return desc
        sentences = re.split(r'[。！？]', content)
        for s in sentences:
            s_clean = s.strip()
            s_clean = re.sub(r'^[，,\s]+', '', s_clean)
            if any(k in s_clean for k in ["会议", "评审", "测试", "联调", "截止"]):
                return s_clean[:50]
        result = content[:50].strip()
        result = re.sub(r'^[，,\s]+', '', result)
        return result


def merge_summary_with_stats(summary: Dict, stats: Dict, metadata: Dict) -> Dict:
    result = {
        "metadata": metadata,
        "speaker_statistics": stats,
        "summary": summary.get("summary_by_speaker", {}),
        "meeting_consensus": summary.get("meeting_consensus", []),
        "todo_items": summary.get("todo_items", []),
        "time_events": summary.get("time_events", []),
        "overall_summary": summary.get("overall_summary", "")
    }
    return result
