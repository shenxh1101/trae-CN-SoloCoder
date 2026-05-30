"""
CSV拍点导出模块
"""
import csv


class CSVExporter:
    def export(self, beats, output_file, include_index=True):
        headers = []
        if include_index:
            headers.append('beat_index')
        headers.extend(['time_seconds', 'strength'])
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            
            for i, beat in enumerate(beats, 1):
                row = []
                if include_index:
                    row.append(i)
                row.extend([f"{beat['time']:.6f}", f"{beat['strength']:.4f}"])
                writer.writerow(row)
    
    def export_with_milliseconds(self, beats, output_file):
        headers = ['beat_index', 'time_ms', 'strength']
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            
            for i, beat in enumerate(beats, 1):
                writer.writerow([i, int(beat['time'] * 1000), f"{beat['strength']:.4f}"])
