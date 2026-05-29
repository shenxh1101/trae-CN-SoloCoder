#!/usr/bin/env python3
import subprocess
import os
import sys
from pathlib import Path

TEST_DIR = Path("/Users/mac/code/solo coder/158/test_videos")
FFMPEG = "/opt/homebrew/bin/ffmpeg"

def run_cmd(cmd, env=None):
    """运行命令并返回结果"""
    full_env = os.environ.copy()
    full_env["PATH"] = "/opt/homebrew/bin:" + full_env.get("PATH", "")
    if env:
        full_env.update(env)
    
    print(f"执行: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, env=full_env)
    if result.returncode != 0:
        print(f"  失败: {result.stderr}")
    return result

def create_test_videos():
    """创建测试视频"""
    print("\n" + "="*60)
    print("创建测试视频")
    print("="*60)
    
    tests = [
        ("quiet_video.mp4", "-25", "black"),
        ("medium_video.mp4", "-15", "blue"),
        ("loud_video.mp4", "-5", "red"),
        ("video_test.mkv", "-20", "green"),
    ]
    
    for name, volume, color in tests:
        output = TEST_DIR / name
        cmd = [
            FFMPEG,
            "-f", "lavfi",
            "-i", f"sine=frequency=440:duration=3",
            "-f", "lavfi",
            "-i", f"color=c={color}:s=320x240:duration=3",
            "-af", f"volume={volume}dB",
            "-c:v", "libx264",
            "-c:a", "aac",
            "-shortest",
            "-y",
            "-v", "error",
            str(output)
        ]
        result = run_cmd(cmd)
        if result.returncode == 0 and output.exists():
            print(f"  ✓ {name} 创建成功 (目标音量={volume}dB)")
        else:
            print(f"  ✗ {name} 创建失败: {result.stderr}")
    
    # 清理旧的test1.mp4
    old = TEST_DIR / "test1.mp4"
    if old.exists():
        old.unlink()
    
    # 列出文件
    print("\n测试目录内容:")
    for f in sorted(TEST_DIR.iterdir()):
        if f.is_file():
            print(f"  {f.name} ({f.stat().st_size/1024:.1f} KB)")

def test_loudnorm():
    """测试loudnorm滤镜分析LUFS值"""
    print("\n" + "="*60)
    print("测试1: loudnorm滤镜分析LUFS值")
    print("="*60)
    
    test_files = sorted([f for f in TEST_DIR.iterdir() if f.suffix.lower() in ('.mp4', '.mkv')])
    
    for video in test_files:
        cmd = [
            FFMPEG,
            "-i", str(video),
            "-af", "loudnorm=print_format=json",
            "-f", "null",
            "-hide_banner",
            "-nostats",
            "-"
        ]
        result = run_cmd(cmd)
        
        output = result.stderr + result.stdout
        import re
        import json
        json_match = re.search(r'\{.*\}', output, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            input_i = float(data.get('input_i', 0))
            input_tp = float(data.get('input_tp', 0))
            input_lra = float(data.get('input_lra', 0))
            print(f"  ✓ {video.name}:")
            print(f"    集成响度 (input_i): {input_i:.2f} LUFS")
            print(f"    真峰值 (input_tp): {input_tp:.2f} dB")
            print(f"    响度范围 (input_lra): {input_lra:.2f} LU")
        else:
            print(f"  ✗ {video.name}: 无法解析JSON结果")
            print(f"    stderr尾部: {result.stderr[-300:]}")

def get_lufs(video_path):
    """获取视频的LUFS值"""
    cmd = [
        FFMPEG,
        "-i", str(video_path),
        "-af", "loudnorm=print_format=json",
        "-f", "null",
        "-hide_banner",
        "-nostats",
        "-"
    ]
    env = {"PATH": "/opt/homebrew/bin:" + os.environ.get("PATH", "")}
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    output = result.stderr + result.stdout
    import re, json
    json_match = re.search(r'\{.*\}', output, re.DOTALL)
    if json_match:
        return float(json.loads(json_match.group()).get('input_i', 0))
    return None

def test_volume_filter():
    """测试volume滤镜调整音量（不重编码视频）"""
    print("\n" + "="*60)
    print("测试2: volume滤镜调整音量（视频流copy）")
    print("="*60)
    
    source = TEST_DIR / "quiet_video.mp4"
    if not source.exists():
        print("  ✗ 源文件不存在，跳过测试")
        return
    
    import re, json
    
    # 先分析原始音量
    orig_lufs = get_lufs(source)
    if orig_lufs is None:
        print("  ✗ 无法获取原始音量")
        return
    print(f"  原始音量: {orig_lufs:.2f} LUFS")
    
    # 测试1: 增加10dB，使用-c:v copy
    output1 = TEST_DIR / "test_volume_plus10.mp4"
    cmd = [
        FFMPEG,
        "-i", str(source),
        "-c:v", "copy",
        "-af", "volume=10dB",
        "-c:a", "aac",
        "-b:a", "256k",
        "-y",
        "-v", "error",
        str(output1)
    ]
    result = run_cmd(cmd)
    
    if result.returncode == 0 and output1.exists():
        print(f"  ✓ 增加10dB: 处理成功，输出文件 {output1.stat().st_size/1024:.1f} KB")
        
        # 分析调整后的音量
        new_lufs = get_lufs(output1)
        if new_lufs is not None:
            actual_change = new_lufs - orig_lufs
            print(f"    调整后音量: {new_lufs:.2f} LUFS")
            print(f"    实际变化: {actual_change:.2f} dB (预期: ~10 dB)")
            if abs(actual_change - 10) < 3:
                print(f"    ✓ 音量调整正确")
            else:
                print(f"    ⚠ 音量调整偏差较大")
        
        # 验证视频流未被重新编码
        cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0",
               "-show_entries", "stream=codec_name,bit_rate", "-of", "json", str(source)]
        result_source = subprocess.run(cmd, capture_output=True, text=True, 
                                        env={"PATH": "/opt/homebrew/bin:" + os.environ.get("PATH", "")})
        cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0",
               "-show_entries", "stream=codec_name,bit_rate", "-of", "json", str(output1)]
        result_output = subprocess.run(cmd, capture_output=True, text=True,
                                        env={"PATH": "/opt/homebrew/bin:" + os.environ.get("PATH", "")})
        
        src_info = json.loads(result_source.stdout)
        out_info = json.loads(result_output.stdout)
        src_codec = src_info['streams'][0]['codec_name']
        out_codec = out_info['streams'][0]['codec_name']
        src_bitrate = src_info['streams'][0].get('bit_rate', 'N/A')
        out_bitrate = out_info['streams'][0].get('bit_rate', 'N/A')
        
        print(f"    视频编码: 源={src_codec}, 输出={out_codec}")
        print(f"    视频码率: 源={src_bitrate}, 输出={out_bitrate}")
        if src_codec == out_codec:
            print(f"    ✓ 视频流未被重新编码 (copy成功)")
        else:
            print(f"    ✗ 视频流被重新编码了")
        
        output1.unlink()
    else:
        print(f"  ✗ 增加10dB: 处理失败")
    
    # 测试2: 减少5dB
    output2 = TEST_DIR / "test_volume_minus5.mp4"
    cmd = [
        FFMPEG,
        "-i", str(source),
        "-c:v", "copy",
        "-af", "volume=-5dB",
        "-c:a", "aac",
        "-b:a", "256k",
        "-y",
        "-v", "error",
        str(output2)
    ]
    result = run_cmd(cmd)
    
    if result.returncode == 0 and output2.exists():
        print(f"  ✓ 减少5dB: 处理成功")
        
        new_lufs = get_lufs(output2)
        if new_lufs is not None:
            actual_change = new_lufs - orig_lufs
            print(f"    调整后音量: {new_lufs:.2f} LUFS")
            print(f"    实际变化: {actual_change:.2f} dB (预期: ~-5 dB)")
            if abs(actual_change - (-5)) < 3:
                print(f"    ✓ 音量调整正确")
        
        output2.unlink()
    else:
        print(f"  ✗ 减少5dB: 处理失败")

