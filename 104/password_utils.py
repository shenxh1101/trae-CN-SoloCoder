#!/usr/bin/env python3
import random
import string
import re
import csv
import io
import zipfile
from cryptography.fernet import Fernet
import base64
import hashlib

CONFUSING_CHARS = {'0', 'O', '1', 'l', 'I'}

COMMON_WEAK_PASSWORDS = {
    'password', '123456', '123456789', '12345678', '12345',
    'qwerty', 'abc123', 'password1', '111111', '123123',
    'admin', 'letmein', 'welcome', 'monkey', 'dragon',
    'master', '666666', 'qwertyuiop', '123321', 'password123',
    '1234567', 'football', 'iloveyou', 'sunshine', 'princess',
    'admin123', 'trustno1', '000000', 'login', 'starwars'
}

WORD_LIST = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest',
    'garden', 'harbor', 'island', 'jungle', 'kingdom', 'lemon',
    'mountain', 'night', 'ocean', 'palace', 'queen', 'river',
    'sunset', 'tiger', 'umbrella', 'valley', 'water', 'xenon',
    'yellow', 'zebra', 'alpha', 'beta', 'gamma', 'delta',
    'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliett',
    'kilo', 'lima', 'mike', 'november', 'oscar', 'papa',
    'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor',
    'whiskey', 'xray', 'yankee', 'zulu', 'astronaut', 'builder',
    'captain', 'dancer', 'engineer', 'farmer', 'guitar', 'hunter',
    'inventor', 'jockey', 'knight', 'lantern', 'mystery', 'ninja',
    'oracle', 'pilot', 'quantum', 'ranger', 'singer', 'teacher',
    'unicorn', 'voyager', 'wizard', 'yacht', 'zephyr'
]

LOWERCASE = string.ascii_lowercase
UPPERCASE = string.ascii_uppercase
DIGITS = string.digits
SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?'


def generate_password(length=12, include_upper=True, include_lower=True,
                      include_digits=True, include_special=True,
                      exclude_confusing=True, count=1):
    char_pool = ''
    required_chars = []

    if exclude_confusing:
        filtered_lower = ''.join(c for c in LOWERCASE if c not in CONFUSING_CHARS)
        filtered_upper = ''.join(c for c in UPPERCASE if c not in CONFUSING_CHARS)
        filtered_digits = ''.join(c for c in DIGITS if c not in CONFUSING_CHARS)
    else:
        filtered_lower = LOWERCASE
        filtered_upper = UPPERCASE
        filtered_digits = DIGITS

    if include_lower:
        char_pool += filtered_lower
        required_chars.append(random.choice(filtered_lower))
    if include_upper:
        char_pool += filtered_upper
        required_chars.append(random.choice(filtered_upper))
    if include_digits:
        char_pool += filtered_digits
        required_chars.append(random.choice(filtered_digits))
    if include_special:
        char_pool += SPECIAL
        required_chars.append(random.choice(SPECIAL))

    if not char_pool:
        raise ValueError("At least one character type must be selected")

    passwords = []
    for _ in range(min(count, 10)):
        password_chars = required_chars[:]
        remaining_length = length - len(password_chars)
        if remaining_length > 0:
            password_chars.extend(random.choice(char_pool) for _ in range(remaining_length))
        random.shuffle(password_chars)
        password = ''.join(password_chars[:length])
        passwords.append(password)

    return passwords


def generate_passphrase(num_words=4, include_number=True):
    words = random.sample(WORD_LIST, min(num_words, 8))
    passphrase = '-'.join(words)
    if include_number:
        number = random.randint(0, 999)
        passphrase += '-' + str(number)
    return passphrase


def generate_wifi_qr_string(ssid, password=None, encryption='WPA'):
    if password is None:
        password = generate_password(length=16, exclude_confusing=False)[0]
    qr_string = f'WIFI:T:{encryption};S:{ssid};P:{password};;'
    return qr_string, password


