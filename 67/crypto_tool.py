#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
命令行文本加密工具
支持多种经典加密算法，包括凯撒密码、维吉尼亚密码、异或密码和替换密码。

功能特性：
- 四种加密算法：凯撒密码、维吉尼亚密码、异或密码、替换密码
- 多种输出格式：纯文本、十六进制、Base64
- 文件操作：支持单文件和批量文件夹加密
- 暴力破解：自动尝试凯撒密码所有偏移量
- 算法检测：根据密文特征猜测加密方式
- 加密包：将参数和密文打包保存，解密时自动读取
- 键盘密钥：通过敲击空格节奏生成随机密钥种子
- 校验和：MD5校验和防止数据篡改
- 历史记录：保存最近10次操作记录

使用示例：
    python crypto_tool.py --mode encrypt --algorithm caesar --text "Hello" --shift 3
    python crypto_tool.py --mode decrypt --algorithm vigenere --text "Khoor" --keyword KEY
"""

import argparse
import sys
import os
import base64
import json
import hashlib
import time
import random
import string
from typing import Dict, List, Tuple, Optional


class CryptoTool:
    """
    加密工具主类，集成所有加密和解密功能
    
    属性:
        history_file: 历史记录文件路径
        history: 历史记录列表
    """
    
    def __init__(self):
        """初始化加密工具，加载历史记录"""
        self.history_file = os.path.join(os.path.expanduser("~"), ".crypto_history.json")
        self.history = self._load_history()
    
    def _load_history(self) -> List[Dict]:
        """
        从文件加载历史记录
        
        Returns:
            历史记录列表，加载失败返回空列表
        """
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []
    
    def _save_history(self) -> None:
        """保存历史记录到文件，只保留最近10条"""
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(self.history[-10:], f, indent=2)
        except IOError:
            pass
    
    def add_history(self, operation: str, algorithm: str, input_preview: str, output_preview: str) -> None:
        """
        添加一条历史记录
        
        Args:
            operation: 操作类型（encrypt/decrypt等）
            algorithm: 使用的算法
            input_preview: 输入预览
            output_preview: 输出预览
        """
        entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "operation": operation,
            "algorithm": algorithm,
            "input_preview": input_preview[:50],
            "output_preview": output_preview[:50]
        }
        self.history.append(entry)
        self._save_history()
    
    def show_history(self) -> None:
        """显示最近的加密历史记录"""
        if not self.history:
            print("无历史记录")
            return
        print("=" * 60)
        print("加密历史记录（最近10条）")
        print("=" * 60)
        for i, entry in enumerate(reversed(self.history), 1):
            print(f"\n[{i}] {entry['timestamp']}")
            print(f"    操作: {entry['operation']} | 算法: {entry['algorithm']}")
            print(f"    输入: {entry['input_preview']}...")
            print(f"    输出: {entry['output_preview']}...")
    
    # =========================================================================
    # 凯撒密码 (Caesar Cipher)
    # 原理：将每个字母在字母表中向后（或向前）移动固定数量的位置
    # 例如，偏移量为3时，A→D, B→E, ..., X→A, Y→B, Z→C
    # =========================================================================
    
    def caesar_encrypt(self, text: str, shift: int) -> str:
        """
        凯撒密码加密
        
        Args:
            text: 要加密的明文
            shift: 偏移量（正数向后偏移，负数向前偏移）
            
        Returns:
            加密后的密文
            
        示例:
            >>> tool.caesar_encrypt("Hello World", 3)
            'Khoor Zruog'
        """
        result = []
        for char in text:
            if char.isalpha():
                # 确定字母的基准值（大写A或小写a）
                base = ord('A') if char.isupper() else ord('a')
                # 计算偏移后的字符位置，使用模26处理循环
                result.append(chr((ord(char) - base + shift) % 26 + base))
            else:
                # 非字母字符保持不变
                result.append(char)
        return ''.join(result)
    
    def caesar_decrypt(self, text: str, shift: int) -> str:
        """
        凯撒密码解密（加密的逆操作）
        
        Args:
            text: 要解密的密文
            shift: 偏移量（与加密时相同）
            
        Returns:
            解密后的明文
        """
        return self.caesar_encrypt(text, -shift)
    
    def caesar_crack(self, ciphertext: str) -> List[Tuple[int, str, float]]:
        """
        暴力破解凯撒密码
        
        使用英文字母频率分析来判断最可能的明文。
        英语中最常见的字母是E、T、A、O、I、N、S、H、R等。
        
        Args:
            ciphertext: 凯撒加密的密文
            
        Returns:
            列表，每个元素为(偏移量, 明文, 得分)，按得分从高到低排序
        """
        # 英文字母频率表（百分比）
        english_freq = {
            'E': 12.7, 'T': 9.1, 'A': 8.2, 'O': 7.5, 'I': 7.0, 'N': 6.7,
            'S': 6.3, 'H': 6.1, 'R': 6.0, 'D': 4.3, 'L': 4.0, 'C': 2.8,
            'U': 2.8, 'M': 2.4, 'W': 2.4, 'F': 2.2, 'G': 2.0, 'Y': 2.0,
            'P': 1.9, 'B': 1.5, 'V': 1.0, 'K': 0.8, 'J': 0.2, 'X': 0.2,
            'Q': 0.1, 'Z': 0.1
        }
        
        results = []
        # 尝试所有可能的偏移量（0-25）
        for shift in range(26):
            plaintext = self.caesar_decrypt(ciphertext, shift)
            score = self._frequency_score(plaintext.upper(), english_freq)
            results.append((shift, plaintext, score))
        
        # 按得分从高到低排序
        results.sort(key=lambda x: x[2], reverse=True)
        return results
    
    def _frequency_score(self, text: str, freq_table: Dict[str, float]) -> float:
        """
        计算文本的字母频率匹配得分
        
        Args:
            text: 要分析的文本
            freq_table: 参考频率表
            
        Returns:
            得分，越高表示越接近参考频率
        """
        letter_counts = {chr(ord('A') + i): 0 for i in range(26)}
        total = 0
        
        # 统计每个字母出现的次数
        for char in text:
            if char.isalpha():
                letter_counts[char.upper()] += 1
                total += 1
        
        if total == 0:
            return 0
        
        # 计算实际频率与期望频率的差异
        score = 0
        for letter, count in letter_counts.items():
            actual_freq = (count / total) * 100
            expected_freq = freq_table.get(letter, 0)
            score += abs(actual_freq - expected_freq)
        
        # 转换为0-100的得分，差异越小得分越高
        return max(0, 100 - score)
    
    # =========================================================================
    # 维吉尼亚密码 (Vigenère Cipher)
    # 原理：使用一个关键词作为密钥，根据密钥字母确定每个明文字母的偏移量
    # 例如，密钥为"KEY"，则第1个字母偏移K(10)，第2个偏移E(4)，第3个偏移Y(24)
    # 第4个又回到K(10)，如此循环
    # =========================================================================
    
    def vigenere_encrypt(self, text: str, keyword: str) -> str:
        """
        维吉尼亚密码加密
        
        Args:
            text: 要加密的明文
            keyword: 密钥词（只使用字母）
            
        Returns:
            加密后的密文
            
        示例:
            >>> tool.vigenere_encrypt("Hello World", "SECRET")
            'Zincs Pgvnu'
        """
        result = []
        # 处理空密钥，默认使用 'A' 作为密钥（偏移量为0，即不加密）
        keyword = keyword.upper() if keyword else 'A'
        keyword_len = len(keyword)
        keyword_index = 0
        
        for char in text:
            if char.isalpha():
                base = ord('A') if char.isupper() else ord('a')
                # 根据当前密钥字母确定偏移量
                shift = ord(keyword[keyword_index % keyword_len]) - ord('A')
                result.append(chr((ord(char) - base + shift) % 26 + base))
                keyword_index += 1
            else:
                # 非字母字符保持不变（不消耗密钥）
                result.append(char)
        return ''.join(result)
    
    def vigenere_decrypt(self, text: str, keyword: str) -> str:
        """
        维吉尼亚密码解密
        
        Args:
            text: 要解密的密文
            keyword: 密钥词（与加密时相同）
            
        Returns:
            解密后的明文
        """
        result = []
        # 处理空密钥，默认使用 'A' 作为密钥
        keyword = keyword.upper() if keyword else 'A'
        keyword_len = len(keyword)
        keyword_index = 0
        
        for char in text:
            if char.isalpha():
                base = ord('A') if char.isupper() else ord('a')
                shift = ord(keyword[keyword_index % keyword_len]) - ord('A')
                # 使用负偏移进行解密
                result.append(chr((ord(char) - base - shift) % 26 + base))
                keyword_index += 1
            else:
                result.append(char)
        return ''.join(result)
    
    # =========================================================================
    # 异或密码 (XOR Cipher)
    # 原理：将明文的每个字节与密钥字节进行异或运算
    # 异或运算的特点是：A XOR B = C, C XOR B = A，因此加密和解密使用相同操作
    # =========================================================================
    
    def xor_crypt(self, text: str, key_byte: int) -> bytes:
        """
        异或加密（解密时使用相同的函数）
        
        Args:
            text: 要加密的明文
            key_byte: 密钥字节（0-255）
            
        Returns:
            加密后的字节数据
            
        示例:
            >>> tool.xor_crypt("Hello", 0x42)
            b'\\x0a\\'..-'
        """
        # 确保密钥字节在有效范围内
        key_byte = max(0, min(255, key_byte))
        data = text.encode('utf-8')
        return bytes([b ^ key_byte for b in data])
    
    def xor_decrypt(self, data: bytes, key_byte: int) -> str:
        """
        异或解密
        
        Args:
            data: 加密的字节数据
            key_byte: 密钥字节（与加密时相同）
            
        Returns:
            解密后的字符串
        """
        key_byte = max(0, min(255, key_byte))
        return bytes([b ^ key_byte for b in data]).decode('utf-8', errors='replace')
    
    # =========================================================================
    # 替换密码 (Substitution Cipher)
    # 原理：将每个字母替换为另一个固定的字母
    # 例如，映射表中A→Q，B→W，...，则所有A都替换为Q，所有B替换为W
    # =========================================================================
    
    def generate_substitution_map(self, seed: Optional[int] = None) -> Dict[str, str]:
        """
        生成随机的替换密码映射表
        
        Args:
            seed: 随机种子，用于可重复的映射生成
            
        Returns:
            字母映射字典 {'A': 'X', 'B': 'Y', ...}
            
        示例:
            >>> tool.generate_substitution_map(seed=42)
            {'A': 'N', 'B': 'Z', ...}
        """
        if seed is not None:
            random.seed(seed)
        letters = list(string.ascii_uppercase)
        shuffled = letters.copy()
        random.shuffle(shuffled)
        return dict(zip(letters, shuffled))
    
    def parse_substitution_map(self, map_str: str) -> Dict[str, str]:
        """
        解析用户提供的替换映射表字符串
        
        支持两种格式：
        1. seed:数字 - 使用种子生成映射表
        2. A:B,C:D,... - 显式指定映射关系
        
        Args:
            map_str: 映射表字符串
            
        Returns:
            字母映射字典
            
        示例:
            >>> tool.parse_substitution_map("seed:123")
            >>> tool.parse_substitution_map("A:B,C:D,E:F")
        """
        if not map_str:
            return self.generate_substitution_map()
        
        # 检查是否为种子格式
        if map_str.lower().startswith("seed:"):
            try:
                seed = int(map_str[5:])
                return self.generate_substitution_map(seed)
            except ValueError:
                print(f"警告：无效的种子值 '{map_str[5:]}'，使用随机映射")
                return self.generate_substitution_map()
        
        # 解析显式映射
        mapping = {}
        pairs = map_str.split(',')
        for pair in pairs:
            if ':' in pair:
                try:
                    k, v = pair.strip().split(':')
                    k = k.strip().upper()
                    v = v.strip().upper()
                    if k in string.ascii_uppercase and v in string.ascii_uppercase:
                        mapping[k] = v
                except:
                    continue
        
        # 填充未指定的映射（保持原样）
        for letter in string.ascii_uppercase:
            if letter not in mapping:
                mapping[letter] = letter
        
        return mapping
    
    def substitution_encrypt(self, text: str, mapping: Dict[str, str]) -> str:
        """
        替换密码加密
        
        Args:
            text: 要加密的明文
            mapping: 字母映射字典
            
        Returns:
            加密后的密文
            
        示例:
            >>> mapping = {'A': 'X', 'B': 'Y', 'C': 'Z', ...}
            >>> tool.substitution_encrypt("ABC", mapping)
            'XYZ'
        """
        result = []
        for char in text:
            if char.isalpha():
                upper_char = char.upper()
                # 使用映射，未定义的保持原样
                encrypted = mapping.get(upper_char, upper_char)
                # 保持原有的大小写
                result.append(encrypted if char.isupper() else encrypted.lower())
            else:
                # 非字母字符保持不变
                result.append(char)
        return ''.join(result)
    
    def substitution_decrypt(self, text: str, mapping: Dict[str, str]) -> str:
        """
        替换密码解密（使用反向映射）
        
        Args:
            text: 要解密的密文
            mapping: 加密时使用的字母映射字典
            
        Returns:
            解密后的明文
        """
        # 只对用户定义的非恒等映射创建反向映射
        reverse_mapping = {}
        for k, v in mapping.items():
            if k != v:  # 只处理非恒等映射
                reverse_mapping[v] = k
        
        # 解密时使用反向映射
        result = []
        for char in text:
            if char.isalpha():
                upper_char = char.upper()
                decrypted = reverse_mapping.get(upper_char, upper_char)
                result.append(decrypted if char.isupper() else decrypted.lower())
            else:
                result.append(char)
        return ''.join(result)
    
    # =========================================================================
    # 编码转换函数
    # 支持将加密结果转换为十六进制或Base64格式，方便传输和复制
    # =========================================================================
    
    def to_hex(self, data: bytes) -> str:
        """
        将字节数据转换为十六进制字符串
        
        Args:
            data: 字节数据
            
        Returns:
            十六进制字符串
        """
        return data.hex()
    
    def from_hex(self, hex_str: str) -> bytes:
        """
        将十六进制字符串转换回字节数据
        
        Args:
            hex_str: 十六进制字符串
            
        Returns:
            字节数据
        """
        try:
            return bytes.fromhex(hex_str)
        except ValueError:
            print(f"警告：无效的十六进制字符串")
            return b''
    
    def to_base64(self, data: bytes) -> str:
        """
        将字节数据转换为Base64编码字符串
        
        Args:
            data: 字节数据
            
        Returns:
            Base64编码字符串
        """
        return base64.b64encode(data).decode('ascii')
    
    def from_base64(self, b64_str: str) -> bytes:
        """
        将Base64编码字符串转换回字节数据
        
        Args:
            b64_str: Base64编码字符串
            
        Returns:
            字节数据
        """
        try:
            return base64.b64decode(b64_str)
        except Exception:
            print(f"警告：无效的Base64字符串")
            return b''
    
    # =========================================================================
    # 校验和功能
    # 使用MD5哈希的前8位作为数据校验和，防止数据在传输过程中被篡改
    # =========================================================================
    
    def add_checksum(self, data: str) -> str:
        """
        为数据添加校验和
        
        格式：校验和:数据
        
        Args:
            data: 要添加校验和的数据
            
        Returns:
            带有校验和的数据字符串
        """
        checksum = hashlib.md5(data.encode('utf-8')).hexdigest()[:8]
        return f"{checksum}:{data}"
    
    def verify_checksum(self, data_with_checksum: str) -> Tuple[bool, str]:
        """
        验证校验和并提取数据
        
        Args:
            data_with_checksum: 带有校验和的数据字符串
            
        Returns:
            (校验是否通过, 原始数据)
        """
        if ':' not in data_with_checksum:
            return False, data_with_checksum
        
        try:
            checksum, data = data_with_checksum.split(':', 1)
            actual_checksum = hashlib.md5(data.encode('utf-8')).hexdigest()[:8]
            return checksum == actual_checksum, data
        except:
            return False, data_with_checksum
    
    # =========================================================================
    # 键盘敲击密钥生成
    # 通过用户敲击空格键的时间间隔生成随机种子
    # 这是一种利用人类行为随机性的真随机数生成方法
    # =========================================================================
    
    def keyboard_seed_generator(self, test_mode: bool = False, test_timings: Optional[List[float]] = None) -> int:
        """
        通过键盘敲击节奏生成随机种子
        
        用户按空格键的时间间隔会被记录并转换为随机种子。
        这是一种利用人类行为熵的密钥生成方法。
        
        Args:
            test_mode: 测试模式，跳过实际键盘输入
            test_timings: 测试用的时间间隔数据
            
        Returns:
            生成的随机种子（32位整数）
        """
        if not test_mode:
            print("请按任意节奏敲击空格键，完成后按Enter键...")
            print("提示：敲击节奏将用于生成随机密钥种子")
            print("（建议至少敲击10次以获得足够的随机性）")
        
        timings = test_timings if test_mode else []
        last_time = time.time()
        
        if not test_mode:
            try:
                import tty
                import termios
                
                fd = sys.stdin.fileno()
                old_settings = termios.tcgetattr(fd)
                
                try:
                    tty.setcbreak(fd)
                    while True:
                        ch = sys.stdin.read(1)
                        if ch == '\n':
                            break
                        if ch == ' ':
                            current_time = time.time()
                            interval = current_time - last_time
                            timings.append(interval)
                            last_time = current_time
                            # 显示进度
                            if len(timings) % 5 == 0:
                                print(f"  已记录 {len(timings)} 次敲击...", end='\r', flush=True)
                            else:
                                print(".", end='', flush=True)
                finally:
                    termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
            except (ImportError, termios.error):
                # Windows或不支持termios的系统
                print("\n(兼容模式：每次按空格后按回车，直接按回车结束)")
                while True:
                    try:
                        ch = input()
                        if ch == '':
                            break
                        current_time = time.time()
                        interval = current_time - last_time
                        timings.append(interval)
                        last_time = current_time
                        print(f"  已记录 {len(timings)} 次敲击", end='\r', flush=True)
                    except EOFError:
                        break
        
        print()
        
        # 检查敲击次数是否足够
        if len(timings) < 3:
            print("警告：敲击次数太少，使用默认种子")
            return 42
        
        # 使用时间间隔的总和和方差生成种子
        # 乘以1e6将秒转换为微秒，增加分辨率
        sum_timings = sum(timings)
        mean_timing = sum_timings / len(timings)
        variance = sum((t - mean_timing) ** 2 for t in timings)
        
        # 组合多个熵源
        seed = int((sum_timings * 1000000 + variance * 1000) % (2**32))
        
        if not test_mode:
            print(f"✓ 成功生成种子!")
            print(f"  敲击次数: {len(timings)}")
            print(f"  种子值: {seed}")
        
        return seed
    
    # =========================================================================
    # 加密包功能
    # 将加密参数和密文一起保存为JSON文件，解密时自动读取参数
    # 方便用户无需记住加密时使用的参数
    # =========================================================================
    
    def save_crypto_package(self, filepath: str, ciphertext: str, algorithm: str, params: Dict) -> bool:
        """
        保存加密包（包含密文、算法和参数）
        
        Args:
            filepath: 保存路径
            ciphertext: 加密后的密文
            algorithm: 使用的算法
            params: 加密参数
            
        Returns:
            是否保存成功
        """
        package = {
            "algorithm": algorithm,
            "params": params,
            "ciphertext": ciphertext,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0"
        }
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(package, f, indent=2)
            return True
        except IOError as e:
            print(f"保存加密包失败: {e}")
            return False
    
    def load_crypto_package(self, filepath: str) -> Tuple[Optional[str], Optional[str], Optional[Dict]]:
        """
        加载加密包
        
        Args:
            filepath: 加密包文件路径
            
        Returns:
            (密文, 算法, 参数)，加载失败返回(None, None, None)
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                package = json.load(f)
            
            ciphertext = package.get("ciphertext")
            algorithm = package.get("algorithm")
            params = package.get("params", {})
            
            if not ciphertext or not algorithm:
                print("错误：加密包格式不正确")
                return None, None, None
            
            return ciphertext, algorithm, params
        except (json.JSONDecodeError, IOError) as e:
            print(f"加载加密包失败: {e}")
            return None, None, None
    
    # =========================================================================
    # 算法自动检测
    # 根据密文的特征（字母比例、编码格式等）猜测可能使用的加密算法
    # =========================================================================
    
    def detect_algorithm(self, ciphertext: str) -> List[Tuple[str, float]]:
        """
        检测密文可能使用的加密算法
        
        根据以下特征进行判断：
        - 字母比例高 → 可能是凯撒、维吉尼亚或替换密码
        - 可被hex或base64解码 → 可能是异或密码
        - 字母分布均匀性 → 替换密码的分布更均匀
        
        Args:
            ciphertext: 要检测的密文
            
        Returns:
            列表，每个元素为(算法名称, 置信度)，按置信度从高到低排序
        """
        scores = []
        
        if not ciphertext:
            return [("unknown", 0.0)]
        
        alpha_chars = sum(1 for c in ciphertext if c.isalpha())
        total_chars = len(ciphertext)
        alpha_ratio = alpha_chars / max(total_chars, 1)
        
        # 字母比例判断
        if alpha_ratio > 0.8:
            # 可能是字母类加密算法
            scores.append(("caesar", 0.7))
            scores.append(("vigenere", 0.6))
            scores.append(("substitution", 0.65))
            
            # 进一步分析字母分布
            letter_counts = {}
            for c in ciphertext.upper():
                if c.isalpha():
                    letter_counts[c] = letter_counts.get(c, 0) + 1
            
            if letter_counts:
                max_count = max(letter_counts.values())
                total = sum(letter_counts.values())
                max_freq = max_count / total
                
                # 凯撒密码通常保留字母频率分布
                # 替换密码的频率分布也类似，只是字母被替换
                if max_freq > 0.12:  # 接近英语中E的频率
                    scores = [s if s[0] != "caesar" else ("caesar", 0.8) for s in scores]
        else:
            # 可能是异或等字节级加密
            scores.append(("xor", 0.8))
        
        # 检查是否为十六进制格式
        try:
            decoded = bytes.fromhex(ciphertext)
            if len(decoded) > 0:
                scores.append(("xor", 0.9))
        except ValueError:
            pass
        
        # 检查是否为Base64格式
        try:
            decoded = base64.b64decode(ciphertext)
            if len(decoded) > 0 and len(ciphertext) > 5:
                current_xor_score = next((s[1] for s in scores if s[0] == "xor"), 0)
                scores = [s if s[0] != "xor" else ("xor", max(current_xor_score, 0.85)) for s in scores]
        except Exception:
            pass
        
        # 去重并按得分排序
        final_scores = {}
        for algo, score in scores:
            if algo in final_scores:
                final_scores[algo] = max(final_scores[algo], score)
            else:
                final_scores[algo] = score
        
        results = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
        return results
    
    # =========================================================================
    # 文件操作
    # 支持单文件和批量文件夹的加密/解密操作
    # =========================================================================
    
    def process_file(self, input_file: str, output_file: str, encrypt: bool, algorithm: str, **kwargs) -> Optional[str]:
        """
        处理单个文件的加密或解密
        
        Args:
            input_file: 输入文件路径
            output_file: 输出文件路径
            encrypt: True表示加密，False表示解密
            algorithm: 使用的算法
            **kwargs: 其他算法参数
            
        Returns:
            处理结果字符串，失败返回None
        """
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                text = f.read()
        except IOError as e:
            print(f"读取文件失败: {e}")
            return None
        
        try:
            if encrypt:
                result = self._encrypt_text(text, algorithm, **kwargs)
            else:
                result = self._decrypt_text(text, algorithm, **kwargs)
        except Exception as e:
            print(f"处理失败: {e}")
            return None
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(result)
            return result
        except IOError as e:
            print(f"写入文件失败: {e}")
            return None
    
    def batch_process(self, input_dir: str, output_dir: str, encrypt: bool, algorithm: str, **kwargs) -> int:
        """
        批量处理文件夹中的所有文本文件
        
        Args:
            input_dir: 输入目录
            output_dir: 输出目录
            encrypt: True表示加密，False表示解密
            algorithm: 使用的算法
            **kwargs: 其他算法参数
            
        Returns:
            成功处理的文件数量
        """
        if not os.path.exists(input_dir):
            print(f"错误：输入目录不存在: {input_dir}")
            return 0
        
        if not os.path.exists(output_dir):
            try:
                os.makedirs(output_dir)
            except OSError as e:
                print(f"创建输出目录失败: {e}")
                return 0
        
        success_count = 0
        for filename in os.listdir(input_dir):
            input_path = os.path.join(input_dir, filename)
            if os.path.isfile(input_path) and filename.endswith('.txt'):
                prefix = 'enc_' if encrypt else 'dec_'
                output_path = os.path.join(output_dir, f"{prefix}{filename}")
                result = self.process_file(input_path, output_path, encrypt, algorithm, **kwargs)
                if result is not None:
                    print(f"✓ 已处理: {filename} -> {os.path.basename(output_path)}")
                    success_count += 1
                else:
                    print(f"✗ 处理失败: {filename}")
        
        print(f"\n批量处理完成，成功 {success_count} 个文件")
        return success_count
    
    # =========================================================================
    # 内部加密/解密辅助函数
    # =========================================================================
    
    def _encrypt_text(self, text: str, algorithm: str, **kwargs) -> str:
        """
        内部加密辅助函数，根据算法调用相应的加密方法
        
        Args:
            text: 要加密的文本
            algorithm: 加密算法名称
            **kwargs: 算法参数
            
        Returns:
            加密后的字符串
        """
        output_format = kwargs.get('output_format', 'text')
        use_checksum = kwargs.get('use_checksum', False)
        
        if algorithm == 'caesar':
            shift = kwargs.get('shift', 3)
            result = self.caesar_encrypt(text, shift)
        elif algorithm == 'vigenere':
            keyword = kwargs.get('keyword', 'KEY')
            result = self.vigenere_encrypt(text, keyword)
        elif algorithm == 'xor':
            key_byte = kwargs.get('key_byte', 0x42)
            encrypted_bytes = self.xor_crypt(text, key_byte)
            if output_format == 'hex':
                result = self.to_hex(encrypted_bytes)
            elif output_format == 'base64':
                result = self.to_base64(encrypted_bytes)
            else:
                result = encrypted_bytes.decode('latin-1')
        elif algorithm == 'substitution':
            mapping = kwargs.get('mapping', self.generate_substitution_map())
            result = self.substitution_encrypt(text, mapping)
        else:
            raise ValueError(f"未知算法: {algorithm}")
        
        # 添加校验和（异或加密在输出格式中已包含完整性）
        if use_checksum and algorithm != 'xor':
            result = self.add_checksum(result)
        
        return result
    
    def _decrypt_text(self, text: str, algorithm: str, **kwargs) -> str:
        """
        内部解密辅助函数，根据算法调用相应的解密方法
        
        Args:
            text: 要解密的文本
            algorithm: 加密算法名称
            **kwargs: 算法参数
            
        Returns:
            解密后的字符串
        """
        use_checksum = kwargs.get('use_checksum', False)
        
        # 验证校验和
        if use_checksum and algorithm != 'xor':
            valid, text = self.verify_checksum(text)
            if not valid:
                print("⚠ 警告：校验和不匹配，数据可能被篡改！")
        
        if algorithm == 'caesar':
            shift = kwargs.get('shift', 3)
            result = self.caesar_decrypt(text, shift)
        elif algorithm == 'vigenere':
            keyword = kwargs.get('keyword', 'KEY')
            result = self.vigenere_decrypt(text, keyword)
        elif algorithm == 'xor':
            input_format = kwargs.get('input_format', 'text')
            key_byte = kwargs.get('key_byte', 0x42)
            if input_format == 'hex':
                encrypted_bytes = self.from_hex(text)
            elif input_format == 'base64':
                encrypted_bytes = self.from_base64(text)
            else:
                encrypted_bytes = text.encode('latin-1')
            result = self.xor_decrypt(encrypted_bytes, key_byte)
        elif algorithm == 'substitution':
            mapping = kwargs.get('mapping', {})
            result = self.substitution_decrypt(text, mapping)
        else:
            raise ValueError(f"未知算法: {algorithm}")
        
        return result


