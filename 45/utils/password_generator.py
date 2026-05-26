import random
import string


def generate_strong_password(length: int = 16) -> str:
    if length < 8:
        raise ValueError("密码长度至少为8位")
    
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special_chars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    all_chars = lowercase + uppercase + digits + special_chars
    
    password = [
        random.choice(lowercase),
        random.choice(uppercase),
        random.choice(digits),
        random.choice(special_chars)
    ]
    
    for _ in range(length - 4):
        password.append(random.choice(all_chars))
    
    random.shuffle(password)
    
    return ''.join(password)
