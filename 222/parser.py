import re
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from config import Config

class Utterance:
    def __init__(self, speaker: str, content: str, line_number: int = 0, ignore_fillers: bool = True):
        self.speaker = speaker.strip()
        self.raw_content = content
        self.ignore_fillers = ignore_fillers
        self.clean_content = self._clean_content(content)
        self.word_count = len(self.clean_content)
        self.line_number = line_number
        self.timestamp = None

    def _clean_content(self, content: str) -> str:
        cleaned = content.strip()
        if self.ignore_fillers:
            for filler in Config.FILLER_WORDS:
                cleaned = cleaned.replace(filler, "")
            cleaned = re.sub(r'[，,\s]+(?=[，,])', '', cleaned)
            cleaned = re.sub(r'^[，,\s]+', '', cleaned)
            cleaned = re.sub(r'[，,\s]+$', '', cleaned)
            cleaned = re.sub(r'([。！？])\s*[，,]', r'\1', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned)
        return cleaned.strip()

    def estimated_duration_minutes(self) -> float:
        return self.word_count / Config.ESTIMATED_WORDS_PER_MINUTE

    def __repr__(self):
        return f"Utterance(speaker='{self.speaker}', content='{self.clean_content[:30]}...')"


class MeetingParser:
    def __init__(self, ignore_fillers: bool = True):
        self.ignore_fillers = ignore_fillers
        self.speaker_pattern = re.compile(r'^([^:：]+)[:：]\s*(.+)$')

    def parse_file(self, file_path: str) -> List[Utterance]:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        return self.parse_lines(lines)

    def parse_lines(self, lines: List[str]) -> List[Utterance]:
        utterances = []
        current_speaker = None
        current_content = []
        line_number = 0

        for idx, line in enumerate(lines, 1):
            line = line.rstrip('\n')
            if not line.strip():
                continue

            match = self.speaker_pattern.match(line)
            
            if match:
                if current_speaker and current_content:
                    utterances.append(Utterance(
                        current_speaker,
                        ' '.join(current_content),
                        line_number,
                        ignore_fillers=self.ignore_fillers
                    ))
                
                current_speaker = match.group(1)
                current_content = [match.group(2)]
                line_number = idx
            else:
                if current_speaker:
                    current_content.append(line)
                else:
                    pass

        if current_speaker and current_content:
            utterances.append(Utterance(
                current_speaker,
                ' '.join(current_content),
                line_number,
                ignore_fillers=self.ignore_fillers
            ))

        return utterances

    def group_by_speaker(self, utterances: List[Utterance]) -> Dict[str, List[Utterance]]:
        groups = {}
        for utt in utterances:
            if utt.speaker not in groups:
                groups[utt.speaker] = []
            groups[utt.speaker].append(utt)
        return groups

    def get_speaker_stats(self, utterances: List[Utterance]) -> Dict[str, Dict]:
        groups = self.group_by_speaker(utterances)
        stats = {}
        
        for speaker, utts in groups.items():
            total_words = sum(utt.word_count for utt in utts)
            total_duration = sum(utt.estimated_duration_minutes() for utt in utts)
            stats[speaker] = {
                'utterance_count': len(utts),
                'total_words': total_words,
                'estimated_duration_minutes': round(total_duration, 2),
                'avg_words_per_utterance': round(total_words / len(utts), 1) if utts else 0
            }
        
        return stats

    def get_meeting_metadata(self, utterances: List[Utterance], filename: str = "") -> Dict:
        total_words = sum(utt.word_count for utt in utterances)
        total_duration = sum(utt.estimated_duration_minutes() for utt in utterances)
        speakers = set(utt.speaker for utt in utterances)
        
        return {
            'filename': filename,
            'total_utterances': len(utterances),
            'total_words': total_words,
            'estimated_duration_minutes': round(total_duration, 2),
            'speaker_count': len(speakers),
            'speakers': sorted(list(speakers)),
            'parsed_at': datetime.now().isoformat()
        }

    def get_full_text(self, utterances: List[Utterance], by_speaker: bool = False) -> str:
        if by_speaker:
            groups = self.group_by_speaker(utterances)
            parts = []
            for speaker, utts in groups.items():
                content = ' '.join(utt.clean_content for utt in utts)
                parts.append(f"{speaker}: {content}")
            return '\n\n'.join(parts)
        else:
            return '\n'.join(f"{utt.speaker}: {utt.clean_content}" for utt in utterances)
