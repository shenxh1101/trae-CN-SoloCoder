import os
import sys
import time
from typing import Optional
from .models import MeetingSummary
from .config import Config


class TTSGenerator:
    def __init__(self, engine: str = None):
        self.engine = engine or Config.TTS_ENGINE
        self.language = Config.LANGUAGE
        self._validate_engine()

    def _validate_engine(self):
        available = self.available_engines()
        if not available:
            print("警告: 没有可用的TTS引擎。请安装 gTTS 或 pyttsx3。")
            print("  - gTTS: pip install gTTS (需要网络连接)")
            print("  - pyttsx3: pip install pyttsx3 (离线可用)")

        if self.engine and self.engine not in available:
            print(f"警告: 指定的TTS引擎 '{self.engine}' 不可用。")
            if available:
                self.engine = available[0]
                print(f"将使用可用的引擎: {self.engine}")
            else:
                self.engine = None

    def _split_long_text(self, text: str, max_length: int = 500) -> list:
        if len(text) <= max_length:
            return [text]

        parts = []
        sentences = text.replace('。', '。|').replace('！', '！|').replace('？', '？|').split('|')

        current_part = ""
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            if len(current_part) + len(sentence) + 1 <= max_length:
                current_part += sentence + "。"
            else:
                if current_part:
                    parts.append(current_part)
                current_part = sentence + "。"

        if current_part:
            parts.append(current_part)

        return parts if parts else [text[:max_length]]

    def generate_summary_audio(
        self,
        summary: MeetingSummary,
        output_path: str,
        include_action_items: bool = True,
        verbose: bool = False
    ) -> str:
        if not self.engine:
            raise RuntimeError("没有可用的TTS引擎。请安装 gTTS 或 pyttsx3。")

        text = self._generate_summary_text(summary, include_action_items)

        if verbose:
            print(f"生成摘要文本长度: {len(text)} 字符")
            print(f"使用TTS引擎: {self.engine}")
            print(f"输出文件: {output_path}")

        return self.generate_audio(text, output_path, verbose)

    def _generate_summary_text(self, summary: MeetingSummary, include_action_items: bool) -> str:
        parts = []

        parts.append(f"会议标题：{summary.title}")
        parts.append(f"会议类型：{self._translate_meeting_type(summary.meeting_type.value)}")
        parts.append(f"会议主题：{summary.main_topic}")

        if summary.date:
            parts.append(f"会议日期：{self._format_date_for_speech(summary.date)}")

        if summary.participants:
            parts.append(f"参会人员共{len(summary.participants)}人：{', '.join(summary.participants)}")

        if summary.duration_minutes:
            parts.append(f"会议时长：{summary.duration_minutes}分钟")

        if summary.key_discussion_points:
            parts.append(f"本次会议有{len(summary.key_discussion_points)}个主要讨论点：")
            for i, dp in enumerate(summary.key_discussion_points, 1):
                parts.append(f"第{i}点，{dp.topic}。{dp.summary}")

        if summary.controversial_issues:
            parts.append(f"会议中讨论了{len(summary.controversial_issues)}个有争议的问题：")
            for i, ci in enumerate(summary.controversial_issues, 1):
                parts.append(f"第{i}个争议是：{ci.topic}")
                if ci.resolution:
                    parts.append(f"解决方案是：{ci.resolution}")

        if summary.decisions:
            parts.append(f"会议达成了{len(summary.decisions)}项决议：")
            for i, decision in enumerate(summary.decisions, 1):
                parts.append(f"决议{i}：{decision}")

        if include_action_items and summary.action_items:
            parts.append(f"需要执行的行动点共有{len(summary.action_items)}项：")
            from .action_items import ActionItemProcessor
            prioritized = ActionItemProcessor.prioritize(summary.action_items)

            for i, ai in enumerate(prioritized, 1):
                ai_text = f"第{i}项，{ai.task}"
                if ai.assignee:
                    ai_text += f"，由{ai.assignee}负责"
                if ai.due_date:
                    ai_text += f"，截止日期是{self._format_date_for_speech(ai.due_date)}"
                ai_text += f"，优先级为{self._translate_priority(ai.priority.value)}"
                parts.append(ai_text)

        parts.append("以上是本次会议的全部内容摘要。")

        return "。".join(parts)

    def _translate_meeting_type(self, mtype: str) -> str:
        mapping = {
            "standup": "敏捷站会",
            "review": "项目评审会",
            "brainstorm": "头脑风暴会议",
            "general": "普通会议"
        }
        return mapping.get(mtype, mtype)

    def _translate_priority(self, priority: str) -> str:
        mapping = {
            "high": "高优先级",
            "medium": "中等优先级",
            "low": "低优先级"
        }
        return mapping.get(priority, priority)

    def _format_date_for_speech(self, date_str: str) -> str:
        try:
            if 'T' in date_str:
                date_str = date_str.split('T')[0]

            parts = date_str.split('-')
            if len(parts) == 3:
                year, month, day = parts
                return f"{year}年{int(month)}月{int(day)}日"
        except:
            pass
        return date_str

    def generate_audio(self, text: str, output_path: str, verbose: bool = False) -> str:
        if not self.engine:
            raise RuntimeError("没有可用的TTS引擎。")

        if not text or len(text.strip()) == 0:
            raise ValueError("文本内容不能为空。")

        try:
            if self.engine == "gtts":
                return self._generate_with_gtts(text, output_path, verbose)
            elif self.engine == "pyttsx3":
                return self._generate_with_pyttsx3(text, output_path, verbose)
            else:
                raise ValueError(f"未知的TTS引擎: {self.engine}")
        except ImportError as e:
            raise RuntimeError(
                f"TTS引擎 '{self.engine}' 未安装。"
                f"请运行: pip install {self.engine}"
            ) from e
        except Exception as e:
            raise RuntimeError(f"生成音频时出错: {str(e)}") from e

    def _generate_with_gtts(self, text: str, output_path: str, verbose: bool = False) -> str:
        try:
            from gtts import gTTS
        except ImportError:
            raise RuntimeError("gTTS 未安装。请运行: pip install gTTS")

        lang = self.language if self.language else "zh-CN"

        text_parts = self._split_long_text(text, max_length=5000)

        if len(text_parts) == 1:
            if verbose:
                print("正在生成音频...")
            tts = gTTS(text=text_parts[0], lang=lang, slow=False)
            tts.save(output_path)
        else:
            if verbose:
                print(f"文本较长，分为{len(text_parts)}部分生成...")

            temp_files = []
            try:
                for i, part in enumerate(text_parts, 1):
                    if verbose:
                        print(f"  生成第 {i}/{len(text_parts)} 部分...")
                    temp_file = f"{output_path}.part{i}.mp3"
                    tts = gTTS(text=part, lang=lang, slow=False)
                    tts.save(temp_file)
                    temp_files.append(temp_file)

                self._concat_mp3_files(temp_files, output_path)
            finally:
                for temp_file in temp_files:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)

        if verbose:
            print(f"音频已保存到: {output_path}")
            file_size = os.path.getsize(output_path) / 1024
            print(f"文件大小: {file_size:.1f} KB")

        return output_path

    def _generate_with_pyttsx3(self, text: str, output_path: str, verbose: bool = False) -> str:
        try:
            import pyttsx3
        except ImportError:
            raise RuntimeError("pyttsx3 未安装。请运行: pip install pyttsx3")

        if verbose:
            print("正在初始化语音引擎...")

        engine = pyttsx3.init()

        voices = engine.getProperty('voices')
        if verbose:
            print(f"可用语音: {len(voices)} 种")
            for i, voice in enumerate(voices[:3], 1):
                print(f"  {i}. {voice.name}")

        for voice in voices:
            if 'chinese' in voice.name.lower() or 'zh' in voice.languages:
                engine.setProperty('voice', voice.id)
                if verbose:
                    print(f"已选择中文语音: {voice.name}")
                break

        engine.setProperty('rate', 150)
        engine.setProperty('volume', 0.9)

        if verbose:
            print("正在生成音频...")

        engine.save_to_file(text, output_path)
        engine.runAndWait()
        engine.stop()

        if verbose:
            print(f"音频已保存到: {output_path}")
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path) / 1024
                print(f"文件大小: {file_size:.1f} KB")

        return output_path

    def _concat_mp3_files(self, input_files: list, output_file: str):
        with open(output_file, 'wb') as outfile:
            for infile in input_files:
                with open(infile, 'rb') as f:
                    outfile.write(f.read())

    @staticmethod
    def available_engines() -> list:
        engines = []
        try:
            import gtts
            engines.append("gtts")
        except ImportError:
            pass
        try:
            import pyttsx3
            engines.append("pyttsx3")
        except ImportError:
            pass
        return engines

    @staticmethod
    def check_dependencies():
        result = {}

        try:
            import gtts
            result['gtts'] = {
                'available': True,
                'version': getattr(gtts, '__version__', 'unknown')
            }
        except ImportError as e:
            result['gtts'] = {
                'available': False,
                'error': str(e)
            }

        try:
            import pyttsx3
            result['pyttsx3'] = {
                'available': True,
                'version': getattr(pyttsx3, '__version__', 'unknown')
            }
        except ImportError as e:
            result['pyttsx3'] = {
                'available': False,
                'error': str(e)
            }

        return result
