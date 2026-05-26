#!/usr/bin/env python3
"""
键盘节奏加密种子功能演示脚本

功能：
1. 捕获用户敲击空格键的时间间隔
2. 显示捕获的间隔数据
3. 生成加密种子
4. 使用种子加密一段文字
5. 验证解密结果
"""

import sys
import time
import hashlib


def _capture_interactive(num_strokes: int = 6) -> tuple:
    """交互式捕获键盘敲击间隔（简化版，便于演示）"""
    import tty
    import termios
    import select

    print(f"\n{'='*60}")
    print(f"  键盘节奏捕获演示")
    print(f"{'='*60}")
    print(f"\n请按空格键 {num_strokes} 次，按您的节奏敲击")
    print("提示:")
    print("  - 按空格键记录节奏")
    print("  - 按回车键可提前结束")
    print("  - 按 Ctrl+C 取消")
    print(f"\n准备好后按回车键开始...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\n已取消")
        return None, None

    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    
    intervals = []
    timestamps = []
    last_time = None
    strokes_captured = 0
    
    try:
        tty.setcbreak(fd)
        
        print(f"\n开始敲击空格键...")
        print(f"[{' ' * num_strokes}] 0/{num_strokes}", end='\r')
        
        while strokes_captured < num_strokes:
            readable, _, _ = select.select([sys.stdin], [], [], 0.1)
            
            if readable:
                char = sys.stdin.read(1)
                
                if char == ' ':
                    current_time = time.time()
                    timestamps.append(current_time)
                    
                    if last_time is not None:
                        interval = current_time - last_time
                        intervals.append(interval)
                    
                    strokes_captured += 1
                    progress = '█' * strokes_captured + ' ' * (num_strokes - strokes_captured)
                    print(f"[{progress}] {strokes_captured}/{num_strokes}", end='\r')
                    
                    last_time = current_time
                    
                elif char in ('\r', '\n'):
                    print(f"\n\n提前结束记录 (捕获了 {strokes_captured} 次敲击)")
                    break
                    
                elif char == '\x03':
                    raise KeyboardInterrupt()
                    
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    
    print()
    return intervals, timestamps


def generate_seed(intervals: list) -> str:
    """根据时间间隔生成加密种子"""
    if len(intervals) < 2:
        raise ValueError("需要至少2个时间间隔才能生成种子")
    
    seed_str = ','.join(f"{interval:.6f}" for interval in intervals)
    seed_hash = hashlib.sha256(seed_str.encode('utf-8')).hexdigest()
    
    return seed_hash[:32]


def xor_encrypt_demo(text: str, key: str) -> str:
    """简化的异或加密演示"""
    text_bytes = text.encode('utf-8')
    key_bytes = key.encode('utf-8')
    key_length = len(key_bytes)
    result = []
    
    for i, byte in enumerate(text_bytes):
        key_byte = key_bytes[i % key_length]
        xored = byte ^ key_byte
        result.append(format(xored, '02x'))
    
    return ''.join(result)


