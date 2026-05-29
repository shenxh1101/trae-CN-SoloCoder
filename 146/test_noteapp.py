#!/usr/bin/env python3
import os
import sys
import json
import base64

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from noteapp import AESCipher, NoteManager

def test_aes_cipher():
    print("测试AES加密解密...")
    password = "test123"
    plaintext = "这是一条测试笔记内容"
    
    cipher = AESCipher(password)
    encrypted = cipher.encrypt(plaintext)
    
    assert 'salt' in encrypted
    assert 'iv' in encrypted
    assert 'ciphertext' in encrypted
    
    decrypted = AESCipher.decrypt(encrypted, password)
    assert decrypted == plaintext, f"解密失败: {decrypted} != {plaintext}"
    
    try:
        AESCipher.decrypt(encrypted, "wrongpassword")
        assert False, "应该抛出异常"
    except Exception:
        pass
    
    print("✓ AES加密解密测试通过")

def test_note_manager():
    print("\n测试笔记管理器...")
    
    test_file = "test_notes.json"
    if os.path.exists(test_file):
        os.remove(test_file)
    
    manager = NoteManager(data_file=test_file)
    manager.password = "test123"
    
    manager.create_note("测试笔记1", "这是第一条测试笔记的内容")
    manager.create_note("测试笔记2", "这是第二条测试笔记，包含Python关键字")
    
    assert os.path.exists(test_file), "笔记文件未创建"
    
    with open(test_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    assert 'encrypted' in data
    
    manager.notes = {}
    manager._load_notes()
    assert "测试笔记1" in manager.notes
    assert "测试笔记2" in manager.notes
    print("✓ 笔记保存和加载测试通过")
    
    matches = []
    for title, note in manager.notes.items():
        if "Python" in note['content']:
            matches.append(title)
    assert "测试笔记2" in matches
    print("✓ 搜索功能测试通过")
    
    if os.path.exists(test_file):
        os.remove(test_file)

def main():
    print("=" * 50)
    print("加密笔记工具 - 功能测试")
    print("=" * 50)
    
    try:
        test_aes_cipher()
        test_note_manager()
        print("\n" + "=" * 50)
        print("所有测试通过！✓")
        print("=" * 50)
    except AssertionError as e:
        print(f"\n测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
