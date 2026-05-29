#!/usr/bin/env python3
import base64
import sys
import os

ENCRYPTED_DATA = base64.b64decode(b'RkVOQwEAUFdEuMlzV4An6PI2ox3+NSXZa6cAAAB7InZlcnNpb24iOiAxLCAic2hhMjU2IjogImM0MDc5Yzc3ZGY1Zjk0MGNjYWUwNjA5NmRiNTZmOTgyOTVkYThkMmZmMWU1ZmFkZGNiYTJjOTUxOTQ4ZDFhODEiLCAiY29tbWVudCI6ICIiLCAiZW5jcnlwdF9maWxlbmFtZXMiOiBmYWxzZSwgIm9yaWdpbmFsX25hbWUiOiAidGVzdF9mb2xkZXIiffYCSCtc38yZy4jAgJpp5aNL9yLTJfEKruKW89yV17nNTGkMp4WPia+5EgU5gGNIAvkcNYV/XaiH3EJuh9DQucnT7ZB14LT8FMIWKE4r8tMCyE6FI0oJ4uaoVplcie9yplPvzkqdasVZLVSSTTPXK0XtskBzd3DoB53pFiinVIu4u3ZUHaeIbKo972BLX9o/dha7MOCE/LU+jFC/T/itumdlHx/v6gR8W54DsuZjH+frAgtCQSlTYEbFGjyhVo0pCs0BtWqN5iCNKzCsXxzhr3Sd71cYHfCeh/BZF78eMlbvqa8znnHY3D1V0UUoXlTWJUwMGvP8Q4wW54MHGLFPo7dkRn9cSCiI6h81Y3bGm0MkLjx3cKmuTazLrpme')

#!/usr/bin/env python3
import os
import sys
import zipfile
import hashlib
import struct
import json
import getpass
import shutil
import base64
from pathlib import Path
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import PBKDF2
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
import paramiko
import argparse

MAGIC = b'FENC'
VERSION = 1
SALT_SIZE = 16
IV_SIZE = 16
KEY_SIZE = 32
TAG_SIZE = 16

def derive_key(password: str, salt: bytes) -> bytes:
    return PBKDF2(password, salt, dkLen=KEY_SIZE, count=100000)

def encrypt_aes(data: bytes, key: bytes) -> bytes:
    iv = get_random_bytes(IV_SIZE)
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    ciphertext, tag = cipher.encrypt_and_digest(data)
    return iv + ciphertext + tag

def decrypt_aes(encrypted_data: bytes, key: bytes) -> bytes:
    iv = encrypted_data[:IV_SIZE]
    tag = encrypted_data[-TAG_SIZE:]
    ciphertext = encrypted_data[IV_SIZE:-TAG_SIZE]
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    return cipher.decrypt_and_verify(ciphertext, tag)

def generate_rsa_keypair(key_size: int = 2048) -> tuple:
    key = RSA.generate(key_size)
    private_key = key.export_key()
    public_key = key.publickey().export_key()
    return private_key, public_key

def save_rsa_keys(private_key: bytes, public_key: bytes, output_dir: str = '.'):
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, 'private_key.pem'), 'wb') as f:
        f.write(private_key)
    with open(os.path.join(output_dir, 'public_key.pem'), 'wb') as f:
        f.write(public_key)

def rsa_encrypt(data: bytes, public_key: bytes) -> bytes:
    key = RSA.import_key(public_key)
    cipher = PKCS1_OAEP.new(key)
    return cipher.encrypt(data)

def rsa_decrypt(encrypted_data: bytes, private_key: bytes) -> bytes:
    key = RSA.import_key(private_key)
    cipher = PKCS1_OAEP.new(key)
    return cipher.decrypt(encrypted_data)

def calculate_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def show_progress(percent: int):
    bar_length = 50
    filled = int(bar_length * percent / 100)
    bar = '=' * filled + '-' * (bar_length - filled)
    print(f'\r[{bar}] {percent}%', end='', flush=True)
    if percent >= 100:
        print()

