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
import socket
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

def _sftp_makedirs(sftp, path):
    parts = path.strip('/').split('/')
    current = ''
    for part in parts:
        if not part:
            continue
        current += '/' + part
        try:
            sftp.stat(current)
        except IOError:
            try:
                sftp.mkdir(current)
            except IOError:
                pass

def upload_sftp(local_path: str, host: str, port: int, username: str, password: str, remote_path: str) -> bool:
    ssh = None
    sftp = None
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, port=port, username=username, password=password, timeout=10)
        sftp = ssh.open_sftp()
        
        _sftp_makedirs(sftp, remote_path)
        
        if os.path.isfile(local_path):
            remote_file = remote_path.rstrip('/') + '/' + os.path.basename(local_path)
            sftp.put(local_path, remote_file)
            print(f"  已上传: {os.path.basename(local_path)} -> {remote_file}")
        else:
            for root, dirs, files in os.walk(local_path):
                for file in files:
                    local_file = os.path.join(root, file)
                    rel_path = os.path.relpath(local_file, local_path)
                    rel_path_posix = rel_path.replace(os.sep, '/')
                    remote_file = remote_path.rstrip('/') + '/' + rel_path_posix
                    remote_dir = remote_path.rstrip('/') + '/' + os.path.dirname(rel_path_posix)
                    _sftp_makedirs(sftp, remote_dir)
                    sftp.put(local_file, remote_file)
                    print(f"  已上传: {rel_path_posix} -> {remote_file}")
        
        return True
    except paramiko.AuthenticationException:
        print(f"SFTP认证失败: 用户名或密码错误")
        return False
    except paramiko.SSHException as e:
        print(f"SFTP连接失败: {e}")
        return False
    except socket.timeout:
        print(f"SFTP连接超时")
        return False
    except Exception as e:
        print(f"SFTP上传失败: {e}")
        return False
    finally:
        if sftp:
            sftp.close()
        if ssh:
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

def create_self_extracting(enc_file: str, output_exe: str, password: str = None):
    script_content = f'''#!/usr/bin/env python3
import base64
import sys
import os

ENCRYPTED_DATA = base64.b64decode({base64.b64encode(open(enc_file, 'rb').read()).__repr__()})

{open(__file__).read().split('def create_self_extracting')[0]}

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
    print(f"解压完成: {{result}}")

if __name__ == '__main__':
    main()
'''
    with open(output_exe, 'w') as f:
        f.write(script_content)
    os.chmod(output_exe, 0o755)

def read_folder_list(file_path: str) -> list:
    folders = []
    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                folders.append(line)
    return folders

