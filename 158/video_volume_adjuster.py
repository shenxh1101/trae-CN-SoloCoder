#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple


@dataclass
class VideoInfo:
    path: Path
    original_lufs: Optional[float] = None
    target_lufs: Optional[float] = None
    gain_db: Optional[float] = None
    new_lufs: Optional[float] = None
    output_path: Optional[Path] = None
    success: bool = False
    error: Optional[str] = None
    skipped: bool = False


@dataclass
class ProcessConfig:
    input_dir: Path
    target_lufs: float = -20.0
    analyze_only: bool = False
    rename_with_volume: bool = False
    max_gain: float = 10.0
    threads: int = 4
    output_dir: Optional[Path] = None
    report_path: Optional[Path] = None
    overwrite: bool = False


SUPPORTED_EXTENSIONS = {'.mp4', '.mkv'}


def scan_videos(input_dir: Path) -> List[Path]:
    videos = []
    for root, _, files in os.walk(input_dir):
        for file in files:
            ext = Path(file).suffix.lower()
            if ext in SUPPORTED_EXTENSIONS:
                videos.append(Path(root) / file)
    return sorted(videos)


def analyze_volume(video_path: Path) -> Tuple[Optional[float], Optional[str]]:
    cmd = [
        'ffmpeg',
        '-i', str(video_path),
        '-af', 'loudnorm=print_format=json',
        '-f', 'null',
        '-hide_banner',
        '-nostats',
        '-'
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        output = result.stderr + result.stdout
        json_match = re.search(r'\{.*\}', output, re.DOTALL)
        
        if not json_match:
            return None, f"无法解析音量分析结果. stderr: {result.stderr[-500:]}"
        
        loudnorm_data = json.loads(json_match.group())
        input_lufs = float(loudnorm_data.get('input_i', 0))
        
        return input_lufs, None
        
    except json.JSONDecodeError as e:
        return None, f"解析JSON结果失败: {str(e)}"
    except Exception as e:
        return None, f"分析过程出错: {str(e)}"


def calculate_gain(original_lufs: float, target_lufs: float, max_gain: float) -> float:
    gain = target_lufs - original_lufs
    if gain > max_gain:
        gain = max_gain
    elif gain < -max_gain:
        gain = -max_gain
    return gain


def adjust_volume(
    video_path: Path,
    gain_db: float,
    output_dir: Optional[Path],
    rename_with_volume: bool,
    target_lufs: float,
    overwrite: bool
) -> Tuple[Optional[Path], Optional[str]]:
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)
        base_output = output_dir / video_path.name
    else:
        base_output = video_path
    
    if rename_with_volume:
        stem = base_output.stem
        suffix = base_output.suffix
        new_stem = f"{stem}_{target_lufs:.1f}LUFS"
        output_path = base_output.with_name(f"{new_stem}{suffix}")
    else:
        stem = base_output.stem
        suffix = base_output.suffix
        output_path = base_output.with_name(f"{stem}_adjusted{suffix}")
    
    if output_path.exists() and not overwrite:
        return output_path, f"输出文件已存在: {output_path}"
    
    temp_output = output_path.with_name(f".tmp_{output_path.name}")
    
    gain_str = f"{gain_db:.2f}dB"
    
    cmd = [
        'ffmpeg',
        '-i', str(video_path),
        '-c:v', 'copy',
        '-af', f'volume={gain_str}',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-y',
        '-v', 'error',
        '-hide_banner',
        '-nostats',
        str(temp_output)
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        if temp_output.exists():
            temp_output.rename(output_path)
            return output_path, None
        else:
            return None, "输出文件未生成"
            
    except subprocess.CalledProcessError as e:
        if temp_output.exists():
            temp_output.unlink()
        return None, f"音量调整失败: {e.stderr.strip()}"
    except Exception as e:
        if temp_output.exists():
            temp_output.unlink()
        return None, f"调整过程出错: {str(e)}"


def process_single_video(
    video_path: Path,
    config: ProcessConfig
) -> VideoInfo:
    info = VideoInfo(path=video_path, target_lufs=config.target_lufs)
    
    print(f"[{video_path.name}] 开始分析音量...")
    original_lufs, error = analyze_volume(video_path)
    
    if error:
        info.error = error
        print(f"[{video_path.name}] 错误: {error}")
        return info
    
    info.original_lufs = original_lufs
    print(f"[{video_path.name}] 当前音量: {original_lufs:.2f} LUFS")
    
    if config.analyze_only:
        info.skipped = True
        info.success = True
        return info
    
    gain = calculate_gain(original_lufs, config.target_lufs, config.max_gain)
    info.gain_db = gain
    info.new_lufs = original_lufs + gain
    
    if abs(gain) < 0.1:
        info.skipped = True
        info.success = True
        print(f"[{video_path.name}] 跳过: 音量已接近目标值")
        return info
    
    print(f"[{video_path.name}] 调整量: {gain:+.2f} dB, 目标音量: {info.new_lufs:.2f} LUFS")
    print(f"[{video_path.name}] 开始调整音量...")
    
    output_path, error = adjust_volume(
        video_path,
        gain,
        config.output_dir,
        config.rename_with_volume,
        info.new_lufs,
        config.overwrite
    )
    
    if error:
        info.error = error
        print(f"[{video_path.name}] 错误: {error}")
        return info
    
    info.output_path = output_path
    info.success = True
    print(f"[{video_path.name}] 完成 ✓")
    
    return info


def generate_report(results: List[VideoInfo], report_path: Path, config: ProcessConfig) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("视频音量批量调整报告\n")
        f.write("=" * 80 + "\n\n")
        
        f.write(f"输入目录: {config.input_dir}\n")
        f.write(f"目标音量: {config.target_lufs:.1f} LUFS\n")
        f.write(f"最大增益: ±{config.max_gain:.1f} dB\n")
        f.write(f"处理模式: {'仅分析' if config.analyze_only else '分析并调整'}\n")
        f.write(f"处理线程: {config.threads}\n\n")
        
        total = len(results)
        success = sum(1 for r in results if r.success)
        failed = sum(1 for r in results if not r.success and not r.skipped)
        skipped = sum(1 for r in results if r.skipped)
        
        f.write(f"总计: {total} 个文件\n")
        f.write(f"成功: {success} 个\n")
        f.write(f"跳过: {skipped} 个\n")
        f.write(f"失败: {failed} 个\n\n")
        
        f.write("-" * 80 + "\n")
        f.write(f"{'文件名':<40} {'原始音量':>12} {'调整量':>10} {'新音量':>12} {'状态':>10}\n")
        f.write("-" * 80 + "\n")
        
        for info in results:
            name = info.path.name
            if len(name) > 38:
                name = name[:35] + "..."
            
            orig = f"{info.original_lufs:.2f}" if info.original_lufs is not None else "N/A"
            gain = f"{info.gain_db:+.2f}" if info.gain_db is not None else "N/A"
            new = f"{info.new_lufs:.2f}" if info.new_lufs is not None else "N/A"
            
            if info.skipped:
                status = "跳过"
            elif info.success:
                status = "成功"
            else:
                status = "失败"
            
            f.write(f"{name:<40} {orig:>10} LUFS {gain:>8} dB {new:>10} LUFS {status:>8}\n")
        
        if failed > 0:
            f.write("\n" + "=" * 80 + "\n")
            f.write("错误详情:\n")
            f.write("=" * 80 + "\n")
            for info in results:
                if info.error and not info.skipped:
                    f.write(f"\n文件: {info.path}\n")
                    f.write(f"错误: {info.error}\n")
        
        f.write("\n" + "=" * 80 + "\n")
        f.write(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 80 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='批量调整视频音量工具 - 仅调整音频流，不重新编码视频',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  # 仅分析当前目录下所有视频的音量
  %(prog)s -i ./videos --analyze-only
  
  # 调整音量到 -20 LUFS，使用4线程
  %(prog)s -i ./videos -t -20 -n 4
  
  # 调整音量并在文件名中包含音量信息
  %(prog)s -i ./videos -t -20 --rename
  
  # 调整音量，设置最大增益为 8dB
  %(prog)s -i ./videos -t -20 --max-gain 8
  
  # 指定输出目录
  %(prog)s -i ./videos -o ./output -t -20
  
  # 生成报告到指定文件
  %(prog)s -i ./videos -t -20 --report report.txt
        '''
    )
    
    parser.add_argument(
        '-i', '--input',
        required=True,
        help='输入文件夹路径，将扫描其中所有MP4和MKV文件'
    )
    
    parser.add_argument(
        '-t', '--target-lufs',
        type=float,
        default=-20.0,
        help='目标音量 (LUFS)，默认: -20.0'
    )
    
    parser.add_argument(
        '--analyze-only',
        action='store_true',
        help='仅分析音量，不进行调整'
    )
    
    parser.add_argument(
        '--rename',
        action='store_true',
        help='在输出文件名中包含音量信息 (如: video_-20.0LUFS.mp4)'
    )
    
    parser.add_argument(
        '--max-gain',
        type=float,
        default=10.0,
        help='最大增益/衰减量 (dB)，避免过度调整导致失真，默认: 10.0'
    )
    
    parser.add_argument(
        '-n', '--threads',
        type=int,
        default=4,
        help='处理线程数，默认: 4'
    )
    
    parser.add_argument(
        '-o', '--output',
        help='输出文件夹路径，不指定则与输入文件同目录'
    )
    
    parser.add_argument(
        '--report',
        help='报告文件路径，默认在输入目录下生成 volume_report.txt'
    )
    
    parser.add_argument(
        '--overwrite',
        action='store_true',
        help='覆盖已存在的输出文件'
    )
    
    args = parser.parse_args()
    
    input_dir = Path(args.input).expanduser().resolve()
    if not input_dir.is_dir():
        print(f"错误: 输入目录不存在: {input_dir}")
        sys.exit(1)
    
    output_dir = Path(args.output).expanduser().resolve() if args.output else None
    
    if args.report:
        report_path = Path(args.report).expanduser().resolve()
    else:
        report_path = input_dir / "volume_report.txt"
    
    config = ProcessConfig(
        input_dir=input_dir,
        target_lufs=args.target_lufs,
        analyze_only=args.analyze_only,
        rename_with_volume=args.rename,
        max_gain=args.max_gain,
        threads=max(1, args.threads),
        output_dir=output_dir,
        report_path=report_path,
        overwrite=args.overwrite
    )
    
    print("=" * 60)
    print("视频音量批量调整工具")
    print("=" * 60)
    print(f"输入目录: {config.input_dir}")
    print(f"目标音量: {config.target_lufs:.1f} LUFS")
    print(f"最大增益: ±{config.max_gain:.1f} dB")
    print(f"处理模式: {'仅分析' if config.analyze_only else '分析并调整'}")
    print(f"处理线程: {config.threads}")
    if config.output_dir:
        print(f"输出目录: {config.output_dir}")
    print("=" * 60)
    
    print("\n正在扫描视频文件...")
    videos = scan_videos(config.input_dir)
    
    if not videos:
        print("未找到MP4或MKV格式的视频文件")
        sys.exit(0)
    
    print(f"找到 {len(videos)} 个视频文件\n")
    
    results: List[VideoInfo] = []
    
    with ThreadPoolExecutor(max_workers=config.threads) as executor:
        futures = {
            executor.submit(process_single_video, video, config): video
            for video in videos
        }
        
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
    
    results.sort(key=lambda x: x.path)
    
    print("\n" + "=" * 60)
    print("处理完成，生成报告...")
    print("=" * 60)
    
    generate_report(results, config.report_path, config)
    
    print(f"\n报告已保存到: {config.report_path}")
    
    success = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success and not r.skipped)
    skipped = sum(1 for r in results if r.skipped)
    
    print(f"\n总计: {len(results)} 个文件")
    print(f"成功: {success} 个")
    print(f"跳过: {skipped} 个")
    print(f"失败: {failed} 个")
    
    if failed > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