def check_password_strength(password):
    analysis = {
        'score': 0,
        'max_score': 100,
        'rating': '',
        'details': {
            'length': {'value': len(password), 'points': 0, 'max': 30},
            'character_types': {'value': [], 'points': 0, 'max': 30},
            'common_password': {'value': False, 'points': 0, 'max': 20},
            'repeating_patterns': {'value': [], 'points': 0, 'max': 20}
        }
    }

    length = len(password)
    if length >= 16:
        analysis['details']['length']['points'] = 30
    elif length >= 12:
        analysis['details']['length']['points'] = 25
    elif length >= 8:
        analysis['details']['length']['points'] = 20
    elif length >= 6:
        analysis['details']['length']['points'] = 10
    else:
        analysis['details']['length']['points'] = 5

    char_types = []
    if re.search(r'[a-z]', password):
        char_types.append('lowercase')
    if re.search(r'[A-Z]', password):
        char_types.append('uppercase')
    if re.search(r'[0-9]', password):
        char_types.append('digits')
    if re.search(r'[^a-zA-Z0-9]', password):
        char_types.append('special')

    analysis['details']['character_types']['value'] = char_types
    analysis['details']['character_types']['points'] = len(char_types) * 7.5

    is_common = password.lower() in COMMON_WEAK_PASSWORDS
    analysis['details']['common_password']['value'] = is_common
    if is_common:
        analysis['details']['common_password']['points'] = 0
    else:
        analysis['details']['common_password']['points'] = 20

    repeating_patterns = []
    for match in re.finditer(r'(.)\1{2,}', password):
        repeating_patterns.append({
            'pattern': match.group(0),
            'position': match.start()
        })

    sequential_patterns = []
    for i in range(len(password) - 2):
        if (ord(password[i+1]) == ord(password[i]) + 1 and
            ord(password[i+2]) == ord(password[i]) + 2):
            sequential_patterns.append({
                'pattern': password[i:i+3],
                'position': i
            })
        elif (ord(password[i+1]) == ord(password[i]) - 1 and
              ord(password[i+2]) == ord(password[i]) - 2):
            sequential_patterns.append({
                'pattern': password[i:i+3],
                'position': i
            })

    analysis['details']['repeating_patterns']['value'] = repeating_patterns + sequential_patterns
    pattern_penalty = min(len(repeating_patterns) + len(sequential_patterns), 3) * 6.67
    analysis['details']['repeating_patterns']['points'] = max(0, 20 - pattern_penalty)

    total_score = sum(v['points'] for v in analysis['details'].values())
    analysis['score'] = int(round(total_score))

    if analysis['score'] >= 90:
        analysis['rating'] = '非常强'
    elif analysis['score'] >= 75:
        analysis['rating'] = '强'
    elif analysis['score'] >= 60:
        analysis['rating'] = '中等'
    elif analysis['score'] >= 40:
        analysis['rating'] = '弱'
    else:
        analysis['rating'] = '非常弱'

    return analysis


def batch_check_passwords(password_list):
    results = []
    for password in password_list:
        password = password.strip()
        if password:
            analysis = check_password_strength(password)
            results.append({
                'password': password,
                'score': analysis['score'],
                'rating': analysis['rating'],
                'length': len(password)
            })
    return results


def encrypt_csv(passwords, encryption_password):
    key = hashlib.sha256(encryption_password.encode()).digest()
    fernet = Fernet(base64.urlsafe_b64encode(key[:32]))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['序号', '密码', '长度', '生成时间'])
    for i, pwd in enumerate(passwords, 1):
        writer.writerow([i, pwd['password'], pwd['length'], pwd.get('timestamp', '')])

    csv_data = output.getvalue().encode('utf-8')
    encrypted_data = fernet.encrypt(csv_data)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('passwords_encrypted.bin', encrypted_data)
        zf.writestr('README.txt',
                    '此文件包含加密的密码列表。\n'
                    '使用加密密码解密 passwords_encrypted.bin 文件。\n'
                    '请妥善保管您的加密密码！')

    return zip_buffer.getvalue()
