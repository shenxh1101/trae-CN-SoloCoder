#!/usr/bin/env python3
"""
AI音乐节奏分析工具 - 命令行接口
"""
import argparse
import sys
import os

from analyzer import RhythmAnalyzer
from midi_exporter import MIDIExporter
from csv_exporter import CSVExporter
from visualizer import WaveformVisualizer
from batch_analyzer import BatchAnalyzer
from tap_analyzer import TapAnalyzer
from game_generator import GameGenerator
from metadata_writer import MetadataWriter
from video_extractor import VideoExtractor


def main():
    parser = argparse.ArgumentParser(
        description='AI音乐节奏分析工具 - 分析音频BPM和节拍位置',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  分析单个文件:        python rhythm_analyzer.py analyze audio.mp3
  导出MIDI:            python rhythm_analyzer.py analyze audio.wav --export-midi beats.mid
  导出CSV:             python rhythm_analyzer.py analyze audio.wav --export-csv beats.csv
  可视化波形:          python rhythm_analyzer.py visualize audio.mp3
  批量分析:            python rhythm_analyzer.py batch ./music_folder
  手动打拍对比:        python rhythm_analyzer.py tap audio.mp3
  生成节奏游戏:        python rhythm_analyzer.py game audio.mp3 -o game.json
  写入BPM元数据:       python rhythm_analyzer.py metadata audio.mp3
  从视频提取分析:      python rhythm_analyzer.py video video.mp4
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    analyze_parser = subparsers.add_parser('analyze', help='分析单个音频文件的BPM和节拍')
    analyze_parser.add_argument('audio_file', help='音频文件路径 (MP3/WAV)')
    analyze_parser.add_argument('--export-midi', metavar='FILE', help='导出MIDI敲击轨道')
    analyze_parser.add_argument('--export-csv', metavar='FILE', help='导出拍点CSV文件')
    analyze_parser.add_argument('--visualize', action='store_true', help='显示ASCII波形')
    analyze_parser.add_argument('--simulate', action='store_true', help='使用模拟模式(无需librosa)')
    
    visualize_parser = subparsers.add_parser('visualize', help='可视化音频波形和拍点')
    visualize_parser.add_argument('audio_file', help='音频文件路径')
    visualize_parser.add_argument('--simulate', action='store_true', help='使用模拟模式')
    
    batch_parser = subparsers.add_parser('batch', help='批量分析文件夹内的音频文件')
    batch_parser.add_argument('folder', help='音频文件夹路径')
    batch_parser.add_argument('--export', metavar='FILE', help='导出统计结果到CSV')
    batch_parser.add_argument('--simulate', action='store_true', help='使用模拟模式')
    
    tap_parser = subparsers.add_parser('tap', help='手动打拍子与自动检测对比')
    tap_parser.add_argument('audio_file', help='音频文件路径')
    tap_parser.add_argument('--simulate', action='store_true', help='使用模拟模式')
    tap_parser.add_argument('--demo', action='store_true', help='使用自动演示模式(模拟打拍)')
    tap_parser.add_argument('--demo-bpm', type=float, default=120, help='演示模式的目标BPM(默认120)')
    
    game_parser = subparsers.add_parser('game', help='生成节奏游戏文件')
    game_parser.add_argument('audio_file', help='音频文件路径')
    game_parser.add_argument('-o', '--output', required=True, help='输出游戏文件路径')
    game_parser.add_argument('--simulate', action='store_true', help='使用模拟模式')
    
    meta_parser = subparsers.add_parser('metadata', help='将BPM写入音频文件元数据')
    meta_parser.add_argument('audio_file', help='音频文件路径')
    meta_parser.add_argument('--bpm', type=float, help='手动指定BPM(不自动检测)')
    meta_parser.add_argument('--simulate', action='store_true', help='使用模拟模式')
    
    video_parser = subparsers.add_parser('video', help='从视频提取音频后分析')
    video_parser.add_argument('video_file', help='视频文件路径')
    video_parser.add_argument('--export-audio', metavar='FILE', help='导出提取的音频')
    video_parser.add_argument('--simulate', action='store_true', help='使用模拟模式')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        if args.command == 'analyze':
            cmd_analyze(args)
        elif args.command == 'visualize':
            cmd_visualize(args)
        elif args.command == 'batch':
            cmd_batch(args)
        elif args.command == 'tap':
            cmd_tap(args)
        elif args.command == 'game':
            cmd_game(args)
        elif args.command == 'metadata':
            cmd_metadata(args)
        elif args.command == 'video':
            cmd_video(args)
    except KeyboardInterrupt:
        print("\n\n操作已取消")
        sys.exit(0)
    except Exception as e:
        print(f"\n错误: {e}")
        sys.exit(1)


def cmd_analyze(args):
    print(f"\n{'='*50}")
    print(f"  开始分析: {args.audio_file}")
    print(f"{'='*50}\n")
    
    analyzer = RhythmAnalyzer(simulate=args.simulate)
    result = analyzer.analyze(args.audio_file)
    
    print(f"BPM: {result['bpm']:.1f}")
    print(f"拍点数量: {len(result['beats'])}")
    print(f"时长: {result['duration']:.2f} 秒")
    print(f"采样率: {result['sample_rate']} Hz\n")
    
    print("前20个拍点:")
    for i, beat in enumerate(result['beats'][:20]):
        print(f"  拍点 {i+1:3d}: {beat['time']:7.3f}s | 强度: {beat['strength']:.3f}")
    if len(result['beats']) > 20:
        print(f"  ... 还有 {len(result['beats']) - 20} 个拍点")
    
    if args.export_midi:
        midi_exp = MIDIExporter()
        midi_exp.export(result['beats'], args.export_midi, bpm=result['bpm'])
        print(f"\nMIDI文件已导出: {args.export_midi}")
    
    if args.export_csv:
        csv_exp = CSVExporter()
        csv_exp.export(result['beats'], args.export_csv)
        print(f"CSV文件已导出: {args.export_csv}")
    
    if args.visualize:
        viz = WaveformVisualizer()
        if 'y' in result:
            viz.plot_waveform(result['y'], result['sr'], result['beats'])
        else:
            print("\n[提示] 波形数据不可用，仅显示拍点位置")
            viz.plot_beats_only(result['beats'], result['duration'])


def cmd_visualize(args):
    print(f"\n{'='*50}")
    print(f"  波形可视化: {args.audio_file}")
    print(f"{'='*50}\n")
    
    analyzer = RhythmAnalyzer(simulate=args.simulate)
    result = analyzer.analyze(args.audio_file)
    
    viz = WaveformVisualizer()
    if 'y' in result:
        viz.plot_waveform(result['y'], result['sr'], result['beats'])
    else:
        viz.plot_beats_only(result['beats'], result['duration'])
    
    print(f"\nBPM: {result['bpm']:.1f} | 拍点数: {len(result['beats'])}")


def cmd_batch(args):
    print(f"\n{'='*50}")
    print(f"  批量分析: {args.folder}")
    print(f"{'='*50}\n")
    
    batch = BatchAnalyzer(simulate=args.simulate)
    stats = batch.analyze_folder(args.folder)
    
    print(stats['summary'])
    
    if args.export:
        batch.export_stats(args.export)
        print(f"\n统计结果已导出: {args.export}")


def cmd_tap(args):
    print(f"\n{'='*50}")
    print(f"  手动打拍对比")
    print(f"{'='*50}\n")
    
    analyzer = RhythmAnalyzer(simulate=args.simulate)
    result = analyzer.analyze(args.audio_file)
    
    print(f"自动检测BPM: {result['bpm']:.1f}")
    print(f"音频时长: {result['duration']:.2f}秒\n")
    
    tap = TapAnalyzer()
    
    if args.demo:
        print(f"[演示模式] 以 {args.demo_bpm} BPM 自动模拟打拍\n")
        tap_result = tap.start_tapping_demo(target_bpm=args.demo_bpm, num_taps=16)
    else:
        print("现在请按空格键打拍子...")
        print("准备好后按Enter开始，按q结束\n")
        tap_result = tap.start_tapping()
    
    comparison = tap.compare(result['beats'], tap_result['taps'], result['bpm'])
    print(comparison)


def cmd_game(args):
    print(f"\n{'='*50}")
    print(f"  生成节奏游戏文件")
    print(f"{'='*50}\n")
    
    analyzer = RhythmAnalyzer(simulate=args.simulate)
    result = analyzer.analyze(args.audio_file)
    
    game = GameGenerator()
    game.generate(result, args.output)
    
    print(f"游戏文件已生成: {args.output}")
    print(f"  - BPM: {result['bpm']:.1f}")
    print(f"  - 拍点数: {len(result['beats'])}")


def cmd_metadata(args):
    print(f"\n{'='*50}")
    print(f"  写入BPM元数据")
    print(f"{'='*50}\n")
    
    if args.bpm:
        bpm = args.bpm
        print(f"使用手动指定BPM: {bpm}")
    else:
        analyzer = RhythmAnalyzer(simulate=args.simulate)
        result = analyzer.analyze(args.audio_file)
        bpm = result['bpm']
        print(f"检测到BPM: {bpm:.1f}")
    
    writer = MetadataWriter()
    writer.write_bpm(args.audio_file, bpm)
    print(f"\nBPM元数据已写入: {args.audio_file}")


def cmd_video(args):
    print(f"\n{'='*50}")
    print(f"  视频音频提取与分析")
    print(f"{'='*50}\n")
    
    extractor = VideoExtractor()
    audio_file = extractor.extract_audio(args.video_file, args.export_audio)
    
    if args.export_audio:
        print(f"音频已提取: {audio_file}")
    
    print("\n开始分析提取的音频...\n")
    analyzer = RhythmAnalyzer(simulate=args.simulate)
    result = analyzer.analyze(audio_file)
    
    print(f"BPM: {result['bpm']:.1f}")
    print(f"拍点数量: {len(result['beats'])}")
    print(f"时长: {result['duration']:.2f} 秒")


if __name__ == '__main__':
    main()
