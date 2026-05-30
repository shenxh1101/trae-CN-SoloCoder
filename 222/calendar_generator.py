import re
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from uuid import uuid4

try:
    import pytz
    PYTZ_AVAILABLE = True
except ImportError:
    PYTZ_AVAILABLE = False

try:
    from icalendar import Calendar, Event, Alarm
    ICALENDAR_AVAILABLE = True
except ImportError:
    ICALENDAR_AVAILABLE = False


class TimeEventParser:
    WEEKDAY_MAP = {
        "周一": 0, "星期一": 0,
        "周二": 1, "星期二": 1,
        "周三": 2, "星期三": 2,
        "周四": 3, "星期四": 3,
        "周五": 4, "星期五": 4,
        "周六": 5, "星期六": 5,
        "周日": 6, "星期日": 6,
    }
    
    def __init__(self, timezone: str = "Asia/Shanghai"):
        if PYTZ_AVAILABLE:
            self.tz = pytz.timezone(timezone)
        else:
            self.tz = None
    
    def _now(self) -> datetime:
        if self.tz:
            return datetime.now(self.tz)
        return datetime.now()
    
    def parse_time_expression(self, time_str: str, base_date: datetime = None) -> Optional[datetime]:
        if base_date is None:
            base_date = self._now()
        
        time_str = time_str.strip()
        if not time_str:
            return None
        
        result = self._parse_relative_day(time_str, base_date)
        if result:
            return result
        
        result = self._parse_weekday(time_str, base_date)
        if result:
            return result
        
        result = self._parse_specific_date(time_str, base_date)
        if result:
            return result
        
        return None
    
    def _parse_relative_day(self, time_str: str, base_date: datetime) -> Optional[datetime]:
        relative_days = {
            "今天": 0,
            "明天": 1,
            "后天": 2,
            "大后天": 3,
        }
        
        for keyword, delta in relative_days.items():
            if keyword in time_str:
                target_date = base_date + timedelta(days=delta)
                hour, minute = self._extract_time(time_str)
                return target_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        return None
    
    def _parse_weekday(self, time_str: str, base_date: datetime) -> Optional[datetime]:
        for keyword, target_weekday in self.WEEKDAY_MAP.items():
            if keyword in time_str:
                current_weekday = base_date.weekday()
                short_key = keyword.replace("星期", "").replace("周", "")
                
                if "下" + short_key in time_str or "下" + keyword in time_str:
                    days_ahead = (target_weekday - current_weekday + 7) % 7 + 7
                else:
                    days_ahead = (target_weekday - current_weekday + 7) % 7
                    if days_ahead == 0:
                        days_ahead = 7
                
                target_date = base_date + timedelta(days=days_ahead)
                hour, minute = self._extract_time(time_str)
                return target_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        am_pm_match = re.search(r'(下午|上午|晚上|早上)\s*(\d{1,2})[点:：](\d{1,2})?[分]?', time_str)
        if am_pm_match:
            period = am_pm_match.group(1)
            hour = int(am_pm_match.group(2))
            minute = int(am_pm_match.group(3)) if am_pm_match.group(3) else 0
            
            if period in ("下午", "晚上") and hour < 12:
                hour += 12
            
            target_date = base_date + timedelta(days=1)
            return target_date.replace(hour=min(hour, 23), minute=min(minute, 59), second=0, microsecond=0)
        
        return None
    
    def _parse_specific_date(self, time_str: str, base_date: datetime) -> Optional[datetime]:
        patterns = [
            r"(\d{1,2})月(\d{1,2})[日号]",
            r"(\d{4})年(\d{1,2})月(\d{1,2})[日号]?",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, time_str)
            if match:
                groups = match.groups()
                if len(groups) == 2:
                    month, day = int(groups[0]), int(groups[1])
                    year = base_date.year
                    if month < base_date.month or (month == base_date.month and day < base_date.day):
                        year += 1
                else:
                    year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                
                try:
                    hour, minute = self._extract_time(time_str)
                    return base_date.replace(year=year, month=month, day=day, 
                                            hour=hour, minute=minute, second=0, microsecond=0)
                except ValueError:
                    pass
        
        return None
    
    def _extract_time(self, time_str: str) -> tuple:
        cn_num_map = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
                      "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
                      "十一": 11, "十二": 12, "两": 2}
        
        for cn_num, val in cn_num_map.items():
            time_str_for_match = time_str
            time_str_for_match = re.sub(
                cn_num + r'(?=点)', str(val), time_str_for_match
            )
            if time_str_for_match != time_str:
                time_str = time_str_for_match
                break
        
        cn_hour_match = re.search(r'([一二三四五六七八九十两]+)点', time_str)
        if cn_hour_match:
            cn_hour = cn_hour_match.group(1)
            if cn_hour in cn_num_map:
                hour = cn_num_map[cn_hour]
                if "下午" in time_str or "晚上" in time_str:
                    if hour < 12:
                        hour += 12
                return min(hour, 23), 0
        
        time_patterns = [
            r"(\d{1,2})[点:：](\d{1,2})[分]?",
            r"(\d{1,2})点",
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, time_str)
            if match:
                groups = match.groups()
                hour = int(groups[0])
                minute = int(groups[1]) if len(groups) > 1 and groups[1] else 0
                
                if "下午" in time_str or "晚上" in time_str:
                    if hour < 12:
                        hour += 12
                
                return min(hour, 23), min(minute, 59)
        
        if "上午" in time_str or "早上" in time_str:
            return 9, 0
        elif "下午" in time_str:
            return 14, 0
        elif "晚上" in time_str:
            return 19, 0
        
        return 10, 0


