#!/usr/bin/env python3
import argparse
import sys
import os

from ciphers.caesar import caesar_encrypt, caesar_decrypt
from ciphers.vigenere import vigenere_encrypt, vigenere_decrypt
from ciphers.xor_cipher import xor_encrypt, xor_decrypt
from ciphers.base64_cipher import base64_encode, base64_decode

from utils.file_handler import (
    save_to_file, read_from_file,
    batch_encrypt, batch_decrypt,
    encrypt_file, decrypt_file
)
from utils.hash_utils import calculate_md5, calculate_sha256
from utils.password_generator import generate_strong_password
from utils.salt_utils import add_salt, extract_salt
from utils.keystroke_capture import capture_keystroke_seed
from utils.logger import log_operation


def interactive_mode():
    print("\n" + "="*60)
    print("          文本加密解密工具 - 交互模式")
    print("="*60)
    print("\n请选择操作类型:")
    print("1. 加密")
    print("2. 解密")
    print("3. 哈希计算")
    print("4. 生成密码")
    print("5. 批量加密")
    print("6. 批量解密")
    print("7. 文件加密")
    print("8. 文件解密")
    print("0. 退出")
    
    choice = input("\n请输入选项 (0-8): ").strip()
    
    if choice == '0':
        print("再见!")
        sys.exit(0)
    elif choice in ['1', '2']:
        is_encrypt = choice == '1'
        print("\n选择加密算法:")
        print("1. 凯撒密码")
        print("2. 维吉尼亚密码")
        print("3. 异或加密")
        print("4. Base64编码")
        
        algo = input("\n请输入选项 (1-4): ").strip()
        
        if algo == '1':
            text = input("请输入文本: ")
            shift = int(input("请输入偏移量: "))
            use_salt = input("是否添加盐值? (y/n): ").lower() == 'y'
            
            if is_encrypt:
                result = caesar_encrypt(text, shift)
                if use_salt:
                    result = add_salt(result)
                log_operation("凯撒加密", f"偏移量: {shift}, 盐值: {use_salt}")
            else:
                if use_salt:
                    text, _ = extract_salt(text)
                result = caesar_decrypt(text, shift)
                log_operation("凯撒解密", f"偏移量: {shift}, 盐值: {use_salt}")
            print(f"\n结果: {result}")
            
        elif algo == '2':
            text = input("请输入文本: ")
            key = input("请输入密钥: ")
            use_salt = input("是否添加盐值? (y/n): ").lower() == 'y'
            
            if is_encrypt:
                result = vigenere_encrypt(text, key)
                if use_salt:
                    result = add_salt(result)
                log_operation("维吉尼亚加密", f"密钥长度: {len(key)}, 盐值: {use_salt}")
            else:
                if use_salt:
                    text, _ = extract_salt(text)
                result = vigenere_decrypt(text, key)
                log_operation("维吉尼亚解密", f"密钥长度: {len(key)}, 盐值: {use_salt}")
            print(f"\n结果: {result}")
            
        elif algo == '3':
            text = input("请输入文本: ")
            key_source = input("密钥来源 (1.手动输入 2.随机生成 3.键盘节奏): ").strip()
            
            if key_source == '1':
                key = input("请输入密钥: ")
            elif key_source == '2':
                length = int(input("密码长度 (默认16): ") or 16)
                key = generate_strong_password(length)
                print(f"生成的密钥: {key}")
            elif key_source == '3':
                key = capture_keystroke_seed()
                print(f"生成的密钥: {key}")
            else:
                print("无效选项")
                return
            
            use_salt = input("是否添加盐值? (y/n): ").lower() == 'y'
            
            if is_encrypt:
                result = xor_encrypt(text, key)
                if use_salt:
                    result = add_salt(result)
                log_operation("异或加密", f"密钥来源: {key_source}, 盐值: {use_salt}")
            else:
                if use_salt:
                    text, _ = extract_salt(text)
                result = xor_decrypt(text, key)
                log_operation("异或解密", f"密钥来源: {key_source}, 盐值: {use_salt}")
            print(f"\n结果: {result}")
            
        elif algo == '4':
            text = input("请输入文本: ")
            if is_encrypt:
                result = base64_encode(text)
                log_operation("Base64编码", "")
            else:
                result = base64_decode(text)
                log_operation("Base64解码", "")
            print(f"\n结果: {result}")
        
        save = input("\n是否保存到文件? (y/n): ").lower() == 'y'
        if save:
            filename = input("请输入文件名: ")
            save_to_file(result, filename)
            print(f"已保存到 {filename}")
            
    elif choice == '3':
        text = input("请输入文本: ")
        hash_type = input("哈希类型 (1.MD5 2.SHA256 3.两者都要): ").strip()
        
        if hash_type == '1':
            md5 = calculate_md5(text)
            print(f"\nMD5: {md5}")
            log_operation("MD5哈希", "")
        elif hash_type == '2':
            sha256 = calculate_sha256(text)
            print(f"\nSHA256: {sha256}")
            log_operation("SHA256哈希", "")
        elif hash_type == '3':
            md5 = calculate_md5(text)
            sha256 = calculate_sha256(text)
            print(f"\nMD5: {md5}")
            print(f"SHA256: {sha256}")
            log_operation("哈希计算", "MD5+SHA256")
            
    elif choice == '4':
        length = int(input("密码长度 (默认16): ") or 16)
        pwd = generate_strong_password(length)
        print(f"\n生成的强密码: {pwd}")
        log_operation("生成密码", f"长度: {length}")
        
    elif choice == '5':
        input_file = input("输入文件路径: ")
        output_file = input("输出文件路径: ")
        algo = input("算法 (1.凯撒 2.维吉尼亚 3.异或): ").strip()
        
        if algo == '1':
            shift = int(input("偏移量: "))
            batch_encrypt(input_file, output_file, 'caesar', shift=shift)
            log_operation("批量凯撒加密", f"{input_file} -> {output_file}")
        elif algo == '2':
            key = input("密钥: ")
            batch_encrypt(input_file, output_file, 'vigenere', key=key)
            log_operation("批量维吉尼亚加密", f"{input_file} -> {output_file}")
        elif algo == '3':
            key = input("密钥: ")
            batch_encrypt(input_file, output_file, 'xor', key=key)
            log_operation("批量异或加密", f"{input_file} -> {output_file}")
        print("批量加密完成")
        
    elif choice == '6':
        input_file = input("输入文件路径: ")
        output_file = input("输出文件路径: ")
        algo = input("算法 (1.凯撒 2.维吉尼亚 3.异或): ").strip()
        
        if algo == '1':
            shift = int(input("偏移量: "))
            batch_decrypt(input_file, output_file, 'caesar', shift=shift)
            log_operation("批量凯撒解密", f"{input_file} -> {output_file}")
        elif algo == '2':
            key = input("密钥: ")
            batch_decrypt(input_file, output_file, 'vigenere', key=key)
            log_operation("批量维吉尼亚解密", f"{input_file} -> {output_file}")
        elif algo == '3':
            key = input("密钥: ")
            batch_decrypt(input_file, output_file, 'xor', key=key)
            log_operation("批量异或解密", f"{input_file} -> {output_file}")
        print("批量解密完成")
        
    elif choice == '7':
        input_file = input("输入文件路径: ")
        output_file = input("输出文件路径: ")
        key = input("加密密钥: ")
        encrypt_file(input_file, output_file, key)
        log_operation("文件加密", f"{input_file} -> {output_file}")
        print("文件加密完成")
        
    elif choice == '8':
        input_file = input("输入文件路径: ")
        output_file = input("输出文件路径: ")
        key = input("解密密钥: ")
        decrypt_file(input_file, output_file, key)
        log_operation("文件解密", f"{input_file} -> {output_file}")
        print("文件解密完成")


