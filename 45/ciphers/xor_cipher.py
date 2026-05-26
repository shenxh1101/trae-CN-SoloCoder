def xor_encrypt(text: str, key: str) -> str:
    if not key:
        raise ValueError("密钥不能为空")
    
    text_bytes = text.encode('utf-8')
    key_bytes = key.encode('utf-8')
    key_length = len(key_bytes)
    result = []
    
    for i, byte in enumerate(text_bytes):
        key_byte = key_bytes[i % key_length]
        xored = byte ^ key_byte
        result.append(format(xored, '02x'))
    
    return ''.join(result)


def xor_decrypt(hex_text: str, key: str) -> str:
    if not key:
        raise ValueError("密钥不能为空")
    
    if len(hex_text) % 2 != 0:
        raise ValueError("密文格式不正确，长度应为偶数")
    
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
        raise ValueError("解密失败：密钥不正确或密文已损坏")


def xor_bytes(data: bytes, key: str) -> bytes:
    if not key:
        raise ValueError("密钥不能为空")
    
    key_bytes = key.encode('utf-8')
    key_length = len(key_bytes)
    result = bytearray()
    
    for i, byte in enumerate(data):
        key_byte = key_bytes[i % key_length]
        result.append(byte ^ key_byte)
    
    return bytes(result)
