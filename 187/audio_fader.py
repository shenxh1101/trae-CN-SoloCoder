#!/usr/bin/env python3
import os
import sys

try:
    import audioop
except ImportError:
    import struct
    import math

    class _Audioop:
        @staticmethod
        def add(fragment1, fragment2, width):
            if len(fragment1) != len(fragment2):
                raise ValueError("fragments should be of equal length")
            if width == 1:
                fmt = 'b'
            elif width == 2:
                fmt = 'h'
            elif width == 4:
                fmt = 'i'
            else:
                raise ValueError("width should be 1, 2, or 4")
            n = len(fragment1) // width
            samples1 = struct.unpack('<' + fmt * n, fragment1)
            samples2 = struct.unpack('<' + fmt * n, fragment2)
            max_val = (1 << (width * 8 - 1)) - 1
            min_val = -(1 << (width * 8 - 1))
            result = []
            for s1, s2 in zip(samples1, samples2):
                s = s1 + s2
                if s > max_val:
                    s = max_val
                elif s < min_val:
                    s = min_val
                result.append(s)
            return struct.pack('<' + fmt * n, *result)

        @staticmethod
        def mul(fragment, width, factor):
            if width == 1:
                fmt = 'b'
            elif width == 2:
                fmt = 'h'
            elif width == 4:
                fmt = 'i'
            else:
                raise ValueError("width should be 1, 2, or 4")
            n = len(fragment) // width
            samples = struct.unpack('<' + fmt * n, fragment)
            max_val = (1 << (width * 8 - 1)) - 1
            min_val = -(1 << (width * 8 - 1))
            result = []
            for s in samples:
                s = int(s * factor)
                if s > max_val:
                    s = max_val
                elif s < min_val:
                    s = min_val
                result.append(s)
            return struct.pack('<' + fmt * n, *result)

        @staticmethod
        def minmax(fragment, width):
            if width == 1:
                fmt = 'b'
            elif width == 2:
                fmt = 'h'
            elif width == 4:
                fmt = 'i'
            else:
                raise ValueError("width should be 1, 2, or 4")
            n = len(fragment) // width
            if n == 0:
                return (0, 0)
            samples = struct.unpack('<' + fmt * n, fragment)
            return (min(samples), max(samples))

        @staticmethod
        def max(fragment, width):
            return max(abs(v) for v in _Audioop.minmax(fragment, width))

        @staticmethod
        def avg(fragment, width):
            if width == 1:
                fmt = 'b'
            elif width == 2:
                fmt = 'h'
            elif width == 4:
                fmt = 'i'
            else:
                raise ValueError("width should be 1, 2, or 4")
            n = len(fragment) // width
            if n == 0:
                return 0
            samples = struct.unpack('<' + fmt * n, fragment)
            return sum(samples) // n

        @staticmethod
        def rms(fragment, width):
            if width == 1:
                fmt = 'b'
            elif width == 2:
                fmt = 'h'
            elif width == 4:
                fmt = 'i'
            else:
                raise ValueError("width should be 1, 2, or 4")
            n = len(fragment) // width
            if n == 0:
                return 0
            samples = struct.unpack('<' + fmt * n, fragment)
            sum_sq = sum(s * s for s in samples)
            return int(math.sqrt(sum_sq / n))

        @staticmethod
        def cross(fragment, width):
            if width == 1:
                fmt = 'b'
            elif width == 2:
                fmt = 'h'
            elif width == 4:
                fmt = 'i'
            else:
                raise ValueError("width should be 1, 2, or 4")
            n = len(fragment) // width
            if n < 2:
                return 0
            samples = struct.unpack('<' + fmt * n, fragment)
            crossings = 0
            for i in range(1, n):
                if (samples[i-1] >= 0) != (samples[i] >= 0):
                    crossings += 1
            return crossings

        @staticmethod
        def lin2lin(fragment, width, newwidth):
            if width == newwidth:
                return fragment
            if width == 1:
                fmt = 'b'
            elif width == 2:
                fmt = 'h'
            elif width == 4:
                fmt = 'i'
            else:
                raise ValueError("width should be 1, 2, or 4")
            if newwidth == 1:
                newfmt = 'b'
                scale = 1 << 7
            elif newwidth == 2:
                newfmt = 'h'
                scale = 1 << 15
            elif newwidth == 4:
                newfmt = 'i'
                scale = 1 << 31
            else:
                raise ValueError("newwidth should be 1, 2, or 4")
            n = len(fragment) // width
            samples = struct.unpack('<' + fmt * n, fragment)
            old_scale = 1 << (width * 8 - 1)
            result = []
            for s in samples:
                normalized = s / old_scale
                result.append(int(normalized * scale))
            return struct.pack('<' + newfmt * n, *result)

        @staticmethod
        def ratecv(fragment, width, nchannels, inrate, outrate, state, weightA=1, weightB=0):
            if state is None:
                state = (0, 0)
            if width == 1:
                fmt = 'b'
            elif width == 2:
                fmt = 'h'
            elif width == 4:
                fmt = 'i'
            else:
                raise ValueError("width should be 1, 2, or 4")
            n = len(fragment) // width // nchannels
            samples = struct.unpack('<' + fmt * (n * nchannels), fragment)
            ratio = outrate / inrate
            new_n = int(n * ratio)
            result = []
            for i in range(new_n):
                idx = int(i / ratio)
                if idx >= n:
                    idx = n - 1
                for ch in range(nchannels):
                    result.append(samples[idx * nchannels + ch])
            return struct.pack('<' + fmt * (new_n * nchannels), *result), (0, 0)

        @staticmethod
        def getsample(fragment, width, index):
            if width == 1:
                fmt = 'b'
            elif width == 2:
                fmt = 'h'
            elif width == 4:
                fmt = 'i'
            else:
                raise ValueError("width should be 1, 2, or 4")
            n = len(fragment) // width
            if index < 0 or index >= n:
                raise IndexError("index out of range")
            samples = struct.unpack('<' + fmt * n, fragment)
            return samples[index]

    sys.modules['audioop'] = _Audioop()
    sys.modules['pyaudioop'] = _Audioop()