def zip_folder(folder_path: str, encrypt_filenames: bool = False, progress_callback=None) -> bytes:
    folder_path = os.path.abspath(folder_path)
    if not os.path.isdir(folder_path):
        raise ValueError(f"路径不是文件夹: {folder_path}")
    
    import io
    zip_buffer = io.BytesIO()
    
    file_list = []
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, folder_path)
            file_list.append((file_path, arcname))
    
    total_files = len(file_list)
    processed = 0
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_path, arcname in file_list:
            if encrypt_filenames:
                arcname = base64.b64encode(arcname.encode('utf-8')).decode('ascii')
            zf.write(file_path, arcname)
            processed += 1
            if progress_callback:
                progress_callback(int(processed / total_files * 50))
    
    zip_data = zip_buffer.getvalue()
    if progress_callback:
        progress_callback(50)
    return zip_data

def unzip_folder(zip_data: bytes, output_dir: str, encrypted_filenames: bool = False):
    import io
    zip_buffer = io.BytesIO(zip_data)
    
    with zipfile.ZipFile(zip_buffer, 'r') as zf:
        for info in zf.infolist():
            arcname = info.filename
            if encrypted_filenames:
                arcname = base64.b64decode(arcname).decode('utf-8')
            target_path = os.path.join(output_dir, arcname)
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with zf.open(info) as src, open(target_path, 'wb') as dst:
                shutil.copyfileobj(src, dst)

def create_encrypted_file(
    folder_path: str,
    output_path: str,
    password: str = None,
    public_key: bytes = None,
    comment: str = '',
    encrypt_filenames: bool = False,
    volume_size: int = None
) -> list:
    zip_data = zip_folder(folder_path, encrypt_filenames, show_progress)
    sha256_hash = calculate_sha256(zip_data)
    
    salt = get_random_bytes(SALT_SIZE)
    
    if public_key:
        aes_key = get_random_bytes(KEY_SIZE)
        encrypted_aes_key = rsa_encrypt(aes_key, public_key)
        key_method = b'RSA'
        key_data = encrypted_aes_key
    else:
        aes_key = derive_key(password, salt)
        key_method = b'PWD'
        key_data = b''
    
    encrypted_data = encrypt_aes(zip_data, aes_key)
    
    metadata = {
        'version': VERSION,
        'sha256': sha256_hash,
        'comment': comment,
        'encrypt_filenames': encrypt_filenames,
        'original_name': os.path.basename(folder_path)
    }
    metadata_json = json.dumps(metadata).encode('utf-8')
    
    header = MAGIC
    header += struct.pack('<H', VERSION)
    header += key_method
    header += salt
    header += struct.pack('<I', len(metadata_json))
    header += metadata_json
    if key_method == b'RSA':
        header += struct.pack('<I', len(key_data))
        header += key_data
    
    full_data = header + encrypted_data
    
    output_files = []
    if volume_size:
        volume_num = 1
        offset = 0
        total_size = len(full_data)
        while offset < total_size:
            volume_data = full_data[offset:offset + volume_size]
            volume_path = f"{output_path}.part{volume_num:03d}.enc"
            with open(volume_path, 'wb') as f:
                f.write(volume_data)
            output_files.append(volume_path)
            offset += volume_size
            volume_num += 1
            progress = min(50 + int(offset / total_size * 50), 100)
            show_progress(progress)
    else:
        if not output_path.endswith('.enc'):
            output_path += '.enc'
        with open(output_path, 'wb') as f:
            f.write(full_data)
        output_files.append(output_path)
        show_progress(100)
    
    return output_files, sha256_hash

def read_encrypted_file(input_path: str) -> tuple:
    if os.path.isdir(input_path):
        parts = sorted([f for f in os.listdir(input_path) if f.endswith('.enc')])
        if not parts:
            parts = sorted([f for f in os.listdir(input_path) if '.part' in f and f.endswith('.enc')])
        data = b''
        for part in parts:
            with open(os.path.join(input_path, part), 'rb') as f:
                data += f.read()
    elif '*' in input_path or '?' in input_path:
        import glob
        parts = sorted(glob.glob(input_path))
        data = b''
        for part in parts:
            with open(part, 'rb') as f:
                data += f.read()
    else:
        with open(input_path, 'rb') as f:
            data = f.read()
    
    if data[:4] != MAGIC:
        raise ValueError("不是有效的加密文件")
    
    version = struct.unpack('<H', data[4:6])[0]
    key_method = data[6:9]
    salt = data[9:9+SALT_SIZE]
    metadata_len = struct.unpack('<I', data[9+SALT_SIZE:13+SALT_SIZE])[0]
    metadata_json = data[13+SALT_SIZE:13+SALT_SIZE+metadata_len]
    metadata = json.loads(metadata_json.decode('utf-8'))
    
    offset = 13 + SALT_SIZE + metadata_len
    
    encrypted_aes_key = b''
    if key_method == b'RSA':
        key_len = struct.unpack('<I', data[offset:offset+4])[0]
        encrypted_aes_key = data[offset+4:offset+4+key_len]
        offset += 4 + key_len
    
    encrypted_data = data[offset:]
    
    return metadata, key_method, salt, encrypted_aes_key, encrypted_data

