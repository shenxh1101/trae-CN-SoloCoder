#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
加密工具综合测试脚本
测试所有加密算法和功能模块
"""

import sys
import os
import json
import tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from crypto_tool import CryptoTool


def test_caesar_cipher():
    """测试凯撒密码加密解密"""
    print("\n" + "="*60)
    print("测试1: 凯撒密码 (Caesar Cipher)")
    print("="*60)
    
    tool = CryptoTool()
    plaintext = "Hello World! This is a test message 123."
    shift = 7
    
    # 加密
    ciphertext = tool.caesar_encrypt(plaintext, shift)
    print(f"  明文: {plaintext}")
    print(f"  偏移量: {shift}")
    print(f"  密文: {ciphertext}")
    
    # 解密
    decrypted = tool.caesar_decrypt(ciphertext, shift)
    print(f"  解密: {decrypted}")
    
    assert decrypted == plaintext, "凯撒密码解密失败"
    print("  ✓ 凯撒密码测试通过!")
    return True


def test_vigenere_cipher():
    """测试维吉尼亚密码加密解密"""
    print("\n" + "="*60)
    print("测试2: 维吉尼亚密码 (Vigenère Cipher)")
    print("="*60)
    
    tool = CryptoTool()
    plaintext = "The quick brown fox jumps over the lazy dog"
    keyword = "SECRETKEY"
    
    # 加密
    ciphertext = tool.vigenere_encrypt(plaintext, keyword)
    print(f"  明文: {plaintext}")
    print(f"  密钥词: {keyword}")
    print(f"  密文: {ciphertext}")
    
    # 解密
    decrypted = tool.vigenere_decrypt(ciphertext, keyword)
    print(f"  解密: {decrypted}")
    
    assert decrypted == plaintext, "维吉尼亚密码解密失败"
    print("  ✓ 维吉尼亚密码测试通过!")
    return True


def test_xor_cipher():
    """测试异或密码加密解密"""
    print("\n" + "="*60)
    print("测试3: 异或密码 (XOR Cipher)")
    print("="*60)
    
    tool = CryptoTool()
    plaintext = "Hello XOR Encryption! 测试中文"
    key_byte = 0x5A
    
    # 加密
    encrypted_bytes = tool.xor_crypt(plaintext, key_byte)
    print(f"  明文: {plaintext}")
    print(f"  密钥字节: 0x{key_byte:02X}")
    print(f"  加密字节: {encrypted_bytes.hex()}")
    
    # 十六进制格式
    hex_str = tool.to_hex(encrypted_bytes)
    print(f"  十六进制: {hex_str}")
    
    # Base64格式
    b64_str = tool.to_base64(encrypted_bytes)
    print(f"  Base64: {b64_str}")
    
    # 解密
    decrypted = tool.xor_decrypt(encrypted_bytes, key_byte)
    print(f"  解密: {decrypted}")
    
    assert decrypted == plaintext, "异或密码解密失败"
    
    # 测试格式转换
    decrypted_from_hex = tool.xor_decrypt(tool.from_hex(hex_str), key_byte)
    assert decrypted_from_hex == plaintext, "十六进制转换失败"
    
    decrypted_from_b64 = tool.xor_decrypt(tool.from_base64(b64_str), key_byte)
    assert decrypted_from_b64 == plaintext, "Base64转换失败"
    
    print("  ✓ 异或密码测试通过!")
    return True


def test_substitution_cipher():
    """测试替换密码加密解密"""
    print("\n" + "="*60)
    print("测试4: 替换密码 (Substitution Cipher)")
    print("="*60)
    
    tool = CryptoTool()
    plaintext = "The Quick Brown Fox Jumps Over The Lazy Dog"
    
    # 测试1: 随机生成映射表
    print("\n  测试4.1: 随机生成映射表")
    mapping1 = tool.generate_substitution_map()
    ciphertext1 = tool.substitution_encrypt(plaintext, mapping1)
    decrypted1 = tool.substitution_decrypt(ciphertext1, mapping1)
    print(f"  明文: {plaintext}")
    map_items = ', '.join([f'{k}→{v}' for k, v in list(mapping1.items())[:8]])
    print(f"  映射表: {map_items}...")
    print(f"  密文: {ciphertext1}")
    print(f"  解密: {decrypted1}")
    assert decrypted1 == plaintext, "随机映射表替换密码失败"
    print("  ✓ 随机映射表测试通过!")
    
    # 测试2: 使用种子生成可复现的映射表
    print("\n  测试4.2: 种子生成映射表")
    seed = 12345
    mapping2 = tool.generate_substitution_map(seed)
    mapping3 = tool.generate_substitution_map(seed)
    assert mapping2 == mapping3, "相同种子应生成相同映射表"
    ciphertext2 = tool.substitution_encrypt(plaintext, mapping2)
    decrypted2 = tool.substitution_decrypt(ciphertext2, mapping2)
    print(f"  种子: {seed}")
    print(f"  密文: {ciphertext2}")
    print(f"  解密: {decrypted2}")
    assert decrypted2 == plaintext, "种子映射表替换密码失败"
    print("  ✓ 种子映射表测试通过!")
    
    # 测试3: 解析用户自定义映射表
    print("\n  测试4.3: 自定义映射表")
    map_str = "A:X,B:Y,C:Z,D:W,E:V"
    mapping4 = tool.parse_substitution_map(map_str)
    test_text = "ABCDE"
    ciphertext4 = tool.substitution_encrypt(test_text, mapping4)
    decrypted4 = tool.substitution_decrypt(ciphertext4, mapping4)
    print(f"  映射字符串: {map_str}")
    print(f"  明文: {test_text}")
    print(f"  密文: {ciphertext4}")
    print(f"  解密: {decrypted4}")
    assert decrypted4 == test_text, "自定义映射表失败"
    assert mapping4['A'] == 'X' and mapping4['B'] == 'Y', "映射表解析错误"
    print("  ✓ 自定义映射表测试通过!")
    
    # 测试4: seed:格式映射表
    print("\n  测试4.4: seed格式映射表")
    seed_map_str = "seed:999"
    mapping5 = tool.parse_substitution_map(seed_map_str)
    ciphertext5 = tool.substitution_encrypt(plaintext, mapping5)
    decrypted5 = tool.substitution_decrypt(ciphertext5, mapping5)
    print(f"  映射字符串: {seed_map_str}")
    print(f"  密文: {ciphertext5}")
    print(f"  解密: {decrypted5}")
    assert decrypted5 == plaintext, "seed格式映射表失败"
    print("  ✓ seed格式映射表测试通过!")
    
    print("\n  ✓ 替换密码所有测试通过!")
    return True


def test_caesar_crack():
    """测试凯撒密码暴力破解"""
    print("\n" + "="*60)
    print("测试5: 凯撒密码暴力破解")
    print("="*60)
    
    tool = CryptoTool()
    
    # 英文文本更容易被频率分析识别
    plaintext = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG THIS IS A TEST MESSAGE WITH MANY LETTERS TO ANALYZE"
    actual_shift = 9
    ciphertext = tool.caesar_encrypt(plaintext, actual_shift)
    
    print(f"  原始明文: {plaintext[:60]}...")
    print(f"  实际偏移量: {actual_shift}")
    print(f"  密文: {ciphertext[:60]}...")
    
    results = tool.caesar_crack(ciphertext)
    
    print(f"\n  破解结果前3名:")
    for i, (shift, text, score) in enumerate(results[:3], 1):
        print(f"    排名{i}: 偏移量={shift}, 得分={score:.2f}, 明文={text[:40]}...")
    
    # 检查正确偏移量是否在前5名
    top_shifts = [r[0] for r in results[:5]]
    assert actual_shift in top_shifts, f"偏移量 {actual_shift} 应该在前5名中，实际排名: {[r[0] for r in results].index(actual_shift) + 1}"
    print(f"\n  ✓ 凯撒密码破解测试通过! (正确偏移量 {actual_shift} 在排名 {top_shifts.index(actual_shift) + 1})")
    return True


def test_algorithm_detection():
    """测试算法自动检测"""
    print("\n" + "="*60)
    print("测试6: 算法自动检测")
    print("="*60)
    
    tool = CryptoTool()
    
    # 测试凯撒密码
    caesar_text = tool.caesar_encrypt("This is a normal english text for testing", 5)
    caesar_result = tool.detect_algorithm(caesar_text)
    print(f"  凯撒密文: {caesar_text}")
    print(f"  检测结果: {caesar_result[:3]}")
    
    # 测试异或密码（十六进制格式）
    xor_bytes = tool.xor_crypt("Some secret message", 0x42)
    xor_hex = tool.to_hex(xor_bytes)
    xor_result = tool.detect_algorithm(xor_hex)
    print(f"\n  异或(hex): {xor_hex}")
    print(f"  检测结果: {xor_result[:3]}")
    
    # 测试异或密码（Base64格式）
    xor_b64 = tool.to_base64(xor_bytes)
    xor_b64_result = tool.detect_algorithm(xor_b64)
    print(f"\n  异或(base64): {xor_b64}")
    print(f"  检测结果: {xor_b64_result[:3]}")
    
    # 验证检测结果
    assert 'caesar' in [r[0] for r in caesar_result[:2]], "凯撒密码检测失败"
    assert 'xor' in [r[0] for r in xor_result[:1]], "异或(hex)检测失败"
    
    print("  ✓ 算法自动检测测试通过!")
    return True


def test_checksum():
    """测试校验和功能"""
    print("\n" + "="*60)
    print("测试7: 校验和功能")
    print("="*60)
    
    tool = CryptoTool()
    data = "Hello Checksum Test"
    
    # 添加校验和
    data_with_checksum = tool.add_checksum(data)
    print(f"  原始数据: {data}")
    print(f"  带校验和: {data_with_checksum}")
    
    # 验证正确数据
    valid, extracted = tool.verify_checksum(data_with_checksum)
    print(f"  验证正确数据: 有效={valid}, 提取={extracted}")
    assert valid and extracted == data, "正确数据验证失败"
    
    # 验证被篡改的数据
    tampered = data_with_checksum[:10] + 'X' + data_with_checksum[11:]
    valid2, extracted2 = tool.verify_checksum(tampered)
    print(f"  验证篡改数据: 有效={valid2}")
    assert not valid2, "篡改数据应验证失败"
    
    print("  ✓ 校验和测试通过!")
    return True


def test_keyboard_seed_generator():
    """测试键盘密钥生成功能（测试模式）"""
    print("\n" + "="*60)
    print("测试8: 键盘密钥生成功能（测试模式）")
    print("="*60)
    
    tool = CryptoTool()
    
    # 测试模式1: 足够的敲击次数
    test_timings1 = [0.1, 0.2, 0.15, 0.3, 0.25, 0.12, 0.18, 0.22]
    seed1 = tool.keyboard_seed_generator(test_mode=True, test_timings=test_timings1)
    print(f"  测试数据1 - 敲击次数: {len(test_timings1)}, 生成种子: {seed1}")
    assert seed1 != 42, "应有足够数据生成种子"
    
    # 测试模式2: 相同输入应生成相同种子
    seed2 = tool.keyboard_seed_generator(test_mode=True, test_timings=test_timings1)
    print(f"  测试数据2 - 相同输入, 生成种子: {seed2}")
    assert seed1 == seed2, "相同输入应生成相同种子"
    
    # 测试模式3: 敲击次数太少（使用默认种子）
    test_timings3 = [0.1, 0.2]
    seed3 = tool.keyboard_seed_generator(test_mode=True, test_timings=test_timings3)
    print(f"  测试数据3 - 敲击次数太少, 生成种子: {seed3} (默认种子=42)")
    assert seed3 == 42, "敲击次数太少应使用默认种子"
    
    # 测试模式4: 不同输入应生成不同种子
    test_timings4 = [0.5, 0.1, 0.5, 0.1, 0.5, 0.1, 0.5, 0.1]
    seed4 = tool.keyboard_seed_generator(test_mode=True, test_timings=test_timings4)
    print(f"  测试数据4 - 不同输入, 生成种子: {seed4}")
    assert seed1 != seed4, "不同输入应生成不同种子"
    
    print("  ✓ 键盘密钥生成测试通过!")
    return True


def test_crypto_package():
    """测试加密包功能"""
    print("\n" + "="*60)
    print("测试9: 加密包功能")
    print("="*60)
    
    tool = CryptoTool()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_file = f.name
    
    try:
        # 保存加密包
        plaintext = "Secret Message in Package"
        algorithm = "vigenere"
        params = {"keyword": "PACKAGEKEY"}
        
        ciphertext = tool.vigenere_encrypt(plaintext, params["keyword"])
        saved = tool.save_crypto_package(temp_file, ciphertext, algorithm, params)
        print(f"  保存加密包: {saved}")
        print(f"  明文: {plaintext}")
        print(f"  算法: {algorithm}")
        print(f"  参数: {params}")
        
        assert saved, "保存加密包失败"
        
        # 加载加密包
        loaded_ciphertext, loaded_algo, loaded_params = tool.load_crypto_package(temp_file)
        print(f"\n  加载加密包:")
        print(f"  密文: {loaded_ciphertext}")
        print(f"  算法: {loaded_algo}")
        print(f"  参数: {loaded_params}")
        
        assert loaded_ciphertext == ciphertext, "密文加载错误"
        assert loaded_algo == algorithm, "算法加载错误"
        
        # 使用加载的参数解密
        decrypted = tool.vigenere_decrypt(loaded_ciphertext, loaded_params["keyword"])
        print(f"\n  使用包参数解密: {decrypted}")
        assert decrypted == plaintext, "解密失败"
        
        print("  ✓ 加密包测试通过!")
        return True
    finally:
        if os.path.exists(temp_file):
            os.unlink(temp_file)


def test_file_operations():
    """测试文件操作功能"""
    print("\n" + "="*60)
    print("测试10: 文件操作功能")
    print("="*60)
    
    tool = CryptoTool()
    
    # 创建临时文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        input_file = f.name
        f.write("This is the content of the test file")
    
    output_file = input_file + ".enc"
    decrypted_file = input_file + ".dec"
    
    try:
        # 加密文件
        result = tool.process_file(input_file, output_file, True, 'caesar', shift=5)
        print(f"  输入文件: {os.path.basename(input_file)}")
        print(f"  输出文件: {os.path.basename(output_file)}")
        print(f"  加密结果: {result[:50]}...")
        assert result is not None, "加密失败"
        
        # 解密文件
        result2 = tool.process_file(output_file, decrypted_file, False, 'caesar', shift=5)
        print(f"  解密文件: {os.path.basename(decrypted_file)}")
        print(f"  解密结果: {result2[:50]}...")
        assert result2 is not None, "解密失败"
        
        # 验证内容一致
        with open(input_file, 'r') as f:
            original = f.read()
        with open(decrypted_file, 'r') as f:
            decrypted = f.read()
        
        assert original == decrypted, "文件内容不一致"
        print("  ✓ 文件操作测试通过!")
        return True
    finally:
        for f in [input_file, output_file, decrypted_file]:
            if os.path.exists(f):
                os.unlink(f)


def test_batch_process():
    """测试批量处理功能"""
    print("\n" + "="*60)
    print("测试11: 批量处理功能")
    print("="*60)
    
    tool = CryptoTool()
    
    input_dir = tempfile.mkdtemp()
    output_dir = tempfile.mkdtemp()
    
    try:
        # 创建测试文件
        for i in range(3):
            with open(os.path.join(input_dir, f"file{i+1}.txt"), 'w') as f:
                f.write(f"This is content of file {i+1}")
        
        # 创建非txt文件（应该被忽略）
        with open(os.path.join(input_dir, "ignore.me"), 'w') as f:
            f.write("This should be ignored")
        
        print(f"  输入目录: {os.path.basename(input_dir)}")
        print(f"  输出目录: {os.path.basename(output_dir)}")
        
        # 批量加密
        count = tool.batch_process(input_dir, output_dir, True, 'caesar', shift=10)
        print(f"  加密文件数: {count}")
        assert count == 3, "应该只处理3个txt文件"
        
        # 检查输出文件
        output_files = os.listdir(output_dir)
        txt_files = [f for f in output_files if f.endswith('.txt')]
        assert len(txt_files) == 3, "输出应该有3个txt文件"
        
        print("  ✓ 批量处理测试通过!")
        return True
    finally:
        import shutil
        shutil.rmtree(input_dir, ignore_errors=True)
        shutil.rmtree(output_dir, ignore_errors=True)


def test_history():
    """测试历史记录功能"""
    print("\n" + "="*60)
    print("测试12: 历史记录功能")
    print("="*60)
    
    tool = CryptoTool()
    
    # 添加记录
    tool.add_history('encrypt', 'caesar', 'Hello', 'Khoor')
    tool.add_history('decrypt', 'xor', 'abc123', 'Hello World')
    
    print(f"  历史记录数: {len(tool.history)}")
    print(f"  最新记录: {tool.history[-1]}")
    
    assert len(tool.history) >= 2, "历史记录应至少有2条"
    assert tool.history[-1]['algorithm'] == 'xor', "最新记录算法错误"
    
    print("  ✓ 历史记录测试通过!")
    return True


def test_error_handling():
    """测试错误处理和边界条件"""
    print("\n" + "="*60)
    print("测试13: 错误处理和边界条件")
    print("="*60)
    
    tool = CryptoTool()
    
    # 测试1: 空文本
    print("  测试13.1: 空文本处理")
    caesar_empty = tool.caesar_encrypt("", 5)
    xor_empty = tool.xor_crypt("", 0x42)
    assert caesar_empty == "", "空文本加密应该为空"
    assert len(xor_empty) == 0, "空异或加密应该为空"
    print("    ✓ 空文本处理通过")
    
    # 测试2: 特殊字符
    print("  测试13.2: 特殊字符处理")
    special_text = "!@#$%^&*()_+-=[]{}|;':\",./<>?\n\t"
    caesar_special = tool.caesar_encrypt(special_text, 5)
    assert caesar_special == special_text, "非字母字符应该保持不变"
    print("    ✓ 特殊字符处理通过")
    
    # 测试3: 边界偏移量
    print("  测试13.3: 边界偏移量")
    text = "ABCXYZ"
    encrypted0 = tool.caesar_encrypt(text, 0)
    encrypted26 = tool.caesar_encrypt(text, 26)
    encrypted_neg3 = tool.caesar_encrypt(text, -3)
    assert encrypted0 == text, "偏移量0应该不变"
    assert encrypted26 == text, "偏移量26应该不变"
    print(f"    偏移-3: {text} -> {encrypted_neg3}")
    print("    ✓ 边界偏移量通过")
    
    # 测试4: 无效的十六进制
    print("  测试13.4: 无效格式处理")
    result = tool.from_hex("not hex!")
    assert result == b'', "无效十六进制应该返回空"
    
    result2 = tool.from_base64("not base64!!!")
    assert result2 == b'', "无效Base64应该返回空"
    print("    ✓ 无效格式处理通过")
    
    # 测试5: 无效的映射表种子
    print("  测试13.5: 无效映射表种子")
    mapping = tool.parse_substitution_map("seed:invalid")
    assert len(mapping) == 26, "应该生成默认映射表"
    print("    ✓ 无效映射表种子处理通过")
    
    # 测试6: 不存在的文件
    print("  测试13.6: 不存在文件处理")
    result3 = tool.process_file("/nonexistent/file.txt", "/tmp/out.txt", True, 'caesar')
    assert result3 is None, "不存在的文件应该返回None"
    print("    ✓ 不存在文件处理通过")
    
    # 测试7: 校验和 - 无校验和格式
    print("  测试13.7: 无校验和格式处理")
    valid, data = tool.verify_checksum("no checksum here")
    assert not valid, "无校验和格式应该返回无效"
    print("    ✓ 无校验和格式处理通过")
    
    # 测试8: 空密文检测
    print("  测试13.8: 空密文检测")
    result4 = tool.detect_algorithm("")
    assert result4[0][0] == 'unknown', "空密文应检测为unknown"
    print("    ✓ 空密文检测通过")
    
    # 测试9: 维吉尼亚空密钥
    print("  测试13.9: 维吉尼亚空密钥")
    result5 = tool.vigenere_encrypt("Hello", "")
    assert result5 is not None, "空密钥不应崩溃"
    print("    ✓ 维吉尼亚空密钥处理通过")
    
    # 测试10: 异或密码边界密钥
    print("  测试13.10: 异或边界密钥")
    key_max = tool.xor_crypt("test", 255)
    key_min = tool.xor_crypt("test", 0)
    key_over = tool.xor_crypt("test", 300)  # 应该被限制到255
    key_under = tool.xor_crypt("test", -50)  # 应该被限制到0
    assert key_max == key_over, "超过255的密钥应被限制"
    print("    ✓ 异或边界密钥处理通过")
    
    print("\n  ✓ 错误处理和边界条件测试全部通过!")
    return True


def main():
    """运行所有测试"""
    print("╔" + "="*70 + "╗")
    print("║" + " "*15 + "加密工具综合测试套件" + " "*27 + "║")
    print("╚" + "="*70 + "╝")
    
    tests = [
        test_caesar_cipher,
        test_vigenere_cipher,
        test_xor_cipher,
        test_substitution_cipher,
        test_caesar_crack,
        test_algorithm_detection,
        test_checksum,
        test_keyboard_seed_generator,
        test_crypto_package,
        test_file_operations,
        test_batch_process,
        test_history,
        test_error_handling,
    ]
    
    passed = 0
    failed = 0
    failed_tests = []
    
    for test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                failed_tests.append(test_func.__name__)
        except Exception as e:
            failed += 1
            failed_tests.append(test_func.__name__)
            print(f"  ✗ 测试异常: {e}")
    
    print("\n" + "="*70)
    print("测试总结")
    print("="*70)
    print(f"  总测试数: {len(tests)}")
    print(f"  通过: {passed}")
    print(f"  失败: {failed}")
    
    if failed > 0:
        print(f"  失败的测试: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n  🎉 所有测试通过!")
        return 0


if __name__ == '__main__':
    sys.exit(main())