def main():
    parser = argparse.ArgumentParser(description='文件夹加密打包工具')
    parser.add_argument('mode', choices=['encrypt', 'decrypt', 'genkey', 'batch'], help='操作模式')
    parser.add_argument('-i', '--input', help='输入文件夹或加密文件路径')
    parser.add_argument('-o', '--output', help='输出文件或目录路径')
    parser.add_argument('-p', '--password', help='密码(静默模式)')
    parser.add_argument('--public-key', help='RSA公钥文件路径')
    parser.add_argument('--private-key', help='RSA私钥文件路径')
    parser.add_argument('--comment', default='', help='加密注释')
    parser.add_argument('--encrypt-filenames', action='store_true', help='加密文件名')
    parser.add_argument('--volume-size', type=int, help='分卷大小(字节)')
    parser.add_argument('--delete-original', action='store_true', help='加密后删除原始文件夹')
    parser.add_argument('--self-extracting', help='生成自解压脚本路径')
    parser.add_argument('--upload-sftp', action='store_true', help='启用SFTP上传')
    parser.add_argument('--sftp-host', help='SFTP服务器地址')
    parser.add_argument('--sftp-port', type=int, default=22, help='SFTP端口')
    parser.add_argument('--sftp-user', help='SFTP用户名')
    parser.add_argument('--sftp-pass', help='SFTP密码')
    parser.add_argument('--sftp-path', default='/', help='SFTP远程路径')
    parser.add_argument('--folder-list', help='文件夹列表文件(批量加密)')
    parser.add_argument('--key-size', type=int, default=2048, help='RSA密钥大小')
    
    args = parser.parse_args()
    
    if args.mode == 'genkey':
        print(f"正在生成RSA密钥对({args.key_size}位)...")
        private_key, public_key = generate_rsa_keypair(args.key_size)
        output_dir = args.output or '.'
        save_rsa_keys(private_key, public_key, output_dir)
        print(f"密钥已保存到: {output_dir}/private_key.pem 和 {output_dir}/public_key.pem")
        return
    
    if args.mode == 'encrypt':
        if not args.input:
            print("错误: 请指定输入文件夹路径 (-i)")
            return
        
        if args.upload_sftp:
            if not args.sftp_host or not args.sftp_user or not args.sftp_pass:
                print("错误: 启用SFTP上传需要指定 --sftp-host、--sftp-user 和 --sftp-pass")
                return
        
        if not os.path.isdir(args.input):
            print(f"错误: 文件夹不存在: {args.input}")
            return
        
        password = args.password
        public_key = None
        
        if args.public_key:
            with open(args.public_key, 'rb') as f:
                public_key = f.read()
            print(f"使用RSA公钥加密: {args.public_key}")
        elif not password:
            try:
                password = getpass.getpass("请输入加密密码: ")
                password2 = getpass.getpass("请再次输入密码: ")
                if password != password2:
                    print("错误: 两次输入的密码不一致")
                    return
            except:
                password = input("请输入加密密码: ")
        
        output_path = args.output or os.path.basename(args.input.rstrip('/'))
        
        print(f"正在加密: {args.input}")
        output_files, file_hash = create_encrypted_file(
            args.input,
            output_path,
            password=password,
            public_key=public_key,
            comment=args.comment,
            encrypt_filenames=args.encrypt_filenames,
            volume_size=args.volume_size
        )
        
        print(f"加密完成！输出文件:")
        for f in output_files:
            print(f"  {f}")
        print(f"SHA256: {file_hash}")
        
        if args.self_extracting and not public_key:
            print(f"正在生成自解压脚本...")
            create_self_extracting(output_files[0] if len(output_files) == 1 else output_path, args.self_extracting, password)
            print(f"自解压脚本: {args.self_extracting}")
        
        if args.upload_sftp:
            print(f"正在上传到SFTP服务器 {args.sftp_host}...")
            upload_success = True
            if len(output_files) == 1:
                if not upload_sftp(output_files[0], args.sftp_host, args.sftp_port, args.sftp_user, args.sftp_pass, args.sftp_path):
                    upload_success = False
            else:
                for f in output_files:
                    if not upload_sftp(f, args.sftp_host, args.sftp_port, args.sftp_user, args.sftp_pass, args.sftp_path):
                        upload_success = False
            
            if upload_success:
                print("SFTP上传完成")
            else:
                print("SFTP上传部分或全部失败")
        
        if args.delete_original:
            confirm = input(f"确定要删除原始文件夹 {args.input} 吗? (yes/no): ")
            if confirm.lower() == 'yes':
                shutil.rmtree(args.input)
                print("原始文件夹已删除")
        
        return
    
    if args.mode == 'decrypt':
        if not args.input:
            print("错误: 请指定加密文件路径 (-i)")
            return
        
        if not os.path.exists(args.input) and '*' not in args.input and '?' not in args.input:
            print(f"错误: 文件不存在: {args.input}")
            return
        
        password = args.password
        private_key = None
        
        if args.private_key:
            with open(args.private_key, 'rb') as f:
                private_key = f.read()
        elif not password:
            try:
                password = getpass.getpass("请输入解密密码: ")
            except:
                password = input("请输入解密密码: ")
        
        output_dir = args.output or '.'
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"正在解密: {args.input}")
        try:
            result = decrypt_file(args.input, output_dir, password=password, private_key=private_key)
            print(f"解密完成！输出目录: {result}")
        except Exception as e:
            print(f"解密失败: {e}")
        
        return
    
    if args.mode == 'batch':
        folders = []
        if args.folder_list:
            folders = read_folder_list(args.folder_list)
            print(f"从文件读取到 {len(folders)} 个文件夹")
        elif args.input:
            folders = [args.input]
        
        if not folders:
            print("错误: 请指定文件夹列表文件 (--folder-list) 或输入文件夹 (-i)")
            return
        
        password = args.password
        public_key = None
        
        if args.public_key:
            with open(args.public_key, 'rb') as f:
                public_key = f.read()
        elif not password:
            try:
                password = getpass.getpass("请输入加密密码: ")
                password2 = getpass.getpass("请再次输入密码: ")
                if password != password2:
                    print("错误: 两次输入的密码不一致")
                    return
            except:
                password = input("请输入加密密码: ")
        
        output_dir = args.output or '.'
        os.makedirs(output_dir, exist_ok=True)
        
        sftp_upload_success = True
        if args.upload_sftp:
            if not args.sftp_host or not args.sftp_user or not args.sftp_pass:
                print("错误: 启用SFTP上传需要指定 --sftp-host、--sftp-user 和 --sftp-pass")
                return
            print(f"将上传到SFTP服务器: {args.sftp_host}")
        
        for i, folder in enumerate(folders, 1):
            if not os.path.isdir(folder):
                print(f"跳过不存在的文件夹: {folder}")
                continue
            
            print(f"\n[{i}/{len(folders)}] 正在加密: {folder}")
            try:
                output_path = os.path.join(output_dir, os.path.basename(folder.rstrip('/')))
                output_files, file_hash = create_encrypted_file(
                    folder,
                    output_path,
                    password=password,
                    public_key=public_key,
                    comment=args.comment,
                    encrypt_filenames=args.encrypt_filenames,
                    volume_size=args.volume_size
                )
                print(f"  完成: {output_files[0]}")
                
                if args.upload_sftp:
                    print(f"  正在上传到SFTP...")
                    for f in output_files:
                        if not upload_sftp(f, args.sftp_host, args.sftp_port, args.sftp_user, args.sftp_pass, args.sftp_path):
                            sftp_upload_success = False
            except Exception as e:
                print(f"  失败: {e}")
        
        print(f"\n批量加密完成！共处理 {len(folders)} 个文件夹")
        if args.upload_sftp:
            if sftp_upload_success:
                print("SFTP批量上传完成")
            else:
                print("SFTP批量上传部分或全部失败")
        return

if __name__ == '__main__':
    main()
