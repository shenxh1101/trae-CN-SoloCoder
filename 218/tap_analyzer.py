"""
手动打拍子对比分析模块
支持交互式空格键打拍和自动演示模式
"""
import time
import sys
import os
import numpy as np

IS_WINDOWS = sys.platform == 'win32'


class TapAnalyzer:
    def __init__(self):
        self._old_settings = None

    def _set_raw_mode(self):
        if IS_WINDOWS:
            return
        if not sys.stdin.isatty():
            return
        import tty
        import termios
        self._old_settings = termios.tcgetattr(sys.stdin)
        tty.setcbreak(sys.stdin.fileno())

    def _restore_mode(self):
        if IS_WINDOWS:
            return
        if self._old_settings is None:
            return
        if not sys.stdin.isatty():
            return
        import termios
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self._old_settings)
        self._old_settings = None

    def _read_key(self):
        if IS_WINDOWS:
            import msvcrt
            if msvcrt.kbhit():
                return msvcrt.getch().decode('utf-8', errors='ignore')
            return None

        import select
        dr, _, _ = select.select([sys.stdin], [], [], 0.05)
        if dr:
            return sys.stdin.read(1)
        return None

    def start_tapping(self):
        if not sys.stdin.isatty():
            print("[警告] 非交互式终端，将使用自动演示模式")
            return self._demo_tapping()

        print("按Enter开始打拍子...")
        try:
            input()
        except EOFError:
            print("[警告] 输入不可用，切换到自动演示模式")
            return self._demo_tapping()

        print("\n开始打拍子！按空格键打拍，按q结束\n")
        print("  空格键 = 打拍")
        print("  q = 结束\n")

        taps = []
        try:
            self._set_raw_mode()
            start_time = time.time()

            while True:
                key = self._read_key()

                if key == ' ':
                    current_time = time.time() - start_time
                    taps.append(current_time)
                    sys.stdout.write(f"\r  打拍: {len(taps):3d} | 时间: {current_time:7.3f}s  ")
                    sys.stdout.flush()
                elif key in ('q', 'Q', '\x03', '\x04'):
                    break
        except Exception as e:
            print(f"\n输入异常: {e}")
        finally:
            self._restore_mode()

        print(f"\n\n打拍结束！共 {len(taps)} 次")
        return {
            'taps': taps,
            'count': len(taps)
        }

    def _demo_tapping(self, target_bpm=120, num_taps=16):
        print(f"\n[演示模式] 模拟以 {target_bpm} BPM 打拍 {num_taps} 次\n")

        interval = 60.0 / target_bpm
        taps = []
        for i in range(num_taps):
            jitter = np.random.uniform(-0.02, 0.02)
            tap_time = i * interval + jitter
            taps.append(tap_time)
            bar_len = 30
            filled = int((i + 1) / num_taps * bar_len)
            bar = '█' * filled + '░' * (bar_len - filled)
            sys.stdout.write(f"\r  模拟打拍: [{bar}] {i+1}/{num_taps} | {tap_time:.3f}s  ")
            sys.stdout.flush()
            time.sleep(0.03)

        print(f"\n\n模拟打拍完成！共 {len(taps)} 次")
        return {
            'taps': taps,
            'count': len(taps)
        }

    def start_tapping_demo(self, target_bpm=120, num_taps=16):
        return self._demo_tapping(target_bpm, num_taps)

    def calculate_bpm_from_taps(self, taps):
        if len(taps) < 2:
            return 0

        intervals = []
        for i in range(1, len(taps)):
            intervals.append(taps[i] - taps[i - 1])

        median_interval = float(np.median(intervals))
        bpm = 60.0 / median_interval if median_interval > 0 else 0

        return float(bpm)

    def compare(self, auto_beats, manual_taps, auto_bpm=None):
        if len(manual_taps) < 2:
            return "手动打拍次数太少，无法对比（至少需要2次）"

        manual_bpm = self.calculate_bpm_from_taps(manual_taps)

        lines = []
        lines.append("=" * 60)
        lines.append("  打拍对比结果")
        lines.append("=" * 60)
        lines.append(f"  自动检测 BPM:  {auto_bpm:.1f}" if auto_bpm else "  自动检测 BPM:  N/A")
        lines.append(f"  手动打拍 BPM:  {manual_bpm:.1f}")

        if auto_bpm:
            bpm_diff = abs(manual_bpm - auto_bpm)
            bpm_error_pct = (bpm_diff / auto_bpm) * 100
            lines.append(f"  BPM 差值:      {bpm_diff:.1f} ({bpm_error_pct:.1f}%)")
            if bpm_error_pct < 5:
                lines.append(f"  评价:          ★★★ 优秀 - 误差 < 5%")
            elif bpm_error_pct < 10:
                lines.append(f"  评价:          ★★ 良好 - 误差 < 10%")
            else:
                lines.append(f"  评价:          ★ 需改进 - 误差 >= 10%")

        lines.append("")
        lines.append(f"  自动拍点数:    {len(auto_beats)}")
        lines.append(f"  手动打拍数:    {len(manual_taps)}")

        if len(manual_taps) >= 2:
            intervals = [manual_taps[i] - manual_taps[i - 1] for i in range(1, len(manual_taps))]
            lines.append("")
            lines.append("  手动打拍间隔统计:")
            lines.append(f"    平均间隔:  {np.mean(intervals):.3f}s")
            lines.append(f"    最小间隔:  {min(intervals):.3f}s")
            lines.append(f"    最大间隔:  {max(intervals):.3f}s")
            lines.append(f"    标准差:    {np.std(intervals):.3f}s")

        if len(manual_taps) >= 4:
            alignment = self._calculate_alignment_error(auto_beats, manual_taps)
            lines.append("")
            lines.append("  对齐误差（手动拍点 vs 最近自动拍点）:")
            lines.append(f"    平均误差:  {alignment['avg_error']:.3f}s")
            lines.append(f"    最小误差:  {alignment['min_error']:.3f}s")
            lines.append(f"    最大误差:  {alignment['max_error']:.3f}s")

        lines.append("")
        lines.append("=" * 60)

        return '\n'.join(lines)

    def _calculate_alignment_error(self, auto_beats, manual_taps):
        auto_times = [b['time'] for b in auto_beats]

        errors = []
        for tap_time in manual_taps:
            closest = min(auto_times, key=lambda x: abs(x - tap_time))
            error = abs(closest - tap_time)
            errors.append(error)

        return {
            'avg_error': float(np.mean(errors)),
            'min_error': float(min(errors)),
            'max_error': float(max(errors))
        }