import logging
import shutil
import subprocess
import platform
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional, Tuple

import click
from tqdm import tqdm
from pydub import AudioSegment
from pydub.effects import normalize

SUPPORTED_FORMATS = ('.mp3', '.wav', '.flac', '.ogg', '.m4a')
OUTPUT_FORMATS = ('mp3', 'wav', 'flac', 'ogg')


def setup_logging(log_dir: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"audio_fader_{timestamp}.log"
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    return log_file


def find_audio_files(folder: Path) -> List[Path]:
    audio_files = []
    for root, _, files in os.walk(folder):
        for file in files:
            if file.lower().endswith(SUPPORTED_FORMATS):
                audio_files.append(Path(root) / file)
    return sorted(audio_files)


def get_audio_duration(file_path: Path) -> float:
    try:
        audio = AudioSegment.from_file(str(file_path))
        return len(audio) / 1000.0
    except Exception as e:
        logging.error(f"无法获取文件时长 {file_path}: {e}")
        return 0.0


def backup_file(file_path: Path) -> Optional[Path]:
    backup_path = file_path.with_suffix(file_path.suffix + '.bak')
    try:
        shutil.copy2(file_path, backup_path)
        logging.info(f"已备份文件: {file_path} -> {backup_path}")
        return backup_path
    except Exception as e:
        logging.error(f"备份文件失败 {file_path}: {e}")
        return None


def generate_output_filename(
    input_path: Path,
    output_format: Optional[str],
    fade_in: float,
    fade_out: float,
    include_params: bool,
    output_dir: Optional[Path] = None
) -> Path:
    base_name = input_path.stem
    ext = output_format.lower() if output_format else input_path.suffix[1:].lower()
    
    if include_params:
        base_name = f"{base_name}_fadein{fade_in}s_fadeout{fade_out}s"
    
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)
        return output_dir / f"{base_name}.{ext}"
    else:
        return input_path.with_name(f"{base_name}.{ext}")