def cli_mode():
    parser = argparse.ArgumentParser(description='文本加密解密工具')
    subparsers = parser.add_subparsers(dest='command', help='操作命令')

    encrypt_parser = subparsers.add_parser('encrypt', help='加密文本')
    encrypt_parser.add_argument('--algorithm', '-a', required=True, 
                               choices=['caesar', 'vigenere', 'xor', 'base64'],
                               help='加密算法')
    encrypt_parser.add_argument('--text', '-t', help='要加密的文本')
    encrypt_parser.add_argument('--input-file', '-i', help='从文件读取文本')
    encrypt_parser.add_argument('--output-file', '-o', help='保存结果到文件')
    encrypt_parser.add_argument('--shift', type=int, help='凯撒密码偏移量')
    encrypt_parser.add_argument('--key', help='加密密钥')
    encrypt_parser.add_argument('--salt', action='store_true', help='添加随机盐值')
    encrypt_parser.add_argument('--generate-key', action='store_true', help='随机生成密钥')
    encrypt_parser.add_argument('--keystroke-key', action='store_true', help='使用键盘节奏作为密钥')

    decrypt_parser = subparsers.add_parser('decrypt', help='解密文本')
    decrypt_parser.add_argument('--algorithm', '-a', required=True,
                               choices=['caesar', 'vigenere', 'xor', 'base64'],
                               help='解密算法')
    decrypt_parser.add_argument('--text', '-t', help='要解密的文本')
    decrypt_parser.add_argument('--input-file', '-i', help='从文件读取密文')
    decrypt_parser.add_argument('--output-file', '-o', help='保存结果到文件')
    decrypt_parser.add_argument('--shift', type=int, help='凯撒密码偏移量')
    decrypt_parser.add_argument('--key', help='解密密钥')
    decrypt_parser.add_argument('--has-salt', action='store_true', help='密文包含盐值')

    hash_parser = subparsers.add_parser('hash', help='计算哈希值')
    hash_parser.add_argument('--text', '-t', help='要计算的文本')
    hash_parser.add_argument('--input-file', '-i', help='从文件读取文本')
    hash_parser.add_argument('--type', choices=['md5', 'sha256', 'both'], default='both',
                            help='哈希类型')

    gen_parser = subparsers.add_parser('generate', help='生成强密码')
    gen_parser.add_argument('--length', '-l', type=int, default=16, help='密码长度')

    batch_parser = subparsers.add_parser('batch', help='批量处理')
    batch_parser.add_argument('--mode', choices=['encrypt', 'decrypt'], required=True,
                             help='操作模式')
    batch_parser.add_argument('--algorithm', '-a', required=True,
                             choices=['caesar', 'vigenere', 'xor'],
                             help='加密算法')
    batch_parser.add_argument('--input-file', '-i', required=True, help='输入文件')
    batch_parser.add_argument('--output-file', '-o', required=True, help='输出文件')
    batch_parser.add_argument('--shift', type=int, help='凯撒密码偏移量')
    batch_parser.add_argument('--key', help='加密密钥')

    file_parser = subparsers.add_parser('file', help='文件加密解密')
    file_parser.add_argument('--mode', choices=['encrypt', 'decrypt'], required=True,
                            help='操作模式')
    file_parser.add_argument('--input-file', '-i', required=True, help='输入文件')
    file_parser.add_argument('--output-file', '-o', required=True, help='输出文件')
    file_parser.add_argument('--key', required=True, help='加密密钥')

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        return

    if args.command == 'encrypt':
        text = args.text
        if args.input_file:
            text = read_from_file(args.input_file)
        
        if not text:
            print("错误: 请提供文本或输入文件")
            return

        key = args.key
        if args.generate_key:
            key = generate_strong_password(16)
            print(f"生成的密钥: {key}")
        elif args.keystroke_key:
            key = capture_keystroke_seed()
            print(f"生成的密钥: {key}")

        result = None
        if args.algorithm == 'caesar':
            if args.shift is None:
                print("错误: 凯撒密码需要偏移量 --shift")
                return
            result = caesar_encrypt(text, args.shift)
            log_operation("CLI凯撒加密", f"偏移量: {args.shift}")
        elif args.algorithm == 'vigenere':
            if not key:
                print("错误: 维吉尼亚密码需要密钥 --key")
                return
            result = vigenere_encrypt(text, key)
            log_operation("CLI维吉尼亚加密", f"密钥长度: {len(key)}")
        elif args.algorithm == 'xor':
            if not key:
                print("错误: 异或加密需要密钥 --key 或使用 --generate-key/--keystroke-key")
                return
            result = xor_encrypt(text, key)
            log_operation("CLI异或加密", f"密钥长度: {len(key)}")
        elif args.algorithm == 'base64':
            result = base64_encode(text)
            log_operation("CLIBase64编码", "")

        if args.salt and result:
            result = add_salt(result)

        if result:
            print(f"结果: {result}")
            if args.output_file:
                save_to_file(result, args.output_file)
                print(f"已保存到 {args.output_file}")

    elif args.command == 'decrypt':
        text = args.text
        if args.input_file:
            text = read_from_file(args.input_file)
        
        if not text:
            print("错误: 请提供密文或输入文件")
            return

        key = args.key
        result = None
        
        if args.has_salt:
            text, _ = extract_salt(text)

        if args.algorithm == 'caesar':
            if args.shift is None:
                print("错误: 凯撒密码需要偏移量 --shift")
                return
            result = caesar_decrypt(text, args.shift)
            log_operation("CLI凯撒解密", f"偏移量: {args.shift}")
        elif args.algorithm == 'vigenere':
            if not key:
                print("错误: 维吉尼亚密码需要密钥 --key")
                return
            result = vigenere_decrypt(text, key)
            log_operation("CLI维吉尼亚解密", f"密钥长度: {len(key)}")
        elif args.algorithm == 'xor':
            if not key:
                print("错误: 异或解密需要密钥 --key")
                return
            result = xor_decrypt(text, key)
            log_operation("CLI异或解密", f"密钥长度: {len(key)}")
        elif args.algorithm == 'base64':
            result = base64_decode(text)
            log_operation("CLIBase64解码", "")

        if result:
            print(f"结果: {result}")
            if args.output_file:
                save_to_file(result, args.output_file)
                print(f"已保存到 {args.output_file}")

    elif args.command == 'hash':
        text = args.text
        if args.input_file:
            text = read_from_file(args.input_file)
        
        if not text:
            print("错误: 请提供文本或输入文件")
            return

        if args.type == 'md5' or args.type == 'both':
            md5 = calculate_md5(text)
            print(f"MD5: {md5}")
            log_operation("CLIMD5哈希", "")
        if args.type == 'sha256' or args.type == 'both':
            sha256 = calculate_sha256(text)
            print(f"SHA256: {sha256}")
            log_operation("CLISHA256哈希", "")

    elif args.command == 'generate':
        pwd = generate_strong_password(args.length)
        print(f"生成的强密码: {pwd}")
        log_operation("CLI生成密码", f"长度: {args.length}")

    elif args.command == 'batch':
        if args.mode == 'encrypt':
            batch_encrypt(args.input_file, args.output_file, 
                         args.algorithm, args.shift, args.key)
            log_operation("CLI批量加密", f"{args.input_file} -> {args.output_file}")
        else:
            batch_decrypt(args.input_file, args.output_file,
                         args.algorithm, args.shift, args.key)
            log_operation("CLI批量解密", f"{args.input_file} -> {args.output_file}")
        print("批量处理完成")

    elif args.command == 'file':
        if args.mode == 'encrypt':
            encrypt_file(args.input_file, args.output_file, args.key)
            log_operation("CLI文件加密", f"{args.input_file} -> {args.output_file}")
        else:
            decrypt_file(args.input_file, args.output_file, args.key)
            log_operation("CLI文件解密", f"{args.input_file} -> {args.output_file}")
        print("文件处理完成")


def main():
    if len(sys.argv) == 1:
        while True:
            try:
                interactive_mode()
            except KeyboardInterrupt:
                print("\n\n再见!")
                break
            except Exception as e:
                print(f"错误: {e}")
    else:
        try:
            cli_mode()
        except Exception as e:
            print(f"错误: {e}")
            sys.exit(1)


if __name__ == '__main__':
    main()
