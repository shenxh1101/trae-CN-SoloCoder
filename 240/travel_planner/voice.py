import platform
import subprocess
from typing import Optional
from .models import TravelPlan, DayPlan


class VoiceAnnouncer:
    def __init__(self):
        self.system = platform.system()
        self._voice_available = self._check_voice_available()

    def _check_voice_available(self) -> bool:
        try:
            if self.system == "Darwin":
                result = subprocess.run(
                    ["say", "-v", "?"], capture_output=True, text=True
                )
                return result.returncode == 0
            elif self.system == "Windows":
                return True
            elif self.system == "Linux":
                result = subprocess.run(
                    ["which", "espeak"], capture_output=True, text=True
                )
                return result.returncode == 0
            return False
        except Exception:
            return False

    def _speak_mac(self, text: str, rate: int = 200) -> bool:
        try:
            voice = "Tingting"
            subprocess.run(["say", "-v", voice, "-r", str(rate), text])
            return True
        except Exception:
            try:
                subprocess.run(["say", "-r", str(rate), text])
                return True
            except Exception:
                return False

    def _speak_windows(self, text: str, rate: int = 200) -> bool:
        try:
            import pyttsx3

            engine = pyttsx3.init()
            engine.setProperty("rate", rate)
            
            voices = engine.getProperty("voices")
            for voice in voices:
                if "Chinese" in voice.name or "中文" in voice.name:
                    engine.setProperty("voice", voice.id)
                    break
            
            engine.say(text)
            engine.runAndWait()
            return True
        except Exception:
            return False

    def _speak_linux(self, text: str, rate: int = 200) -> bool:
        try:
            speed_param = f"-s {rate * 5}"
            subprocess.run(
                ["espeak", "-v", "zh", speed_param, text],
                capture_output=True,
            )
            return True
        except Exception:
            return False

    def speak(self, text: str, rate: int = 200) -> bool:
        if not self._voice_available:
            return False
        
        if self.system == "Darwin":
            return self._speak_mac(text, rate)
        elif self.system == "Windows":
            return self._speak_windows(text, rate)
        elif self.system == "Linux":
            return self._speak_linux(text, rate)
        return False

    def announce_day_plan(self, day_plan: DayPlan, verbose: bool = False) -> None:
        print(f"\n{'='*50}")
        print(f"🔊 正在播报: 第{day_plan.day_number}天行程")
        print(f"{'='*50}\n")
        
        intro = f"今天是旅行的第{day_plan.day_number}天，我们在{day_plan.city}。"
        print(f"📍 {intro}")
        self.speak(intro)
        
        for activity in day_plan.activities:
            if verbose:
                detail = self._get_activity_detail(activity)
                print(f"  📢 {detail}")
                self.speak(detail, rate=190)
            else:
                summary = self._get_activity_summary(activity)
                if summary:
                    print(f"  📢 {summary}")
                    self.speak(summary, rate=200)
        
        outro = f"以上就是第{day_plan.day_number}天的全部行程安排。"
        print(f"\n✅ {outro}")
        self.speak(outro)

    def _get_activity_summary(self, activity) -> str:
        if activity.attraction:
            return f"{activity.time_slot}，游览{activity.attraction.name}。"
        elif activity.restaurant:
            return f"{activity.time_slot}，在{activity.restaurant.name}用餐。"
        elif activity.transport:
            return f"{activity.time_slot}，乘坐{activity.transport.transport_type.value}前往下一地点。"
        return ""

    def _get_activity_detail(self, activity) -> str:
        if activity.attraction:
            attr = activity.attraction
            return (
                f"{activity.time_slot}，我们将游览{attr.name}。"
                f"这是一个{attr.category}景点，评分{attr.rating}分。"
                f"门票{attr.ticket_price}元，建议游览{attr.avg_visit_time}小时。"
            )
        elif activity.restaurant:
            rest = activity.restaurant
            return (
                f"{activity.time_slot}，我们在{rest.name}用餐。"
                f"这里主打{rest.cuisine}，人均约{rest.avg_price}元。"
            )
        elif activity.transport:
            trans = activity.transport
            return (
                f"接下来我们从{trans.from_place}前往{trans.to_place}，"
                f"乘坐{trans.transport_type.value}，大约需要{trans.duration}。"
            )
        return ""

    def announce_travel_plan(
        self, plan: TravelPlan, day_number: Optional[int] = None, verbose: bool = False
    ) -> None:
        intro = f"欢迎收听您的{plan.title}语音播报。"
        print(f"\n{'='*60}")
        print(f"🎙️ {intro}")
        print(f"{'='*60}")
        self.speak(intro)
        
        if day_number:
            for day in plan.days:
                if day.day_number == day_number:
                    self.announce_day_plan(day, verbose)
                    return
            print(f"❌ 未找到第{day_number}天的行程")
        else:
            for day in plan.days:
                self.announce_day_plan(day, verbose)
        
        outro = f"感谢收听，祝您旅途愉快！"
        print(f"\n🎧 {outro}")
        self.speak(outro)

    def is_available(self) -> bool:
        return self._voice_available

    def get_voice_status(self) -> str:
        if self._voice_available:
            return f"✅ 语音播报可用（系统: {self.system}）"
        else:
            return (
                f"❌ 语音播报不可用\n"
                f"💡 请安装对应系统的语音引擎:\n"
                f"   - macOS: 系统自带 (say 命令)\n"
                f"   - Windows: pip install pyttsx3\n"
                f"   - Linux: sudo apt-get install espeak"
            )

    def announce_first_day_summary(self, plan: TravelPlan) -> None:
        if not plan.days:
            print("❌ 没有可用的行程")
            return
        
        first_day = plan.days[0]
        
        print(f"\n{'='*60}")
        print(f"🎙️ 第1天行程摘要播报")
        print(f"{'='*60}")
        print(f"📍 {plan.title}")
        print(f"📅 第{first_day.day_number}天 - {first_day.city}")
        print(f"{'='*60}\n")
        
        intro = (
            f"您好！欢迎使用AI旅行规划师。"
            f"我来为您播报{plan.title}的第一天行程摘要。"
            f"今天是旅行的第一天，我们在{first_day.city}。"
            f"当天预计花费{first_day.total_cost:.0f}元。"
            f"步行强度为{first_day.walking_intensity}。"
        )
        
        activities = []
        for activity in first_day.activities:
            if activity.attraction:
                activities.append(f"{activity.time_slot}游览{activity.attraction.name}")
            elif activity.restaurant:
                activities.append(f"{activity.time_slot}在{activity.restaurant.name}用餐")
        
        if activities:
            summary_text = "今天的主要安排有：" + "，".join(activities[:4])
            if len(activities) > 4:
                summary_text += f"，还有{len(activities)-4}项其他安排。"
        else:
            summary_text = ""
        
        warning_text = ""
        if first_day.holiday_warning:
            first_warning = first_day.holiday_warning.split('\n')[0]
            if "人流指数" in first_warning:
                warning_parts = first_warning.split('人流指数: ')
                if len(warning_parts) > 1:
                    crowd_info = warning_parts[1].split(' ')[0]
                    warning_text = f"温馨提示，今天的人流指数为{crowd_info}，请注意错峰出行。"
        
        weather_text = ""
        if first_day.weather_hint:
            weather_text = f"天气提示：{first_day.weather_hint[:50]}。"
        
        outro = (
            "以上就是第一天的行程摘要。"
            "如需了解详细行程，可以查看完整计划或让我播报详细安排。"
            "祝您旅途愉快！"
        )
        
        full_text = intro + " " + summary_text + " " + warning_text + " " + weather_text + " " + outro
        
        if self._voice_available:
            print(f"📢 正在播放语音...")
            print(f"📝 播报内容:")
            print(f"   您好！欢迎使用AI旅行规划师...")
            print(f"   {plan.title}的第一天行程摘要")
            print(f"   城市：{first_day.city}，预算：¥{first_day.total_cost:.0f}")
            if activities:
                print(f"   安排：{', '.join(activities[:3])}...")
            print(f"   祝您旅途愉快！")
            print(f"\n   🔊 语音播放中...请听音频")
            
            success = self.speak(intro, rate=195)
            if summary_text:
                self.speak(summary_text, rate=200)
            if warning_text:
                self.speak(warning_text, rate=190)
            if weather_text:
                self.speak(weather_text, rate=200)
            self.speak(outro, rate=195)
            
            if success:
                print(f"\n✅ 语音播放完成！")
            else:
                print(f"\n⚠️  语音播放可能遇到问题，请查看下方文本手动阅读")
                self._print_reading_guide(full_text)
        else:
            print(f"⚠️  语音播报不可用")
            print(f"   请阅读下方的行程摘要文本：")
            self._print_reading_guide(full_text)
        
        print(f"\n{'='*60}")
    
    def _print_reading_guide(self, full_text: str):
        print(f"\n{'─'*58}")
        print(f"📖 手动阅读版：")
        print(f"{'─'*58}")
        sentences = [s.strip() + "。" if not s.strip().endswith("。") and s.strip() else s.strip() 
                    for s in full_text.split("。") if s.strip()]
        for i, sentence in enumerate(sentences, 1):
            if sentence.strip():
                print(f"   {i:2d}. {sentence[:100]}")
        print(f"{'─'*58}")