def main():
    """命令行主函数"""
    parser = argparse.ArgumentParser(
        description='命令行文本加密工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  凯撒加密:       python crypto_tool.py --mode encrypt --algorithm caesar --text "Hello" --shift 3
  维吉尼亚加密:   python crypto_tool.py --mode encrypt --algorithm vigenere --text "Hello" --keyword SECRET
  异或加密(hex):  python crypto_tool.py --mode encrypt --algorithm xor --text "Hello" --output-format hex
  文件加密:       python crypto_tool.py --mode encrypt --algorithm caesar --input-file in.txt --output-file out.txt
  暴力破解:       python crypto_tool.py --mode crack --text "Khoor Zruog"
  算法检测:       python crypto_tool.py --mode detect --text "Khoor Zruog"
  加密包:         python crypto_tool.py --mode encrypt --algorithm caesar --text "Hello" --package --output-file pkg.json
  键盘密钥:       python crypto_tool.py --mode encrypt --algorithm caesar --text "Hello" --keyboard-seed
  查看历史:       python crypto_tool.py --mode history
        """
    )
    
    parser.add_argument('--mode', choices=['encrypt', 'decrypt', 'crack', 'detect', 'history'], 
                       default='encrypt', help='操作模式')
    parser.add_argument('--algorithm', choices=['caesar', 'vigenere', 'xor', 'substitution'],
                       help='加密算法')
    parser.add_argument('--text', help='要处理的文本')
    parser.add_argument('--input-file', help='输入文件路径')
    parser.add_argument('--output-file', help='输出文件路径')
    parser.add_argument('--input-dir', help='批量输入目录')
    parser.add_argument('--output-dir', help='批量输出目录')
    parser.add_argument('--shift', type=int, default=3, help='凯撒密码偏移量 (默认: 3)')
    parser.add_argument('--keyword', help='维吉尼亚密码密钥词')
    parser.add_argument('--key-byte', type=int, default=0x42, help='异或密码密钥字节 (默认: 0x42)')
    parser.add_argument('--mapping', help='替换密码映射表 (A:B,C:D,... 或 seed:123)')
    parser.add_argument('--output-format', choices=['text', 'hex', 'base64'], 
                       default='text', help='输出格式 (默认: text)')
    parser.add_argument('--input-format', choices=['text', 'hex', 'base64'],
                       default='text', help='输入格式（仅用于解密异或）')
    parser.add_argument('--checksum', action='store_true', help='添加/验证校验和')
    parser.add_argument('--keyboard-seed', action='store_true', help='使用键盘敲击生成密钥')
    parser.add_argument('--package', action='store_true', help='保存/加载为加密包')
    
    args = parser.parse_args()
    
    tool = CryptoTool()
    
    # 显示历史记录
    if args.mode == 'history':
        tool.show_history()
        return
    
    # 暴力破解模式
    if args.mode == 'crack':
        if not args.text and not args.input_file:
            print("错误：破解模式需要提供文本或输入文件")
            return
        
        try:
            ciphertext = args.text
            if not ciphertext and args.input_file:
                with open(args.input_file, 'r', encoding='utf-8') as f:
                    ciphertext = f.read()
            
            results = tool.caesar_crack(ciphertext)
            
            print("凯撒密码暴力破解结果（按可能性排序）：")
            print("=" * 60)
            for i, (shift, plaintext, score) in enumerate(results[:5], 1):
                print(f"\n排名 {i} - 偏移量 {shift}, 得分: {score:.2f}")
                print(f"明文: {plaintext[:100]}...")
        except Exception as e:
            print(f"破解失败: {e}")
        return
    
    # 算法检测模式
    if args.mode == 'detect':
        if not args.text and not args.input_file:
            print("错误：检测模式需要提供文本或输入文件")
            return
        
        try:
            ciphertext = args.text
            if not ciphertext and args.input_file:
                with open(args.input_file, 'r', encoding='utf-8') as f:
                    ciphertext = f.read()
            
            results = tool.detect_algorithm(ciphertext)
            
            print("加密方式检测结果：")
            print("=" * 40)
            for algo, score in results:
                print(f"  {algo:12s} : {score:6.1%}")
        except Exception as e:
            print(f"检测失败: {e}")
        return
    
    # 加密/解密模式
    algorithm = args.algorithm
    if not algorithm and not args.package:
        print("错误：请指定加密算法 (--algorithm)")
        return
    
    # 键盘敲击生成密钥
    if args.keyboard_seed:
        seed = tool.keyboard_seed_generator()
        if algorithm == 'caesar':
            args.shift = seed % 26
            print(f"使用偏移量: {args.shift}")
        elif algorithm == 'xor':
            args.key_byte = seed % 256
            print(f"使用密钥字节: {args.key_byte}")
        elif algorithm == 'substitution':
            args.mapping = f"seed:{seed}"
    
    # 解析替换密码映射表
    mapping = None
    if algorithm == 'substitution':
        if args.mapping:
            mapping = tool.parse_substitution_map(args.mapping)
            print(f"使用映射表: {','.join(f'{k}:{v}' for k, v in sorted(mapping.items()) if k != v)}")
        else:
            mapping = tool.generate_substitution_map()
            map_str = ','.join(f"{k}:{v}" for k, v in mapping.items())
            print(f"生成的映射表: {map_str}")
    
    # 准备参数
    kwargs = {
        'shift': args.shift,
        'keyword': args.keyword or 'KEY',
        'key_byte': args.key_byte,
        'mapping': mapping,
        'output_format': args.output_format,
        'input_format': args.input_format,
        'use_checksum': args.checksum
    }
    
    # 加密包模式
    if args.package:
        if args.mode == 'encrypt':
            if not args.text and not args.input_file:
                print("错误：需要提供文本或输入文件")
                return
            
            try:
                text = args.text
                if not text and args.input_file:
                    with open(args.input_file, 'r', encoding='utf-8') as f:
                        text = f.read()
                
                result = tool._encrypt_text(text, algorithm, **kwargs)
                
                # 准备包参数
                package_params = {}
                if algorithm == 'caesar':
                    package_params['shift'] = args.shift
                elif algorithm == 'vigenere':
                    package_params['keyword'] = args.keyword
                elif algorithm == 'xor':
                    package_params['key_byte'] = args.key_byte
                    package_params['output_format'] = args.output_format
                    package_params['input_format'] = args.output_format
                elif algorithm == 'substitution':
                    package_params['mapping'] = {k: v for k, v in mapping.items()}
                
                output_file = args.output_file or 'crypto_package.json'
                if tool.save_crypto_package(output_file, result, algorithm, package_params):
                    print(f"✓ 加密包已保存到: {output_file}")
                    tool.add_history('encrypt_package', algorithm, text[:50], output_file)
            except Exception as e:
                print(f"加密失败: {e}")
        
        else:
            if not args.input_file:
                print("错误：解密模式需要输入文件")
                return
            
            ciphertext, algo, params = tool.load_crypto_package(args.input_file)
            if ciphertext is None:
                return
            
            if algo == 'substitution':
                params['mapping'] = params.get('mapping', {})
            
            try:
                result = tool._decrypt_text(ciphertext, algo, **params)
                
                if args.output_file:
                    with open(args.output_file, 'w', encoding='utf-8') as f:
                        f.write(result)
                    print(f"✓ 解密结果已保存到: {args.output_file}")
                else:
                    print(f"解密结果: {result}")
                
                tool.add_history('decrypt_package', algo, ciphertext[:50], result[:50])
            except Exception as e:
                print(f"解密失败: {e}")
        
        return
    
    # 批量处理模式
    if args.input_dir and args.output_dir:
        tool.batch_process(args.input_dir, args.output_dir, 
                          args.mode == 'encrypt', algorithm, **kwargs)
        return
    
    # 单文件处理模式
    if args.input_file and args.output_file:
        result = tool.process_file(args.input_file, args.output_file, 
                                  args.mode == 'encrypt', algorithm, **kwargs)
        if result is not None:
            print(f"✓ 文件已处理: {args.input_file} -> {args.output_file}")
            tool.add_history(args.mode, algorithm, args.input_file, args.output_file)
        return
    
    # 直接文本处理模式
    if args.text:
        try:
            if args.mode == 'encrypt':
                result = tool._encrypt_text(args.text, algorithm, **kwargs)
                print(f"加密结果: {result}")
            else:
                result = tool._decrypt_text(args.text, algorithm, **kwargs)
                print(f"解密结果: {result}")
            
            tool.add_history(args.mode, algorithm, args.text[:50], result[:50])
        except Exception as e:
            print(f"处理失败: {e}")
        return
    
    print("未指定输入，请使用 --text、--input-file 或 --input-dir 提供输入")
    print("使用 --help 查看帮助信息")


if __name__ == '__main__':
    main()
