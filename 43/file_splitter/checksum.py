"""
MD5校验模块
"""
import hashlib
import os
from typing import Optional


def calculate_md5(file_path: str, chunk_size: int = 8192) -> str:
    """
    计算文件的MD5值
    
    Args:
        file_path: 文件路径
        chunk_size: 读取块大小
        
    Returns:
        MD5哈希字符串
    """
    md5_hash = hashlib.md5()
    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            md5_hash.update(chunk)
    return md5_hash.hexdigest()


def calculate_bytes_md5(data: bytes) -> str:
    """
    计算字节数据的MD5值
    
    Args:
        data: 字节数据
        
    Returns:
        MD5哈希字符串
    """
    return hashlib.md5(data).hexdigest()


def verify_md5(file_path: str, expected_md5: str) -> bool:
    """
    验证文件的MD5值
    
    Args:
        file_path: 文件路径
        expected_md5: 预期的MD5值
        
    Returns:
        是否匹配
    """
    if not os.path.exists(file_path):
        return False
    actual_md5 = calculate_md5(file_path)
    return actual_md5.lower() == expected_md5.lower()
