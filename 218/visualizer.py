"""
终端ASCII波形可视化模块
"""
import numpy as np


class WaveformVisualizer:
    def __init__(self, width=80, height=15):
        self.width = width
        self.height = height
        self.wave_chars = ['█', '▓', '▒', '░', '│']
        self.beat_marker = '◆'
        self.zero_line = '─'
    
    def plot_waveform(self, y, sr, beats=None, start_time=0, duration=None):
        if duration is None:
            duration = min(30, len(y) / sr)
        
        end_idx = int((start_time + duration) * sr)
        start_idx = int(start_time * sr)
        y_segment = y[start_idx:end_idx]
        
        samples_per_col = max(1, len(y_segment) // self.width)
        
        downsampled = []
        for i in range(self.width):
            start = i * samples_per_col
            end = start + samples_per_col
            if end <= len(y_segment):
                chunk = y_segment[start:end]
                downsampled.append((np.max(chunk), np.min(chunk)))
        
        display_height = self.height - 2
        
        output = []
        
        time_label = f"时间: {start_time:.1f}s - {start_time + duration:.1f}s"
        if beats:
            time_label += f" | 拍点数: {len(beats)}"
        output.append(time_label)
        
        header = '┌' + '─' * self.width + '┐'
        output.append(header)
        
        beat_columns = set()
        if beats:
            for beat in beats:
                if start_time <= beat['time'] < start_time + duration:
                    col = int((beat['time'] - start_time) / duration * self.width)
                    if 0 <= col < self.width:
                        beat_columns.add(col)
        
        for row in range(display_height):
            line = '│'
            
            threshold_top = 1.0 - (row / display_height) * 2
            threshold_bottom = 1.0 - ((row + 1) / display_height) * 2
            
            for col in range(self.width):
                if col < len(downsampled):
                    peak_max, peak_min = downsampled[col]
                    
                    in_range = (peak_max >= threshold_bottom and peak_min <= threshold_top)
                    
                    if col in beat_columns and abs(threshold_top - 1.0) < 0.1:
                        line += self.beat_marker
                    elif in_range:
                        intensity = int((peak_max - peak_min) * 4)
                        intensity = min(3, max(0, intensity))
                        line += self.wave_chars[intensity]
                    elif abs(threshold_top) < 0.1:
                        line += self.zero_line
                    else:
                        line += ' '
                else:
                    line += ' '
            
            line += '│'
            output.append(line)
        
        footer = '└' + '─' * self.width + '┘'
        output.append(footer)
        
        if beats:
            legend = f"图例: {self.beat_marker}=拍点 | {self.wave_chars[0]}=波形 | {self.zero_line}=零电平"
            output.append(legend)
        
        print('\n'.join(output))
    
    def plot_beats_only(self, beats, duration, width=80):
        output = []
        
        output.append(f"拍点位置分布图 (时长: {duration:.1f}秒)")
        output.append('┌' + '─' * width + '┐')
        
        beat_positions = set()
        for beat in beats:
            pos = int(beat['time'] / duration * width)
            if 0 <= pos < width:
                beat_positions.add(pos)
        
        line = '│'
        for i in range(width):
            if i in beat_positions:
                line += self.beat_marker
            else:
                line += ' '
        line += '│'
        output.append(line)
        
        output.append('└' + '─' * width + '┘')
        
        output.append(f"总计: {len(beats)} 个拍点")
        
        print('\n'.join(output))
    
    def plot_strength_distribution(self, beats, width=60):
        strengths = [b['strength'] for b in beats]
        
        output = []
        output.append("拍点强度分布")
        output.append('┌' + '─' * width + '┐')
        
        buckets = [0] * 10
        for s in strengths:
            bucket = min(9, int(s * 10))
            buckets[bucket] += 1
        
        max_count = max(buckets) if buckets else 1
        
        for i in range(10):
            bucket_start = i * 0.1
            bucket_end = (i + 1) * 0.1
            count = buckets[i]
            bar_length = int(count / max_count * (width - 15))
            bar = '█' * bar_length
            output.append(f"│ {bucket_start:.1f}-{bucket_end:.1f} | {bar:<{width-15}} │")
        
        output.append('└' + '─' * width + '┘')
        output.append(f"平均强度: {np.mean(strengths):.3f} | 最强: {max(strengths):.3f}")
        
        print('\n'.join(output))