def _format_dt_ics(dt: datetime) -> str:
    return dt.strftime("%Y%m%dT%H%M%S")


class CalendarGenerator:
    def __init__(self, timezone: str = "Asia/Shanghai"):
        self.timezone = timezone
        self.time_parser = TimeEventParser(timezone)
    
    def generate_ics_from_events(self, events: List[Dict[str, Any]], 
                                 output_file: str,
                                 default_duration_hours: int = 1) -> str:
        if ICALENDAR_AVAILABLE:
            return self._generate_with_icalendar(events, output_file, default_duration_hours)
        else:
            return self._generate_manual(events, output_file, default_duration_hours)
    
    def _generate_manual(self, events: List[Dict[str, Any]], 
                         output_file: str,
                         default_duration_hours: int) -> str:
        lines = []
        lines.append("BEGIN:VCALENDAR")
        lines.append("VERSION:2.0")
        lines.append("PRODID:-//Meeting Summarizer//CN")
        lines.append("CALSCALE:GREGORIAN")
        lines.append(f"X-WR-TIMEZONE:{self.timezone}")
        lines.append("METHOD:PUBLISH")
        
        now = self.time_parser._now()
        dtstamp = _format_dt_ics(now)
        
        for event_data in events:
            event_desc = event_data.get("event", "")
            time_desc = event_data.get("time", "")
            original_text = event_data.get("original_text", "")
            
            event_start = self.time_parser.parse_time_expression(time_desc)
            
            if event_start is None:
                event_start = now + timedelta(days=1)
                event_start = event_start.replace(hour=10, minute=0, second=0, microsecond=0)
            
            event_end = event_start + timedelta(hours=default_duration_hours)
            
            uid = f"{uuid4()}@meeting-summarizer"
            summary = event_desc[:50] if event_desc else "会议提醒"
            description = f"{event_desc}\\n\\n原文: {original_text}"
            
            lines.append("BEGIN:VEVENT")
            lines.append(f"UID:{uid}")
            lines.append(f"DTSTAMP:{dtstamp}")
            lines.append(f"DTSTART;TZID={self.timezone}:{_format_dt_ics(event_start)}")
            lines.append(f"DTEND;TZID={self.timezone}:{_format_dt_ics(event_end)}")
            lines.append(f"SUMMARY:{summary}")
            lines.append(f"DESCRIPTION:{description}")
            lines.append("BEGIN:VALARM")
            lines.append("ACTION:DISPLAY")
            lines.append(f"DESCRIPTION:提醒: {summary[:30]}")
            lines.append("TRIGGER:-PT30M")
            lines.append("END:VALARM")
            lines.append("END:VEVENT")
        
        lines.append("END:VCALENDAR")
        
        ics_content = "\r\n".join(lines)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(ics_content)
        
        return output_file
    
    def _generate_with_icalendar(self, events: List[Dict[str, Any]], 
                                  output_file: str,
                                  default_duration_hours: int) -> str:
        cal = Calendar()
        cal.add('prodid', '-//Meeting Summarizer//CN')
        cal.add('version', '2.0')
        cal.add('calscale', 'GREGORIAN')
        cal.add('x-wr-timezone', self.timezone)
        
        now = self.time_parser._now()
        
        for event_data in events:
            event_desc = event_data.get("event", "")
            time_desc = event_data.get("time", "")
            original_text = event_data.get("original_text", "")
            
            event_start = self.time_parser.parse_time_expression(time_desc)
            
            if event_start is None:
                event_start = now + timedelta(days=1)
                event_start = event_start.replace(hour=10, minute=0, second=0, microsecond=0)
            
            event_end = event_start + timedelta(hours=default_duration_hours)
            
            event = Event()
            event.add('uid', f"{uuid4()}@meeting-summarizer")
            event.add('dtstamp', now)
            event.add('dtstart', event_start)
            event.add('dtend', event_end)
            event.add('summary', event_desc[:50] if event_desc else "会议提醒")
            event.add('description', f"{event_desc}\n\n原文: {original_text}")
            
            alarm = Alarm()
            alarm.add('action', 'DISPLAY')
            alarm.add('description', '提醒: ' + (event_desc[:30] if event_desc else "会议"))
            alarm.add('trigger', timedelta(minutes=-30))
            event.add_component(alarm)
            
            cal.add_component(event)
        
        with open(output_file, 'wb') as f:
            f.write(cal.to_ical())
        
        return output_file
    
    def generate_ics_from_todos(self, todos: List[Dict[str, Any]], 
                                output_file: str) -> str:
        events = []
        for todo in todos:
            task = todo.get("task", "")
            deadline = todo.get("deadline", "")
            assignee = todo.get("assignee", "")
            
            events.append({
                "event": f"待办: {task} (负责人: {assignee})",
                "time": deadline,
                "original_text": task
            })
        
        return self.generate_ics_from_events(events, output_file, default_duration_hours=1)
