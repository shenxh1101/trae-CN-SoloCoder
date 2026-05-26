def _shift_char(char: str, key_char: str, encrypt: bool = True) -> str:
    if not char.isalpha():
        return char
    
    is_upper = char.isupper()
    base = ord('A') if is_upper else ord('a')
    key_base = ord('A') if key_char.isupper() else ord('a')
    
    char_code = ord(char) - base
    key_code = ord(key_char) - key_base
    
    if encrypt:
        new_code = (char_code + key_code) % 26
    else:
        new_code = (char_code - key_code) % 26
    
    return chr(new_code + base)


def vigenere_encrypt(text: str, key: str) -> str:
    if not key:
        raise ValueError("密钥不能为空")
    
    result = []
    key_index = 0
    key_length = len(key)
    
    for char in text:
        if char.isalpha():
            key_char = key[key_index % key_length]
            result.append(_shift_char(char, key_char, encrypt=True))
            key_index += 1
        else:
            result.append(char)
    
    return ''.join(result)


def vigenere_decrypt(text: str, key: str) -> str:
    if not key:
        raise ValueError("密钥不能为空")
    
    result = []
    key_index = 0
    key_length = len(key)
    
    for char in text:
        if char.isalpha():
            key_char = key[key_index % key_length]
            result.append(_shift_char(char, key_char, encrypt=False))
            key_index += 1
        else:
            result.append(char)
    
    return ''.join(result)