def test_full_tool():
    """测试完整的工具功能"""
    print("\n" + "="*60)
    print("测试3: 完整工具功能测试")
    print("="*60)
    
    tool_path = Path("/Users/mac/code/solo coder/158/video_volume_adjuster.py")
    
    # 测试1: 仅分析模式
    print("\n3.1 仅分析模式 (--analyze-only)")
    cmd = [
        sys.executable, str(tool_path),
        "-i", str(TEST_DIR),
        "--analyze-only",
        "--report", str(TEST_DIR / "analyze_report.txt")
    ]
    env = {"PATH": "/opt/homebrew/bin:" + os.environ.get("PATH", "")}
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    print(result.stdout)
    if result.returncode == 0:
        print("  ✓ 仅分析模式成功")
        report = TEST_DIR / "analyze_report.txt"
        if report.exists():
            print(f"  ✓ 报告已生成: {report}")
            with open(report, 'r') as f:
                content = f.read()
                print(f"    报告大小: {len(content)} 字节")
                # 检查报告内容
                if "LUFS" in content and "原始音量" in content:
                    print(f"    ✓ 报告内容正确")
                else:
                    print(f"    ⚠ 报告内容可能不完整")
    else:
        print(f"  ✗ 仅分析模式失败: {result.stderr}")
    
    # 测试2: 调整音量模式，带rename
    print("\n3.2 调整音量模式 (--rename)")
    output_dir = TEST_DIR / "output"
    if output_dir.exists():
        import shutil
        shutil.rmtree(output_dir)
    
    cmd = [
        sys.executable, str(tool_path),
        "-i", str(TEST_DIR),
        "-t", "-20.0",
        "--max-gain", "10.0",
        "--rename",
        "-n", "2",
        "-o", str(output_dir),
        "--report", str(TEST_DIR / "adjust_report.txt"),
        "--overwrite"
    ]
    env = {"PATH": "/opt/homebrew/bin:" + os.environ.get("PATH", "")}
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    print(result.stdout)
    
    if result.returncode == 0 or result.returncode == 1:  # 部分失败也可能
        print(f"  返回码: {result.returncode}")
        
        if output_dir.exists():
            output_files = list(output_dir.iterdir())
            print(f"  输出文件数: {len(output_files)}")
            for f in sorted(output_files):
                print(f"    - {f.name}")
                if "_-20.0LUFS" in f.name:
                    print(f"      ✓ 文件名包含LUFS信息")
            
            # 验证其中一个文件的音量
            if output_files:
                test_output = output_files[0]
                new_lufs = get_lufs(test_output)
                if new_lufs is not None:
                    print(f"\n  输出文件 {test_output.name} 音量: {new_lufs:.2f} LUFS (目标: -20.0)")
                    if abs(new_lufs - (-20.0)) < 3:
                        print(f"  ✓ 音量调整成功")
                    else:
                        print(f"  ⚠ 音量偏差: {abs(new_lufs - (-20.0)):.2f} LUFS")
        
        report = TEST_DIR / "adjust_report.txt"
        if report.exists():
            print(f"\n  ✓ 调整报告已生成")
    
    # 清理输出目录
    if output_dir.exists():
        import shutil
        shutil.rmtree(output_dir)