def decrypt_file(
    input_path: str,
    output_dir: str,
    password: str = None,
    private_key: bytes = None
) -> str:
    metadata, key_method, salt, encrypted_aes_key, encrypted_data = read_encrypted_file(input_path)
    
    if key_method == b'RSA':
        if not private_key:
            raise ValueError("需要RSA私钥进行解密")
        aes_key = rsa_decrypt(encrypted_aes_key, private_key)
    else:
        if not password:
            raise ValueError("需要密码进行解密")
        aes_key = derive_key(password, salt)
    
    zip_data = decrypt_aes(encrypted_data, aes_key)
    
    calculated_hash = calculate_sha256(zip_data)
    if calculated_hash != metadata['sha256']:
        raise ValueError(f"完整性校验失败！预期: {metadata['sha256']}, 实际: {calculated_hash}")
    
    print(f"完整性校验通过")
    if metadata.get('comment'):
        print(f"注释: {metadata['comment']}")
    
    extract_dir = os.path.join(output_dir, metadata.get('original_name', 'decrypted'))
    os.makedirs(extract_dir, exist_ok=True)
    unzip_folder(zip_data, extract_dir, metadata.get('encrypt_filenames', False))
    
    return extract_dir

def upload_sftp(local_path: str, host: str, port: int, username: str, password: str, remote_path: str):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, port=port, username=username, password=password)
    sftp = ssh.open_sftp()
    
    if os.path.isfile(local_path):
        sftp.put(local_path, os.path.join(remote_path, os.path.basename(local_path)))
    else:
        for root, dirs, files in os.walk(local_path):
            for file in files:
                local_file = os.path.join(root, file)
                rel_path = os.path.relpath(local_file, local_path)
                remote_file = os.path.join(remote_path, rel_path)
                try:
                    sftp.mkdir(os.path.dirname(remote_file))
                except:
                    pass
                sftp.put(local_file, remote_file)
    
    sftp.close()
    ssh.close()

def decrypt_file_data(encrypted_data: bytes, output_dir: str, password: str = None) -> str:
    if encrypted_data[:4] != MAGIC:
        raise ValueError("不是有效的加密数据")
    
    version = struct.unpack('<H', encrypted_data[4:6])[0]
    key_method = encrypted_data[6:9]
    salt = encrypted_data[9:9+SALT_SIZE]
    metadata_len = struct.unpack('<I', encrypted_data[9+SALT_SIZE:13+SALT_SIZE])[0]
    metadata_json = encrypted_data[13+SALT_SIZE:13+SALT_SIZE+metadata_len]
    metadata = json.loads(metadata_json.decode('utf-8'))
    
    offset = 13 + SALT_SIZE + metadata_len
    
    encrypted_aes_key = b''
    if key_method == b'RSA':
        raise ValueError("自解压不支持RSA解密")
    
    encrypted_content = encrypted_data[offset:]
    aes_key = derive_key(password, salt)
    zip_data = decrypt_aes(encrypted_content, aes_key)
    
    calculated_hash = calculate_sha256(zip_data)
    if calculated_hash != metadata['sha256']:
        raise ValueError(f"完整性校验失败！")
    
    extract_dir = os.path.join(output_dir, metadata.get('original_name', 'decrypted'))
    os.makedirs(extract_dir, exist_ok=True)
    unzip_folder(zip_data, extract_dir, metadata.get('encrypt_filenames', False))
    
    return extract_dir



def main():
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        try:
            import getpass
            password = getpass.getpass("请输入密码: ")
        except:
            password = input("请输入密码: ")
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    result = decrypt_file_data(ENCRYPTED_DATA, output_dir, password)
    print(f"解压完成: {result}")

if __name__ == '__main__':
    main()
