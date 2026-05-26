"""
加密模块 - 支持异或加密和AES加密
"""
import os
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes
from typing import Tuple, Optional


class XOREncryptor:
    """异或加密器"""
    
    def __init__(self, password: str):
        """
        初始化异或加密器
        
        Args:
            password: 密码
        """
        self.password_bytes = password.encode('utf-8')
        self.password_len = len(self.password_bytes)
    
    def encrypt(self, data: bytes) -> bytes:
        """
        加密数据
        
        Args:
            data: 原始数据
            
        Returns:
            加密后的数据
        """
        if self.password_len == 0:
            return data
        return bytes([b ^ self.password_bytes[i % self.password_len] for i, b in enumerate(data)])
    
    def decrypt(self, data: bytes) -> bytes:
        """
        解密数据（异或加密是对称的，加密解密相同）
        
        Args:
            data: 加密数据
            
        Returns:
            解密后的数据
        """
        return self.encrypt(data)


class AESEncryptor:
    """AES加密器"""
    
    SALT_SIZE = 16
    NONCE_SIZE = 16
    TAG_SIZE = 16
    KEY_SIZE = 32  # AES-256
    ITERATIONS = 100000
    
    def __init__(self, password: str, salt: Optional[bytes] = None):
        """
        初始化AES加密器
        
        Args:
            password: 密码
            salt: 盐值，如果为None则生成新的
        """
        self.password = password
        self.salt = salt if salt is not None else get_random_bytes(self.SALT_SIZE)
        self._derive_key()
    
    def _derive_key(self) -> None:
        """从密码派生密钥"""
        self.key = PBKDF2(
            self.password,
            self.salt,
            dkLen=self.KEY_SIZE,
            count=self.ITERATIONS
        )
    
    def encrypt(self, data: bytes) -> bytes:
        """
        加密数据
        
        Args:
            data: 原始数据
            
        Returns:
            加密后的数据（包含nonce和tag）
        """
        cipher = AES.new(self.key, AES.MODE_EAX)
        nonce = cipher.nonce
        ciphertext, tag = cipher.encrypt_and_digest(data)
        return self.salt + nonce + tag + ciphertext
    
    def decrypt(self, data: bytes) -> bytes:
        """
        解密数据
        
        Args:
            data: 加密数据（包含salt、nonce、tag）
            
        Returns:
            解密后的数据
        """
        if len(data) < self.SALT_SIZE + self.NONCE_SIZE + self.TAG_SIZE:
            raise ValueError("加密数据格式不正确")
        
        salt = data[:self.SALT_SIZE]
        nonce = data[self.SALT_SIZE:self.SALT_SIZE + self.NONCE_SIZE]
        tag = data[self.SALT_SIZE + self.NONCE_SIZE:self.SALT_SIZE + self.NONCE_SIZE + self.TAG_SIZE]
        ciphertext = data[self.SALT_SIZE + self.NONCE_SIZE + self.TAG_SIZE:]
        
        # 使用数据中的salt重新派生密钥
        temp_encryptor = AESEncryptor(self.password, salt=salt)
        cipher = AES.new(temp_encryptor.key, AES.MODE_EAX, nonce=nonce)
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)
        return plaintext


def get_encryptor(encryption_type: str, password: str) -> Optional[object]:
    """
    获取加密器
    
    Args:
        encryption_type: 加密类型 ('xor', 'aes', 或 None)
        password: 密码
        
    Returns:
        加密器实例或None
    """
    if encryption_type is None or encryption_type.lower() == 'none':
        return None
    elif encryption_type.lower() == 'xor':
        return XOREncryptor(password)
    elif encryption_type.lower() == 'aes':
        return AESEncryptor(password)
    else:
        raise ValueError(f"不支持的加密类型: {encryption_type}")
