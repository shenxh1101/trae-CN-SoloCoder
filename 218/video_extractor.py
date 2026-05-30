"""
视频音频提取模块

依赖说明:
  - ffmpeg: 用于从视频文件提取音频轨道（外部工具，非Python包）
    安装方式:
      macOS:   brew install ffmpeg
      Ubuntu:  sudo apt install ffmpeg
      Windows: 从 https://ffmpeg.org/download.html 下载并添加到PATH
    验证安装: ffmpeg -version
    注意: 如果未安装ffmpeg，模块将自动切换到模拟模式生成测试音频
"""
import os
import subprocess
import warnings
import tempfile


class VideoExtractor:
    def __init__(self):
        self.ffmpeg_available = self._check_ffmpeg()
        
        if not self.ffmpeg_available:
            warnings.warn(
                "ffmpeg未安装，将使用模拟模式。\n"
                "请安装ffmpeg以启用真实视频音频提取功能。"
            )
    
    def _check_ffmpeg(self):
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def extract_audio(self, video_file, output_file=None):
        if not os.path.exists(video_file):
            raise FileNotFoundError(f"视频文件不存在: {video_file}")
        
        if output_file is None:
            temp_dir = tempfile.gettempdir()
            base_name = os.path.splitext(os.path.basename(video_file))[0]
            output_file = os.path.join(temp_dir, f"{base_name}_extracted.wav")
        
        if self.ffmpeg_available:
            self._extract_with_ffmpeg(video_file, output_file)
        else:
            output_file = self._simulate_extraction(video_file, output_file)
        
        return output_file
    
    def _extract_with_ffmpeg(self, video_file, output_file):
        print(f"正在从视频提取音频...")
        
        cmd = [
            'ffmpeg',
            '-i', video_file,
            '-vn',
            '-acodec', 'pcm_s16le',
            '-ar', '22050',
            '-ac', '1',
            '-y',
            output_file
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"ffmpeg执行失败: {result.stderr}")
            
            if not os.path.exists(output_file):
                raise RuntimeError("音频文件未生成")
            
            file_size = os.path.getsize(output_file)
            print(f"提取完成: {file_size / 1024 / 1024:.2f} MB")
            
        except subprocess.TimeoutExpired:
            raise RuntimeError("音频提取超时")
    
    def _simulate_extraction(self, video_file, output_file):
        print("[模拟模式] 正在从视频提取音频...")
        
        import random
        random.seed(hash(video_file) & 0xFFFFFFFF)
        
        duration = random.uniform(60, 300)
        sample_rate = 22050
        num_samples = int(duration * sample_rate)
        
        import wave
        import struct
        import numpy as np
        
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        with wave.open(output_file, 'w') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            
            chunk_size = sample_rate * 10
            for i in range(0, num_samples, chunk_size):
                chunk_len = min(chunk_size, num_samples - i)
                noise = np.random.normal(0, 0.1, chunk_len)
                t = np.arange(chunk_len) / sample_rate
                signal = np.sin(2 * np.pi * 440 * t) * 0.3
                combined = noise + signal
                combined = np.clip(combined, -1, 1)
                samples = (combined * 32767).astype(np.int16)
                wf.writeframes(samples.tobytes())
        
        file_size = os.path.getsize(output_file)
        print(f"[模拟] 提取完成: {file_size / 1024 / 1024:.2f} MB")
        
        return output_file
    
    def get_video_info(self, video_file):
        if not self.ffmpeg_available:
            return {
                'duration': 180.0,
                'has_audio': True,
                'simulated': True
            }
        
        try:
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                video_file
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            import json
            info = json.loads(result.stdout)
            
            duration = float(info.get('format', {}).get('duration', 0))
            has_audio = any(s.get('codec_type') == 'audio' for s in info.get('streams', []))
            
            return {
                'duration': duration,
                'has_audio': has_audio,
                'format': info.get('format', {}).get('format_name', 'unknown')
            }
            
        except Exception as e:
            print(f"获取视频信息失败: {e}")
            return {
                'duration': 0,
                'has_audio': False
            }
