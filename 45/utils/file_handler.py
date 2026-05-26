import os

from ciphers.caesar import caesar_encrypt, caesar_decrypt
from ciphers.vigenere import vigenere_encrypt, vigenere_decrypt
from ciphers.xor_cipher import xor_encrypt, xor_decrypt, xor_bytes


def save_to_file(content: str, filename: str) -> None:
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)


def read_from_file(filename: str) -> str:
    if not os.path.exists(filename):
        raise FileNotFoundError(f"文件不存在: {filename}")
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()


def batch_encrypt(input_file: str, output_file: str, algorithm: str, 
                  shift: int = None, key: str = None) -> None:
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"输入文件不存在: {input_file}")
    
    results = []
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if not line:
                results.append('')
                continue
            
            if algorithm == 'caesar':
                if shift is None:
                    raise ValueError("凯撒密码需要偏移量")
                encrypted = caesar_encrypt(line, shift)
            elif algorithm == 'vigenere':
                if not key:
                    raise ValueError("维吉尼亚密码需要密钥")
                encrypted = vigenere_encrypt(line, key)
            elif algorithm == 'xor':
                if not key:
                    raise ValueError("异或加密需要密钥")
                encrypted = xor_encrypt(line, key)
            else:
                raise ValueError(f"不支持的算法: {algorithm}")
            
            results.append(encrypted)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in results:
            f.write(line + '\n')


def batch_decrypt(input_file: str, output_file: str, algorithm: str,
                  shift: int = None, key: str = None) -> None:
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"输入文件不存在: {input_file}")
    
    results = []
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if not line:
                results.append('')
                continue
            
            if algorithm == 'caesar':
                if shift is None:
                    raise ValueError("凯撒密码需要偏移量")
                decrypted = caesar_decrypt(line, shift)
            elif algorithm == 'vigenere':
                if not key:
                    raise ValueError("维吉尼亚密码需要密钥")
                decrypted = vigenere_decrypt(line, key)
            elif algorithm == 'xor':
                if not key:
                    raise ValueError("异或解密需要密钥")
                decrypted = xor_decrypt(line, key)
            else:
                raise ValueError(f"不支持的算法: {algorithm}")
            
            results.append(decrypted)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in results:
            f.write(line + '\n')


def encrypt_file(input_file: str, output_file: str, key: str) -> None:
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"输入文件不存在: {input_file}")
    
    with open(input_file, 'rb') as f:
        data = f.read()
    
    encrypted = xor_bytes(data, key)
    
    with open(output_file, 'wb') as f:
        f.write(encrypted)


def decrypt_file(input_file: str, output_file: str, key: str) -> None:
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"输入文件不存在: {input_file}")
    
    with open(input_file, 'rb') as f:
        data = f.read()
    
    decrypted = xor_bytes(data, key)
    
    with open(output_file, 'wb') as f:
        f.write(decrypted)
