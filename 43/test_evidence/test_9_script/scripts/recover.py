#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文件分片恢复脚本 - 由 FileSplitter 自动生成
原始文件: original.bin
分片数量: 2
加密类型: none
"""

import os
import sys
import hashlib
import json
from getpass import getpass

CHUNK_INFO = [
  {
    "filename": "original.part1",
    "size": 1048576,
    "md5": "ec1bed591db9a1a41d945650f6567433",
    "index": 1
  },
  {
    "filename": "original.part2",
    "size": 1048576,
    "md5": "3863b5eaa5f78f09494d1a73f4b7e606",
    "index": 2
  }
]

ORIGINAL_FILE = "original.bin"
ORIGINAL_MD5 = "50b610e3fd43b5e1e23972b951e37b1e"
ENCRYPTION_TYPE = "none"
CHUNK_EXTENSION = "part"
PASSWORD = None
REQUIRE_PASSWORD = False


def calculate_md5(filepath):
    """计算文件MD5"""
    md5 = hashlib.md5()
    with open(filepath, 'rb') as f:
        while True:
            data = f.read(8192)
            if not data:
                break
            md5.update(data)
    return md5.hexdigest()


def xor_decrypt(data, password):
    """异或解密"""
    pwd_bytes = password.encode('utf-8')
    pwd_len = len(pwd_bytes)
    return bytes([b ^ pwd_bytes[i % pwd_len] for i, b in enumerate(data)])


def aes_decrypt(data, password):
    """AES解密"""
    try:
        from Crypto.Cipher import AES
        from Crypto.Protocol.KDF import PBKDF2
    except ImportError:
        print("错误: 需要安装 pycryptodome 库")
        print("请执行: pip install pycryptodome")
        sys.exit(1)
    
    SALT_SIZE = 16
    NONCE_SIZE = 16
    TAG_SIZE = 16
    KEY_SIZE = 32
    ITERATIONS = 100000
    
    if len(data) < SALT_SIZE + NONCE_SIZE + TAG_SIZE:
        raise ValueError("加密数据格式不正确")
    
    salt = data[:SALT_SIZE]
    nonce = data[SALT_SIZE:SALT_SIZE + NONCE_SIZE]
    tag = data[SALT_SIZE + NONCE_SIZE:SALT_SIZE + NONCE_SIZE + TAG_SIZE]
    ciphertext = data[SALT_SIZE + NONCE_SIZE + TAG_SIZE:]
    
    key = PBKDF2(password, salt, dkLen=KEY_SIZE, count=ITERATIONS)
    cipher = AES.new(key, AES.MODE_EAX, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag)


def decrypt_data(data, encryption_type, password):
    """解密数据"""
    if encryption_type == 'none' or not encryption_type:
        return data
    elif encryption_type == 'xor':
        return xor_decrypt(data, password)
    elif encryption_type == 'aes':
        return aes_decrypt(data, password)
    else:
        raise ValueError(f"不支持的加密类型: {encryption_type}")


def main():
    print("=" * 40)
    print("  文件分片恢复工具")
    print("=" * 40)
    print()
    print(f"原始文件: {ORIGINAL_FILE}")
    print(f"分片数量: {len(CHUNK_INFO)}")
    print(f"加密类型: {ENCRYPTION_TYPE}")
    print()
    
    password = PASSWORD
    if ENCRYPTION_TYPE != 'none' and ENCRYPTION_TYPE:
        if REQUIRE_PASSWORD or password is None:
            password = getpass("请输入解密密码: ")
        if not password:
            print("错误: 密码不能为空")
            sys.exit(1)
    
    print("正在检查分片文件...")
    missing = []
    for chunk in CHUNK_INFO:
        if not os.path.exists(chunk['filename']):
            missing.append(chunk['filename'])
    
    if missing:
        print()
        print("错误: 以下分片文件缺失:")
        for f in missing:
            print(f"  - {f}")
        sys.exit(1)
    
    print("所有分片文件检查通过")
    print()
    
    print("正在验证分片完整性...")
    for chunk in CHUNK_INFO:
        expected_md5 = chunk.get('md5', '')
        if expected_md5:
            actual_md5 = calculate_md5(chunk['filename'])
            if actual_md5.lower() != expected_md5.lower():
                print(f"错误: 分片 {chunk['filename']} MD5不匹配")
                sys.exit(1)
    
    print("分片完整性验证通过")
    print()
    
    print("正在合并文件...")
    total_size = sum(c['size'] for c in CHUNK_INFO)
    bytes_written = 0
    
    with open(ORIGINAL_FILE, 'wb') as out_file:
        for chunk in CHUNK_INFO:
            with open(chunk['filename'], 'rb') as in_file:
                data = in_file.read()
            
            if ENCRYPTION_TYPE != 'none' and ENCRYPTION_TYPE:
                try:
                    data = decrypt_data(data, ENCRYPTION_TYPE, password)
                except Exception as e:
                    print(f"错误: 解密失败，请检查密码是否正确")
                    print(f"详细信息: {str(e)}")
                    sys.exit(1)
            
            out_file.write(data)
            bytes_written += len(data)
            progress = (bytes_written / total_size) * 100
            print(f"进度: {progress:.1f}%", end='\r')
    
    print()
    print()
    
    if ORIGINAL_MD5:
        print("正在验证合并后文件完整性...")
        actual_md5 = calculate_md5(ORIGINAL_FILE)
        if actual_md5.lower() == ORIGINAL_MD5.lower():
            print("文件完整性验证通过")
        else:
            print("警告: 文件完整性验证失败，MD5不匹配")
            print(f"预期: {ORIGINAL_MD5}")
            print(f"实际: {actual_md5}")
    
    print()
    print(f"合并成功！文件已保存为: {ORIGINAL_FILE}")
    print()
    
    try:
        answer = input("是否删除分片文件? (y/N): ").strip().lower()
        if answer in ['y', 'yes']:
            for chunk in CHUNK_INFO:
                os.remove(chunk['filename'])
            print("分片文件已删除")
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
