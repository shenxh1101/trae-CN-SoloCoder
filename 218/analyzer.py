"""
核心节奏分析模块
支持真实分析(librosa)和模拟分析两种模式
"""
import os
import random
import warnings
import numpy as np


class RhythmAnalyzer:
    def __init__(self, simulate=False):
        self.simulate = simulate
        self.librosa_available = False
        
        if not simulate:
            try:
                import librosa
                self.librosa = librosa
                self.librosa_available = True
            except ImportError:
                warnings.warn(
                    "librosa未安装，将使用模拟模式。\n"
                    "安装命令: pip install librosa"
                )
                self.simulate = True
    
    def analyze(self, audio_file):
        if not os.path.exists(audio_file):
            raise FileNotFoundError(f"文件不存在: {audio_file}")
        
        if self.simulate:
            return self._simulate_analysis(audio_file)
        else:
            return self._real_analysis(audio_file)
    
    def _real_analysis(self, audio_file):
        y, sr = self.librosa.load(audio_file, duration=180)
        
        tempo, beat_frames = self.librosa.beat.beat_track(y=y, sr=sr)
        
        if hasattr(tempo, '__iter__'):
            tempo = float(tempo[0]) if len(tempo) > 0 else 120.0
        
        beat_times = self.librosa.frames_to_time(beat_frames, sr=sr)
        
        onset_env = self.librosa.onset.onset_strength(y=y, sr=sr)
        beat_strengths = []
        for frame in beat_frames:
            if frame < len(onset_env):
                beat_strengths.append(float(onset_env[frame]))
            else:
                beat_strengths.append(0.5)
        
        max_strength = max(beat_strengths) if beat_strengths else 1
        normalized_strengths = [s / max_strength for s in beat_strengths]
        
        beats = []
        for time, strength in zip(beat_times, normalized_strengths):
            beats.append({
                'time': float(time),
                'strength': float(strength),
                'frame': int(self.librosa.time_to_frames(time, sr=sr))
            })
        
        return {
            'bpm': float(tempo),
            'beats': beats,
            'duration': float(self.librosa.get_duration(y=y, sr=sr)),
            'sample_rate': int(sr),
            'sr': int(sr),
            'y': y,
            'filename': os.path.basename(audio_file)
        }
    
    def _simulate_analysis(self, audio_file):
        random.seed(hash(audio_file) & 0xFFFFFFFF)
        
        duration = random.uniform(120, 360)
        bpm = random.uniform(85, 175)
        
        beat_interval = 60.0 / bpm
        num_beats = int(duration / beat_interval)
        
        beats = []
        current_time = 0
        
        for i in range(num_beats):
            jitter = random.uniform(-0.01, 0.01)
            beat_time = current_time + jitter
            
            if beat_time < duration:
                strength = random.uniform(0.3, 1.0)
                if i % 4 == 0:
                    strength = max(0.6, strength)
                
                beats.append({
                    'time': float(beat_time),
                    'strength': float(strength),
                    'frame': int(beat_time * 22050 / 512)
                })
            
            current_time += beat_interval
        
        return {
            'bpm': float(bpm),
            'beats': beats,
            'duration': float(duration),
            'sample_rate': 22050,
            'sr': 22050,
            'filename': os.path.basename(audio_file),
            'simulated': True
        }
