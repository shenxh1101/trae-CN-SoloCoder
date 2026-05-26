"""
恢复脚本生成器 - 生成独立的批处理/Shell脚本用于合并还原
"""
import os
import json
from typing import List, Dict, Any


class RecoveryScriptGenerator:
    """恢复脚本生成器"""
    
    def __init__(self, index_manager):
        """
        初始化恢复脚本生成器
        
        Args:
            index_manager: 索引管理器实例
        """
        self.index_manager = index_manager
    
    def generate_windows_batch(self, output_path: str,
                                password: str = None,
                                require_password: bool = False) -> str:
        """
        生成Windows批处理脚本(.bat)
        
        Args:
            output_path: 脚本输出路径
            password: 密码（如果有加密）
            require_password: 是否要求用户输入密码
            
        Returns:
            脚本文件路径
        """
        chunks = sorted(self.index_manager.index_data['chunks'], key=lambda x: x['index'])
        original_file = self.index_manager.index_data['original_file']
        encryption_type = self.index_manager.index_data.get('encryption_type', 'none')
        
        chunk_names = [c['filename'] for c in chunks]
        
        script_lines = [
            '@echo off',
            'chcp 65001 >nul',
            'echo ========================================',
            'echo   文件分片恢复工具',
            'echo ========================================',
            'echo.',
            f'echo 原始文件: {original_file}',
            f'echo 分片数量: {len(chunks)}',
            f'echo 加密类型: {encryption_type}',
            'echo.',
        ]
        
        if encryption_type != 'none' and encryption_type:
            if require_password:
                script_lines.append('set /p PASSWORD=请输入解密密码: ')
                script_lines.append('echo.')
            elif password:
                script_lines.append(f'set PASSWORD={password}')
            else:
                script_lines.append('echo 警告: 分片已加密但未提供密码，脚本无法自动解密')
                script_lines.append('pause')
                script_lines.append('exit /b 1')
        
        script_lines.extend([
            'echo 正在检查分片文件...',
            'set MISSING=0',
        ])
        
        for chunk_name in chunk_names:
            script_lines.append(f'if not exist "{chunk_name}" (')
            script_lines.append(f'  echo 缺失文件: {chunk_name}')
            script_lines.append('  set MISSING=1')
            script_lines.append(')')
        
        script_lines.extend([
            'if %MISSING%==1 (',
            '  echo. 错误: 部分分片文件缺失，无法继续',
            '  pause',
            '  exit /b 1',
            ')',
            'echo 所有分片文件检查通过',
            'echo.',
            'echo 正在合并文件...',
        ])
        
        if encryption_type == 'none' or not encryption_type:
            script_lines.append(f'copy /b {" + ".join(chunk_names)} "{original_file}" >nul')
        else:
            script_lines.extend([
                'echo. 警告: 分片已加密，需要Python解密脚本',
                'echo 请使用完整的file_splitter工具进行解密合并',
                'pause',
                'exit /b 1',
            ])
        
        script_lines.extend([
            'if exist "%original_file%" (',
            '  echo.',
            '  echo 合并成功！文件已保存为: %original_file%',
            '  echo.',
            '  choice /c YN /m "是否删除分片文件"',
            '  if errorlevel 2 goto :end',
            '  if errorlevel 1 (',
        ])
        
        for chunk_name in chunk_names:
            script_lines.append(f'    del /f /q "{chunk_name}"')
        
        script_lines.extend([
            '    echo 分片文件已删除',
            '  )',
            ') else (',
            '  echo 合并失败！',
            ')',
            ':end',
            'echo.',
            'pause',
        ])
        
        script_content = '\n'.join(script_lines) + '\n'
        
        with open(output_path, 'w', encoding='gbk') as f:
            f.write(script_content)
        
        return output_path
    
    def generate_unix_shell(self, output_path: str,
                             password: str = None,
                             require_password: bool = False) -> str:
        """
        生成Unix/Linux/Mac Shell脚本(.sh)
        
        Args:
            output_path: 脚本输出路径
            password: 密码（如果有加密）
            require_password: 是否要求用户输入密码
            
        Returns:
            脚本文件路径
        """
        chunks = sorted(self.index_manager.index_data['chunks'], key=lambda x: x['index'])
        original_file = self.index_manager.index_data['original_file']
        encryption_type = self.index_manager.index_data.get('encryption_type', 'none')
        
        chunk_names = [c['filename'] for c in chunks]
        
        script_lines = [
            '#!/bin/bash',
            '',
            'echo "========================================"',
            'echo "  文件分片恢复工具"',
            'echo "========================================"',
            'echo ""',
            f'echo "原始文件: {original_file}"',
            f'echo "分片数量: {len(chunks)}"',
            f'echo "加密类型: {encryption_type}"',
            'echo ""',
        ]
        
        if encryption_type != 'none' and encryption_type:
            if require_password:
                script_lines.append('read -sp "请输入解密密码: " PASSWORD')
                script_lines.append('echo ""')
            elif password:
                script_lines.append(f'PASSWORD="{password}"')
            else:
                script_lines.append('echo "警告: 分片已加密但未提供密码，脚本无法自动解密"')
                script_lines.append('exit 1')
        
        script_lines.extend([
            'echo "正在检查分片文件..."',
            'MISSING=0',
        ])
        
        for chunk_name in chunk_names:
            script_lines.append(f'if [ ! -f "{chunk_name}" ]; then')
            script_lines.append(f'  echo "缺失文件: {chunk_name}"')
            script_lines.append('  MISSING=1')
            script_lines.append('fi')
        
        script_lines.extend([
            'if [ $MISSING -eq 1 ]; then',
            '  echo ""',
            '  echo "错误: 部分分片文件缺失，无法继续"',
            '  exit 1',
            'fi',
            'echo "所有分片文件检查通过"',
            'echo ""',
            'echo "正在合并文件..."',
        ])
        
        if encryption_type == 'none' or not encryption_type:
            script_lines.append(f'cat {" ".join(chunk_names)} > "{original_file}"')
        else:
            script_lines.extend([
                'echo ""',
                'echo "警告: 分片已加密，需要Python解密脚本"',
                'echo "请使用完整的file_splitter工具进行解密合并"',
                'exit 1',
            ])
        
        script_lines.extend([
            'if [ -f "' + original_file + '" ]; then',
            '  echo ""',
            '  echo "合并成功！文件已保存为: ' + original_file + '"',
            '  echo ""',
            '  read -p "是否删除分片文件? (y/N): " -n 1 -r',
            '  echo ""',
            '  if [[ $REPLY =~ ^[Yy]$ ]]; then',
        ])
        
        for chunk_name in chunk_names:
            script_lines.append(f'    rm -f "{chunk_name}"')
        
        script_lines.extend([
            '    echo "分片文件已删除"',
            '  fi',
            'else',
            '  echo "合并失败！"',
            '  exit 1',
            'fi',
        ])
        
        script_content = '\n'.join(script_lines) + '\n'
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        os.chmod(output_path, 0o755)
        
        return output_path
    
    def generate_python_script(self, output_path: str,
                                password: str = None,
                                require_password: bool = False) -> str:
        """
        生成独立Python恢复脚本
        
        Args:
            output_path: 脚本输出路径
            password: 密码（如果有加密）
            require_password: 是否要求用户输入密码
            
        Returns:
            脚本文件路径
        """
        chunks = sorted(self.index_manager.index_data['chunks'], key=lambda x: x['index'])
        original_file = self.index_manager.index_data['original_file']
        original_md5 = self.index_manager.index_data.get('original_md5', '')
        encryption_type = self.index_manager.index_data.get('encryption_type', 'none')
        chunk_extension = self.index_manager.index_data.get('chunk_extension', 'part')
        
        chunk_info_list = []
        for c in chunks:
            chunk_info_list.append({
                'filename': c['filename'],
                'size': c['size'],
                'md5': c.get('md5', ''),
                'index': c['index']
            })
        
        script_content = f'''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文件分片恢复脚本 - 由 FileSplitter 自动生成
原始文件: {original_file}
分片数量: {len(chunks)}
加密类型: {encryption_type}
"""

import os
import sys
import hashlib
import json
from getpass import getpass

CHUNK_INFO = {json.dumps(chunk_info_list, indent=2, ensure_ascii=False)}

ORIGINAL_FILE = "{original_file}"
ORIGINAL_MD5 = "{original_md5}"
ENCRYPTION_TYPE = "{encryption_type}"
CHUNK_EXTENSION = "{chunk_extension}"
PASSWORD = {repr(password) if password else "None"}
REQUIRE_PASSWORD = {require_password}


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
        raise ValueError(f"不支持的加密类型: {{encryption_type}}")


def main():
    print("=" * 40)
    print("  文件分片恢复工具")
    print("=" * 40)
    print()
    print(f"原始文件: {{ORIGINAL_FILE}}")
    print(f"分片数量: {{len(CHUNK_INFO)}}")
    print(f"加密类型: {{ENCRYPTION_TYPE}}")
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
            print(f"  - {{f}}")
        sys.exit(1)
    
    print("所有分片文件检查通过")
    print()
    
    print("正在验证分片完整性...")
    for chunk in CHUNK_INFO:
        expected_md5 = chunk.get('md5', '')
        if expected_md5:
            actual_md5 = calculate_md5(chunk['filename'])
            if actual_md5.lower() != expected_md5.lower():
                print(f"错误: 分片 {{chunk['filename']}} MD5不匹配")
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
                    print(f"详细信息: {{str(e)}}")
                    sys.exit(1)
            
            out_file.write(data)
            bytes_written += len(data)
            progress = (bytes_written / total_size) * 100
            print(f"进度: {{progress:.1f}}%", end='\\r')
    
    print()
    print()
    
    if ORIGINAL_MD5:
        print("正在验证合并后文件完整性...")
        actual_md5 = calculate_md5(ORIGINAL_FILE)
        if actual_md5.lower() == ORIGINAL_MD5.lower():
            print("文件完整性验证通过")
        else:
            print("警告: 文件完整性验证失败，MD5不匹配")
            print(f"预期: {{ORIGINAL_MD5}}")
            print(f"实际: {{actual_md5}}")
    
    print()
    print(f"合并成功！文件已保存为: {{ORIGINAL_FILE}}")
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
'''
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        os.chmod(output_path, 0o755)
        
        return output_path
    
    def generate_all(self, output_dir: str, base_name: str = 'recover',
                      password: str = None, require_password: bool = False) -> Dict[str, str]:
        """
        生成所有类型的恢复脚本
        
        Args:
            output_dir: 输出目录
            base_name: 脚本基础文件名
            password: 密码
            require_password: 是否要求用户输入密码
            
        Returns:
            各类型脚本文件路径字典
        """
        os.makedirs(output_dir, exist_ok=True)
        
        scripts = {}
        
        scripts['windows'] = self.generate_windows_batch(
            os.path.join(output_dir, f'{base_name}.bat'),
            password=password,
            require_password=require_password
        )
        
        scripts['unix'] = self.generate_unix_shell(
            os.path.join(output_dir, f'{base_name}.sh'),
            password=password,
            require_password=require_password
        )
        
        scripts['python'] = self.generate_python_script(
            os.path.join(output_dir, f'{base_name}.py'),
            password=password,
            require_password=require_password
        )
        
        return scripts
