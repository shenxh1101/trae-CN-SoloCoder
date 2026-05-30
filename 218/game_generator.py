"""
节奏游戏文件生成模块
"""
import json
import os
from datetime import datetime


class GameGenerator:
    def __init__(self):
        self.difficulties = {
            'easy': 0.3,
            'normal': 0.5,
            'hard': 0.8,
            'expert': 1.0
        }
    
    def generate(self, analysis_result, output_file, difficulty='normal'):
        beats = analysis_result['beats']
        bpm = analysis_result['bpm']
        duration = analysis_result['duration']
        
        threshold = self.difficulties.get(difficulty, 0.5)
        
        game_data = {
            'version': '1.0',
            'generated_at': datetime.now().isoformat(),
            'song_info': {
                'title': os.path.splitext(analysis_result.get('filename', 'unknown'))[0],
                'bpm': round(bpm, 2),
                'duration': round(duration, 2),
                'difficulty': difficulty
            },
            'notes': [],
            'metadata': {
                'total_beats': len(beats),
                'beat_interval_ms': round(60000 / bpm, 2)
            }
        }
        
        note_types = ['normal', 'normal', 'normal', 'fever', 'hold']
        
        for i, beat in enumerate(beats):
            if beat['strength'] >= threshold or i % 2 == 0:
                note = {
                    'id': i + 1,
                    'time': round(beat['time'] * 1000, 2),
                    'type': note_types[i % len(note_types)] if beat['strength'] > 0.7 else 'normal',
                    'lane': i % 4,
                    'difficulty': beat['strength']
                }
                
                if note['type'] == 'hold':
                    note['duration'] = round(60000 / bpm, 2)
                
                game_data['notes'].append(note)
        
        game_data['metadata']['total_notes'] = len(game_data['notes'])
        
        ext = os.path.splitext(output_file)[1].lower()
        
        if ext == '.json':
            self._export_json(game_data, output_file)
        elif ext == '.osu':
            self._export_osu(game_data, output_file)
        elif ext == '.sm':
            self._export_stepmania(game_data, output_file)
        else:
            self._export_json(game_data, output_file)
    
    def _export_json(self, data, output_file):
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _export_osu(self, data, output_file):
        lines = []
        lines.append('osu file format v14')
        lines.append('')
        lines.append('[General]')
        lines.append(f'AudioFilename: {data["song_info"]["title"]}.mp3')
        lines.append(f'Mode: 3')
        lines.append('')
        lines.append('[Metadata]')
        lines.append(f'Title:{data["song_info"]["title"]}')
        lines.append(f'TitleUnicode:{data["song_info"]["title"]}')
        lines.append('Artist:Generated')
        lines.append('Creator:RhythmAnalyzer')
        lines.append(f'Version:{data["song_info"]["difficulty"]}')
        lines.append('')
        lines.append('[Difficulty]')
        lines.append('HPDrainRate:5')
        lines.append('CircleSize:4')
        lines.append('OverallDifficulty:5')
        lines.append('ApproachRate:5')
        lines.append('SliderMultiplier:1')
        lines.append('SliderTickRate:1')
        lines.append('')
        lines.append('[HitObjects]')
        
        for note in data['notes']:
            x = 50 + (note['lane'] * 100)
            y = 192
            time_ms = int(note['time'])
            
            if note['type'] == 'hold':
                end_time = time_ms + int(note.get('duration', 500))
                lines.append(f'{x},{y},{time_ms},128,0,{end_time}:0:0:0:0:')
            else:
                lines.append(f'{x},{y},{time_ms},1,0,0:0:0:0:')
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
    
    def _export_stepmania(self, data, output_file):
        bpm = data['song_info']['bpm']
        notes = data['notes']
        
        lines = []
        lines.append('#TITLE:{};'.format(data['song_info']['title']))
        lines.append('#ARTIST:Generated;')
        lines.append('#BPM:{};'.format(int(bpm)))
        lines.append('#GAP:0;')
        lines.append('')
        
        lines.append('#NOTES:')
        lines.append('     dance-single:')
        lines.append('     :')
        lines.append('     {}:'.format(data['song_info']['difficulty']))
        lines.append('     :')
        lines.append('  ');
        
        beat_ms = 60000 / bpm
        measure_duration = beat_ms * 4
        
        measures = int(data['song_info']['duration'] * 1000 / measure_duration) + 1
        
        for measure in range(measures):
            measure_start = measure * measure_duration
            measure_end = measure_start + measure_duration
            
            grid = [['0'] * 4 for _ in range(4)]
            
            for note in notes:
                note_time = note['time']
                if measure_start <= note_time < measure_end:
                    pos_in_measure = note_time - measure_start
                    row = int(pos_in_measure / measure_duration * 4)
                    row = min(3, max(0, row))
                    col = note['lane']
                    
                    if note['type'] == 'hold':
                        grid[row][col] = '2'
                    else:
                        grid[row][col] = '1'
            
            for row in grid:
                lines.append(''.join(row))
            
            lines.append(',')
        
        lines[-1] = ';'
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
