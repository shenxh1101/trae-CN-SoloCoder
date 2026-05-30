"""
MIDI敲击轨道生成模块
"""
import struct
import warnings


class MIDIExporter:
    def __init__(self):
        self.mido_available = False
        try:
            import mido
            self.mido = mido
            self.mido_available = True
        except ImportError:
            warnings.warn(
                "mido未安装，将使用内置MIDI生成器。\n"
                "安装命令: pip install mido"
            )
    
    def export(self, beats, output_file, bpm=120.0, velocity_scaling=True):
        if self.mido_available:
            self._export_with_mido(beats, output_file, bpm, velocity_scaling)
        else:
            self._export_simple(beats, output_file, bpm, velocity_scaling)
    
    def _export_with_mido(self, beats, output_file, bpm, velocity_scaling):
        mid = self.mido.MidiFile()
        track = self.mido.MidiTrack()
        mid.tracks.append(track)
        
        track.append(self.mido.MetaMessage('set_tempo', tempo=self.mido.bpm2tempo(bpm)))
        track.append(self.mido.MetaMessage('track_name', name='Beat Track'))
        
        ticks_per_beat = mid.ticks_per_beat
        microseconds_per_beat = self.mido.bpm2tempo(bpm)
        seconds_per_tick = microseconds_per_beat / (ticks_per_beat * 1000000)
        
        last_tick = 0
        
        for beat in beats:
            time_sec = beat['time']
            current_tick = int(time_sec / seconds_per_tick)
            delta = current_tick - last_tick
            
            if delta > 0:
                velocity = int(beat['strength'] * 127) if velocity_scaling else 100
                velocity = max(1, min(127, velocity))
                
                track.append(self.mido.Message('note_on', note=36, velocity=velocity, time=delta))
                track.append(self.mido.Message('note_off', note=36, velocity=64, time=10))
                
                last_tick = current_tick + 10
        
        mid.save(output_file)
    
    def _export_simple(self, beats, output_file, bpm, velocity_scaling):
        import io
        
        def write_var_len(value):
            result = bytearray()
            if value == 0:
                return bytes([0])
            while value:
                result.append(value & 0x7F)
                value >>= 7
            for i in range(len(result) - 1):
                    result[i] |= 0x80
            return bytes(reversed(result))
        
        tempo = int(60000000 // int(bpm))
        
        with open(output_file, 'wb') as f:
            f.write(b'MThd')
            f.write(struct.pack('>I', 6))
            f.write(struct.pack('>H', 0))
            f.write(struct.pack('>H', 1))
            f.write(struct.pack('>H', 480))
            
            track_data = io.BytesIO()
            
            track_data.write(bytes([0xFF, 0x51, 0x03]))
            track_data.write(struct.pack('>BH', tempo >> 16, tempo & 0xFFFF))
            
            ticks_per_beat = 480
            microseconds_per_beat = 60000000 / bpm
            seconds_per_tick = microseconds_per_beat / (ticks_per_beat * 1000000)
            
            last_tick = 0
            
            for beat in beats:
                time_sec = beat['time']
                current_tick = int(time_sec / seconds_per_tick)
                delta = current_tick - last_tick
                
                if delta > 0:
                    velocity = int(beat['strength'] * 127) if velocity_scaling else 100
                    velocity = max(1, min(127, velocity))
                    
                    track_data.write(write_var_len(delta))
                    track_data.write(bytes([0x99, 36, velocity]))
                    
                    track_data.write(write_var_len(10))
                    track_data.write(bytes([0x89, 36, 64]))
                    
                    last_tick = current_tick + 10
            
            track_data.write(bytes([0x00, 0xFF, 0x2F, 0x00]))
            
            f.write(b'MTrk')
            f.write(struct.pack('>I', len(track_data.getvalue())))
            f.write(track_data.getvalue())
