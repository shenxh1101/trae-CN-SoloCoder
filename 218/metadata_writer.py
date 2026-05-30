"""
音频元数据BPM写入模块
"""
import os
import warnings


class MetadataWriter:
    def __init__(self):
        self.mutagen_available = False
        try:
            import mutagen
            self.mutagen = mutagen
            self.mutagen_available = True
        except ImportError:
            warnings.warn(
                "mutagen未安装，无法写入元数据。\n"
                "安装命令: pip install mutagen"
            )
    
    def write_bpm(self, audio_file, bpm):
        if not self.mutagen_available:
            print("[警告] mutagen未安装，仅模拟写入操作")
            print(f"[模拟] 将BPM {bpm:.1f} 写入 {audio_file}")
            return True
        
        ext = os.path.splitext(audio_file)[1].lower()
        
        try:
            if ext == '.mp3':
                self._write_mp3_bpm(audio_file, bpm)
            elif ext in ['.flac', '.ogg', '.opus']:
                self._write_vorbis_bpm(audio_file, bpm)
            elif ext in ['.m4a', '.mp4', '.aac']:
                self._write_mp4_bpm(audio_file, bpm)
            else:
                print(f"[警告] 不支持的文件格式: {ext}")
                return False
            
            print(f"成功写入BPM: {bpm:.1f}")
            return True
        except Exception as e:
            print(f"写入元数据失败: {e}")
            return False
    
    def _write_mp3_bpm(self, audio_file, bpm):
        from mutagen.id3 import ID3, TBPM, TKEY
        
        try:
            tags = ID3(audio_file)
        except self.mutagen.id3.ID3NoHeaderError:
            tags = ID3()
        
        tags['TBPM'] = TBPM(encoding=3, text=str(int(bpm)))
        
        tags.save(audio_file)
    
    def _write_vorbis_bpm(self, audio_file, bpm):
        from mutagen.flac import FLAC
        from mutagen.oggvorbis import OggVorbis
        
        ext = os.path.splitext(audio_file)[1].lower()
        
        if ext == '.flac':
            audio = FLAC(audio_file)
        else:
            audio = OggVorbis(audio_file)
        
        audio['BPM'] = str(int(bpm))
        audio.save()
    
    def _write_mp4_bpm(self, audio_file, bpm):
        from mutagen.mp4 import MP4
        
        audio = MP4(audio_file)
        audio['tmpo'] = [int(bpm)]
        audio.save()
    
    def read_bpm(self, audio_file):
        if not self.mutagen_available:
            print("[警告] mutagen未安装，无法读取元数据")
            return None
        
        ext = os.path.splitext(audio_file)[1].lower()
        
        try:
            if ext == '.mp3':
                from mutagen.id3 import ID3
                tags = ID3(audio_file)
                if 'TBPM' in tags:
                    return int(tags['TBPM'].text[0])
            elif ext in ['.flac', '.ogg', '.opus']:
                from mutagen.flac import FLAC
                audio = FLAC(audio_file)
                if 'BPM' in audio:
                    return int(audio['BPM'][0])
            elif ext in ['.m4a', '.mp4', '.aac']:
                from mutagen.mp4 import MP4
                audio = MP4(audio_file)
                if 'tmpo' in audio:
                    return int(audio['tmpo'][0])
        except Exception as e:
            print(f"读取元数据失败: {e}")
        
        return None