def process_audio(
    file_path: Path,
    fade_in: float,
    fade_out: float,
    output_format: Optional[str],
    backup: bool,
    min_duration: float,
    include_params: bool,
    normalize_db: Optional[float],
    output_dir: Optional[Path] = None
) -> Dict[str, str]:
    result = {
        'file': str(file_path),
        'status': 'skipped',
        'message': ''
    }
    
    try:
        duration = get_audio_duration(file_path)
        result['duration'] = f"{duration:.2f}s"
        
        if duration < min_duration:
            result['message'] = f"文件时长 ({duration:.2f}s) 小于最小要求 ({min_duration}s)"
            logging.info(f"跳过 {file_path}: {result['message']}")
            return result
        
        output_path = generate_output_filename(
            file_path, output_format, fade_in, fade_out, include_params, output_dir
        )
        
        will_overwrite = (output_path.resolve() == file_path.resolve())
        
        if backup and will_overwrite:
            backup_file(file_path)
        
        audio = AudioSegment.from_file(str(file_path))
        
        if normalize_db is not None:
            audio = normalize(audio, headroom=abs(normalize_db))
        
        fade_in_ms = int(fade_in * 1000)
        fade_out_ms = int(fade_out * 1000)
        
        if fade_in_ms > 0:
            audio = audio.fade_in(fade_in_ms)
        
        if fade_out_ms > 0:
            audio = audio.fade_out(fade_out_ms)
        
        export_format = output_format.lower() if output_format else file_path.suffix[1:].lower()
        export_kwargs = {}
        
        if export_format == 'mp3':
            export_kwargs['bitrate'] = '320k'
        
        audio.export(str(output_path), format=export_format, **export_kwargs)
        
        result['status'] = 'success'
        result['output'] = str(output_path)
        result['message'] = f"处理完成，输出: {output_path}"
        logging.info(f"成功处理 {file_path} -> {output_path}")
        
    except Exception as e:
        result['status'] = 'error'
        result['message'] = str(e)
        logging.error(f"处理失败 {file_path}: {e}")
    
    return result


def create_test_sample(
    file_path: Path,
    fade_in: float,
    fade_out: float,
    normalize_db: Optional[float],
    sample_duration: int = 10
) -> Optional[Path]:
    try:
        audio = AudioSegment.from_file(str(file_path))
        duration = len(audio) / 1000.0
        
        if normalize_db is not None:
            audio = normalize(audio, headroom=abs(normalize_db))
        
        fade_in_ms = int(fade_in * 1000)
        fade_out_ms = int(fade_out * 1000)
        audio = audio.fade_in(fade_in_ms).fade_out(fade_out_ms)
        
        sample_start = audio[:sample_duration * 1000]
        sample_end = audio[-sample_duration * 1000:] if duration > sample_duration else audio
        combined_sample = sample_start + sample_end
        
        sample_path = file_path.with_name(f"{file_path.stem}_test_sample.mp3")
        combined_sample.export(str(sample_path), format='mp3', bitrate='192k')
        
        return sample_path
    except Exception as e:
        logging.error(f"创建测试样本失败 {file_path}: {e}")
        return None


def play_audio(file_path: Path):
    system = platform.system()
    try:
        if system == 'Darwin':
            subprocess.run(['afplay', str(file_path)], check=True)
        elif system == 'Linux':
            subprocess.run(['xdg-open', str(file_path)], check=True)
        elif system == 'Windows':
            os.startfile(str(file_path))
        else:
            click.echo(f"不支持自动播放，请手动打开: {file_path}")
    except Exception as e:
        click.echo(f"播放失败，请手动打开: {file_path}, 错误: {e}")


@click.command()
@click.option('--folder', '-f', type=click.Path(exists=True, path_type=Path),
              help='包含音频文件的文件夹路径')
@click.option('--file', '-i', type=click.Path(exists=True, path_type=Path),
              help='单独处理单个音频文件')
@click.option('--fade-in', 'fade_in', type=float, default=3.0,
              help='淡入时长（秒），默认3秒')
@click.option('--fade-out', 'fade_out', type=float, default=5.0,
              help='淡出时长（秒），默认5秒')
@click.option('--output-format', 'output_format', type=click.Choice(OUTPUT_FORMATS),
              default=None, help='输出文件格式，默认保持原格式')
@click.option('--output-dir', 'output_dir', type=click.Path(path_type=Path),
              default=None, help='输出文件目录，默认与原文件同目录')
@click.option('--preview', is_flag=True,
              help='预览模式，不实际处理文件')
@click.option('--backup/--no-backup', default=True,
              help='处理前备份原文件（.bak），默认开启')
@click.option('--min-duration', 'min_duration', type=float, default=0.0,
              help='只处理长度大于指定秒数的文件，默认0秒（处理所有文件）')
@click.option('--threads', '-t', type=int, default=4,
              help='处理线程数，默认4')
@click.option('--include-params/--no-include-params', default=False,
              help='将淡入淡出参数写入文件名')
