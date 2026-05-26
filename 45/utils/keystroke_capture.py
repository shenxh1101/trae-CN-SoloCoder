import sys
import time
import hashlib
import os


def _capture_with_termios(num_strokes: int) -> list:
    import tty
    import termios
    import select

    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    
    intervals = []
    last_time = None
    strokes_captured = 0
    
    try:
        tty.setcbreak(fd)
        
        print("\n开始敲击空格键...")
        print("提示: 按空格键记录节奏，按回车键提前结束，按 Ctrl+C 取消\n")
        
        while strokes_captured < num_strokes:
            readable, _, _ = select.select([sys.stdin], [], [], 0.1)
            
            if readable:
                char = sys.stdin.read(1)
                
                if char == ' ':
                    sys.stdout.write('*')
                    sys.stdout.flush()
                    
                    current_time = time.time()
                    if last_time is not None:
                        interval = current_time - last_time
                        intervals.append(interval)
                        strokes_captured += 1
                        print(f" 已记录 {strokes_captured}/{num_strokes} 次间隔")
                    else:
                        print(" 开始记录...")
                    last_time = current_time
                    
                elif char in ('\r', '\n'):
                    print("\n提前结束记录")
                    break
                    
                elif char == '\x03':
                    raise KeyboardInterrupt()
                    
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    
    return intervals


def _capture_with_fallback(num_strokes: int) -> list:
    import select
    
    intervals = []
    last_time = None
    strokes_captured = 0
    
    print("\n开始敲击空格键后按回车...")
    print("提示: 按空格键然后回车来记录节奏，直接回车提前结束，Ctrl+C 取消\n")
    
    while strokes_captured < num_strokes:
        sys.stdout.write(f"请按空格键 ({strokes_captured+1}/{num_strokes}): ")
        sys.stdout.flush()
        
        try:
            line = input()
        except KeyboardInterrupt:
            raise
        
        if line == '':
            print("提前结束记录")
            break
        
        current_time = time.time()
        if last_time is not None:
            interval = current_time - last_time
            intervals.append(interval)
            strokes_captured += 1
            print(f"  已记录 {strokes_captured}/{num_strokes} 次间隔")
        else:
            strokes_captured += 1
            print(f"  开始记录... 已记录 {strokes_captured}/{num_strokes} 次间隔")
        last_time = current_time
    
    return intervals


def capture_keystroke_seed(num_strokes: int = 8) -> str:
    if num_strokes < 3:
        raise ValueError("敲击次数至少为3次")
    
    print(f"\n{'='*50}")
    print(f"  键盘节奏加密种子生成")
    print(f"  请按空格键 {num_strokes} 次，按您的节奏敲击")
    print(f"{'='*50}")
    print("\n准备好后按回车键开始...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\n已取消")
        return None
    
    intervals = []
    
    try:
        intervals = _capture_with_termios(num_strokes)
    except (ImportError, Exception):
        print("\n(使用兼容模式...)")
        try:
            intervals = _capture_with_fallback(num_strokes)
        except KeyboardInterrupt:
            print("\n已取消")
            return None
    except KeyboardInterrupt:
        print("\n已取消")
        return None
    
    if len(intervals) < 2:
        print("警告: 捕获的间隔数量不足，至少需要2个间隔")
        return None
    
    print(f"\n已捕获 {len(intervals)} 个时间间隔")
    
    seed_str = ','.join(f"{interval:.6f}" for interval in intervals)
    seed_hash = hashlib.sha256(seed_str.encode('utf-8')).hexdigest()
    
    print(f"生成的加密种子: {seed_hash[:16]}...")
    
    return seed_hash[:32]