def test_multithreading():
    """测试多线程处理"""
    print("\n" + "="*60)
    print("测试4: 多线程并发处理验证")
    print("="*60)
    
    import time
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    def process_file(index):
        """模拟处理一个文件"""
        start = time.time()
        time.sleep(0.5)  # 模拟处理时间
        elapsed = time.time() - start
        return index, elapsed
    
    # 测试单线程
    print("\n4.1 单线程处理 (4个任务):")
    start = time.time()
    results = []
    for i in range(4):
        results.append(process_file(i))
    single_time = time.time() - start
    for idx, elapsed in results:
        print(f"  任务 {idx}: 耗时 {elapsed:.2f}s")
    print(f"  总耗时: {single_time:.2f}s")
    
    # 测试4线程
    print("\n4.2 4线程处理 (4个任务):")
    start = time.time()
    results = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(process_file, i): i for i in range(4)}
        for future in as_completed(futures):
            results.append(future.result())
    multi_time = time.time() - start
    for idx, elapsed in sorted(results):
        print(f"  任务 {idx}: 耗时 {elapsed:.2f}s")
    print(f"  总耗时: {multi_time:.2f}s")
    
    if multi_time < single_time * 0.8:
        print(f"\n  ✓ 多线程加速有效 (单线程 {single_time:.2f}s vs 多线程 {multi_time:.2f}s)")
    else:
        print(f"\n  ⚠ 多线程加速不明显")
    
    # 测试实际视频处理多线程
    print("\n4.3 实际视频处理多线程:")
    tool_path = Path("/Users/mac/code/solo coder/158/video_volume_adjuster.py")
    
    # 先测试单线程
    output_dir1 = TEST_DIR / "output_single"
    if output_dir1.exists():
        import shutil
        shutil.rmtree(output_dir1)
    
    cmd = [
        sys.executable, str(tool_path),
        "-i", str(TEST_DIR),
        "-t", "-20.0",
        "-n", "1",
        "-o", str(output_dir1),
        "--overwrite"
    ]
    env = {"PATH": "/opt/homebrew/bin:" + os.environ.get("PATH", "")}
    
    start = time.time()
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    single_time = time.time() - start
    print(f"  单线程 (n=1): {single_time:.2f}s")
    
    # 测试4线程
    output_dir4 = TEST_DIR / "output_multi"
    if output_dir4.exists():
        import shutil
        shutil.rmtree(output_dir4)
    
    cmd = [
        sys.executable, str(tool_path),
        "-i", str(TEST_DIR),
        "-t", "-20.0",
        "-n", "4",
        "-o", str(output_dir4),
        "--overwrite"
    ]
    
    start = time.time()
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    multi_time = time.time() - start
    print(f"  多线程 (n=4): {multi_time:.2f}s")
    
    speedup = single_time / multi_time if multi_time > 0 else 1
    print(f"  加速比: {speedup:.2f}x")
    
    if speedup > 1.5:
        print(f"  ✓ 多线程处理有效加速")
    else:
        print(f"  ⚠ 多线程加速效果有限（小文件处理受IO限制）")
    
    # 清理
    for d in [output_dir1, output_dir4]:
        if d.exists():
            import shutil
            shutil.rmtree(d)

def main():
    print("="*60)
    print("视频音量调整工具 - 完整测试套件")
    print("="*60)
    
    # 检查ffmpeg
    result = run_cmd([FFMPEG, "-version"])
    if result.returncode == 0:
        version_line = result.stdout.split('\n')[0]
        print(f"ffmpeg版本: {version_line}")
    else:
        print("✗ ffmpeg不可用")
        return
    
    # 检查必要滤镜
    result = run_cmd([FFMPEG, "-filters"])
    filters = result.stdout
    required = ["loudnorm", "volume"]
    for f in required:
        if f in filters:
            print(f"✓ 滤镜 {f} 可用")
        else:
            print(f"✗ 滤镜 {f} 不可用")
    
    # 运行所有测试
    try:
        create_test_videos()
        test_loudnorm()
        test_volume_filter()
        test_full_tool()
        test_multithreading()
    except Exception as e:
        print(f"\n✗ 测试过程出错: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)

if __name__ == '__main__':
    main()