@click.option('--test', is_flag=True,
              help='测试模式，创建前后10秒样本并播放')
@click.option('--normalize', 'normalize_db', type=float, default=None,
              help='音量归一化到指定dB值（如 -14）')
@click.option('--log-dir', 'log_dir', type=click.Path(path_type=Path),
              default=Path.cwd(), help='日志文件目录，默认当前目录')
def main(
    folder: Optional[Path],
    file: Optional[Path],
    fade_in: float,
    fade_out: float,
    output_format: Optional[str],
    output_dir: Optional[Path],
    preview: bool,
    backup: bool,
    min_duration: float,
    threads: int,
    include_params: bool,
    test: bool,
    normalize_db: Optional[float],
    log_dir: Path
):
    """音频批量淡入淡出处理工具"""
    
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = setup_logging(log_dir)
    logging.info(f"开始执行，日志文件: {log_file}")
    logging.info(f"参数: fade_in={fade_in}s, fade_out={fade_out}s, output_format={output_format}")
    logging.info(f"min_duration={min_duration}s, backup={backup}, threads={threads}")
    
    audio_files: List[Path] = []
    
    if file:
        if file.suffix.lower() not in SUPPORTED_FORMATS:
            click.echo(f"错误: 不支持的文件格式 {file.suffix}")
            sys.exit(1)
        audio_files = [file]
    elif folder:
        audio_files = find_audio_files(folder)
        if not audio_files:
            click.echo(f"在文件夹 {folder} 中未找到支持的音频文件")
            sys.exit(0)
    else:
        click.echo("错误: 请指定 --folder 或 --file 参数")
        ctx = click.get_current_context()
        click.echo(ctx.get_help())
        sys.exit(1)
    
    click.echo(f"\n{'='*60}")
    click.echo(f"找到 {len(audio_files)} 个音频文件")
    click.echo(f"{'='*60}")
    
    if preview:
        click.echo("\n[预览模式] 将要处理的文件列表:")
        for i, f in enumerate(audio_files, 1):
            duration = get_audio_duration(f)
            status = "将被处理" if duration >= min_duration else f"将被跳过 (时长 {duration:.2f}s < {min_duration}s)"
            click.echo(f"  {i:3d}. {f.name} - {duration:.2f}s - {status}")
        click.echo(f"\n共 {len(audio_files)} 个文件")
        return
    
    if test:
        click.echo("\n[测试模式] 创建测试样本...")
        test_file = audio_files[0]
        click.echo(f"处理文件: {test_file.name}")
        
        sample_path = create_test_sample(test_file, fade_in, fade_out, normalize_db)
        if sample_path:
            click.echo(f"测试样本已创建: {sample_path}")
            click.echo("正在播放测试样本...")
            play_audio(sample_path)
            click.echo("\n如果效果满意，可以使用相同参数进行批量处理。")
        return
    
    click.echo(f"\n开始处理 {len(audio_files)} 个文件...")
    
    results = []
    if threads > 1 and len(audio_files) > 1:
        with ThreadPoolExecutor(max_workers=threads) as executor:
            futures = {
                executor.submit(
                    process_audio, f, fade_in, fade_out, output_format,
                    backup, min_duration, include_params, normalize_db, output_dir
                ): f for f in audio_files
            }
            
            for future in tqdm(as_completed(futures), total=len(futures), desc="处理进度"):
                results.append(future.result())
    else:
        for f in tqdm(audio_files, desc="处理进度"):
            results.append(process_audio(
                f, fade_in, fade_out, output_format, backup,
                min_duration, include_params, normalize_db, output_dir
            ))
    
    success_count = sum(1 for r in results if r['status'] == 'success')
    error_count = sum(1 for r in results if r['status'] == 'error')
    skipped_count = sum(1 for r in results if r['status'] == 'skipped')
    
    click.echo(f"\n{'='*60}")
    click.echo("处理完成!")
    click.echo(f"  成功: {success_count}")
    click.echo(f"  失败: {error_count}")
    click.echo(f"  跳过: {skipped_count}")
    click.echo(f"{'='*60}")
    
    if error_count > 0:
        click.echo("\n失败的文件:")
        for r in results:
            if r['status'] == 'error':
                click.echo(f"  - {r['file']}: {r['message']}")
    
    logging.info(f"处理完成: 成功={success_count}, 失败={error_count}, 跳过={skipped_count}")


if __name__ == '__main__':
    main()