def xor_decrypt_demo(hex_text: str, key: str) -> str:
    """简化的异或解密演示"""
    key_bytes = key.encode('utf-8')
    key_length = len(key_bytes)
    result_bytes = bytearray()
    
    for i in range(0, len(hex_text), 2):
        hex_byte = hex_text[i:i+2]
        byte_val = int(hex_byte, 16)
        key_byte = key_bytes[(i // 2) % key_length]
        xored = byte_val ^ key_byte
        result_bytes.append(xored)
    
    try:
        return result_bytes.decode('utf-8')
    except UnicodeDecodeError:
        return "[解密失败 - 密钥不正确]"


def main():
    print("\n" + "="*60)
    print("  键盘节奏加密种子功能 - 交互式演示")
    print("="*60)
    
    try:
        # 步骤1: 捕获键盘间隔
        intervals, timestamps = _capture_interactive(num_strokes=6)
        
        if intervals is None or len(intervals) < 2:
            print("\n错误: 未能捕获足够的时间间隔")
            print("请确保按了至少3次空格键")
            return
        
        # 步骤2: 显示捕获的数据
        print("\n" + "="*60)
        print("  步骤 1: 捕获的时间间隔数据")
        print("="*60)
        
        print(f"\n敲击次数: {len(timestamps)} 次")
        print(f"时间间隔数: {len(intervals)} 个")
        print(f"\n详细数据:")
        
        for i, interval in enumerate(intervals, 1):
            bar_length = int(interval * 50)
            bar = '█' * min(bar_length, 40)
            print(f"  间隔 {i}: {interval:.3f} 秒 |{bar}|")
        
        avg_interval = sum(intervals) / len(intervals)
        min_interval = min(intervals)
        max_interval = max(intervals)
        
        print(f"\n统计:")
        print(f"  平均间隔: {avg_interval:.3f} 秒")
        print(f"  最小间隔: {min_interval:.3f} 秒")
        print(f"  最大间隔: {max_interval:.3f} 秒")
        
        # 步骤3: 生成种子
        print("\n" + "="*60)
        print("  步骤 2: 生成加密种子")
        print("="*60)
        
        seed = generate_seed(intervals)
        seed_input = ','.join(f"{i:.6f}" for i in intervals)
        
        print(f"\n间隔序列: {seed_input}")
        print(f"\n生成的种子 (SHA256 前32位):")
        print(f"  {seed}")
        print(f"\n种子长度: {len(seed)} 字符")
        
        # 步骤4: 加密演示
        print("\n" + "="*60)
        print("  步骤 3: 使用种子加密文本")
        print("="*60)
        
        original_text = "这是使用键盘节奏加密的秘密消息！Hello World 123!"
        print(f"\n原始文本:")
        print(f"  {original_text}")
        
        encrypted = xor_encrypt_demo(original_text, seed)
        print(f"\n加密结果 (十六进制):")
        print(f"  {encrypted}")
        print(f"\n密文长度: {len(encrypted)} 字符")
        
        # 步骤5: 解密验证
        print("\n" + "="*60)
        print("  步骤 4: 解密验证")
        print("="*60)
        
        decrypted = xor_decrypt_demo(encrypted, seed)
        print(f"\n使用相同种子解密:")
        print(f"  {decrypted}")
        
        if decrypted == original_text:
            print("\n✓ 解密成功！内容与原文完全一致")
        else:
            print("\n✗ 解密失败！内容不匹配")
        
        # 步骤6: 验证不同节奏产生不同结果
        print("\n" + "="*60)
        print("  步骤 5: 验证不同节奏产生不同密钥")
        print("="*60)
        
        # 模拟不同的间隔
        fake_intervals = [x * 1.1 for x in intervals]
        fake_seed = generate_seed(fake_intervals)
        fake_decrypted = xor_decrypt_demo(encrypted, fake_seed)
        
        print(f"\n真实种子:   {seed[:16]}...")
        print(f"模拟种子:   {fake_seed[:16]}...")
        print(f"相同: {seed == fake_seed}")
        
        print(f"\n使用错误种子解密:")
        print(f"  {fake_decrypted}")
        
        if seed != fake_seed:
            print("\n✓ 验证成功！不同的敲击节奏会产生不同的加密密钥")
        
        # 总结
        print("\n" + "="*60)
        print("  演示完成")
        print("="*60)
        print("\n总结:")
        print("  1. 键盘敲击的时间间隔被精确记录")
        print("  2. 这些间隔通过SHA256哈希生成唯一的加密密钥")
        print("  3. 相同的节奏产生相同的密钥")
        print("  4. 不同的节奏产生不同的密钥")
        print("  5. 密钥可用于异或加密解密")
        print("\n键盘节奏加密功能工作正常！")
        
    except KeyboardInterrupt:
        print("\n\n已取消演示")
    except Exception as e:
        print(f"\n\n错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
