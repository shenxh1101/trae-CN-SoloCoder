"""
批量文件夹分析模块
"""
import os
import csv
import numpy as np
from analyzer import RhythmAnalyzer


class BatchAnalyzer:
    def __init__(self, simulate=False):
        self.analyzer = RhythmAnalyzer(simulate=simulate)
        self.results = []
        self.audio_extensions = {'.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'}
    
    def analyze_folder(self, folder_path):
        if not os.path.isdir(folder_path):
            raise NotADirectoryError(f"目录不存在: {folder_path}")
        
        audio_files = []
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in self.audio_extensions:
                    audio_files.append(os.path.join(root, file))
        
        if not audio_files:
            print("未找到音频文件")
            return {'summary': '未找到音频文件', 'results': []}
        
        print(f"找到 {len(audio_files)} 个音频文件\n")
        
        self.results = []
        
        for i, audio_file in enumerate(audio_files, 1):
            filename = os.path.basename(audio_file)
            print(f"[{i}/{len(audio_files)}] 分析: {filename}...", end=' ', flush=True)
            
            try:
                result = self.analyzer.analyze(audio_file)
                self.results.append({
                    'file': audio_file,
                    'filename': filename,
                    'bpm': result['bpm'],
                    'beat_count': len(result['beats']),
                    'duration': result['duration'],
                    'status': 'success'
                })
                print(f"完成 - BPM: {result['bpm']:.1f}")
            except Exception as e:
                self.results.append({
                    'file': audio_file,
                    'filename': filename,
                    'bpm': None,
                    'beat_count': 0,
                    'duration': 0,
                    'status': f'error: {str(e)}'
                })
                print(f"失败 - {e}")
        
        summary = self._generate_summary()
        return {'summary': summary, 'results': self.results}
    
    def _generate_summary(self):
        successful = [r for r in self.results if r['status'] == 'success']
        
        if not successful:
            return "没有成功分析的文件"
        
        bpms = [r['bpm'] for r in successful]
        durations = [r['duration'] for r in successful]
        
        avg_bpm = np.mean(bpms)
        median_bpm = np.median(bpms)
        min_bpm = min(bpms)
        max_bpm = max(bpms)
        std_bpm = np.std(bpms)
        
        total_duration = sum(durations)
        
        fastest = max(successful, key=lambda x: x['bpm'])
        slowest = min(successful, key=lambda x: x['bpm'])
        
        lines = []
        lines.append("=" * 60)
        lines.append("  批量分析结果汇总")
        lines.append("=" * 60)
        lines.append(f"  总文件数: {len(self.results)}")
        lines.append(f"  成功分析: {len(successful)}")
        lines.append(f"  失败: {len(self.results) - len(successful)}")
        lines.append("")
        lines.append("  BPM统计:")
        lines.append(f"    平均 BPM: {avg_bpm:.1f}")
        lines.append(f"    中位 BPM: {median_bpm:.1f}")
        lines.append(f"    最快 BPM: {max_bpm:.1f}  ({fastest['filename']})")
        lines.append(f"    最慢 BPM: {min_bpm:.1f}  ({slowest['filename']})")
        lines.append(f"    标准差:   {std_bpm:.1f}")
        lines.append("")
        lines.append(f"  总时长: {total_duration/60:.1f} 分钟")
        lines.append("")
        lines.append("  详细列表:")
        lines.append("-" * 60)
        lines.append(f"  {'文件名':<30} {'BPM':>8} {'时长':>10}")
        lines.append("-" * 60)
        
        for r in successful:
            lines.append(f"  {r['filename'][:28]:<30} {r['bpm']:>8.1f} {r['duration']:>8.1f}s")
        
        lines.append("=" * 60)
        
        return '\n'.join(lines)
    
    def export_stats(self, output_file):
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['文件名', '完整路径', 'BPM', '拍点数', '时长(秒)', '状态'])
            
            for r in self.results:
                writer.writerow([
                    r['filename'],
                    r['file'],
                    f"{r['bpm']:.2f}" if r['bpm'] else '',
                    r['beat_count'],
                    f"{r['duration']:.2f}",
                    r['status']
                ])
