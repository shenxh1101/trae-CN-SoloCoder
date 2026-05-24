import os
import base64
import json
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidTag


class CryptoManager:
    def __init__(self):
        self.iterations = 100000
        self.key_length = 32

    def derive_key(self, master_password: str, salt: bytes) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self.key_length,
            salt=salt,
            iterations=self.iterations,
        )
        return kdf.derive(master_password.encode('utf-8'))

    def generate_salt(self) -> bytes:
        return os.urandom(16)

    def generate_nonce(self) -> bytes:
        return os.urandom(12)

    def encrypt(self, data: str, key: bytes) -> dict:
        aesgcm = AESGCM(key)
        nonce = self.generate_nonce()
        encrypted_data = aesgcm.encrypt(nonce, data.encode('utf-8'), None)
        return {
            'nonce': base64.b64encode(nonce).decode('utf-8'),
            'data': base64.b64encode(encrypted_data).decode('utf-8')
        }

    def decrypt(self, encrypted: dict, key: bytes) -> str:
        aesgcm = AESGCM(key)
        nonce = base64.b64decode(encrypted['nonce'])
        encrypted_data = base64.b64decode(encrypted['data'])
        try:
            decrypted_data = aesgcm.decrypt(nonce, encrypted_data, None)
            return decrypted_data.decode('utf-8')
        except InvalidTag:
            raise ValueError("解密失败：密钥错误或数据已损坏")

    def encrypt_data(self, data: dict, master_password: str) -> dict:
        salt = self.generate_salt()
        key = self.derive_key(master_password, salt)
        json_data = json.dumps(data, ensure_ascii=False)
        encrypted = self.encrypt(json_data, key)
        return {
            'salt': base64.b64encode(salt).decode('utf-8'),
            'iterations': self.iterations,
            'nonce': encrypted['nonce'],
            'data': encrypted['data']
        }

    def decrypt_data(self, encrypted_package: dict, master_password: str) -> dict:
        salt = base64.b64decode(encrypted_package['salt'])
        iterations = encrypted_package.get('iterations', self.iterations)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self.key_length,
            salt=salt,
            iterations=iterations,
        )
        key = kdf.derive(master_password.encode('utf-8'))
        decrypted_json = self.decrypt({
            'nonce': encrypted_package['nonce'],
            'data': encrypted_package['data']
        }, key)
        return json.loads(decrypted_json)

    def generate_rsa_keypair(self) -> tuple:
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        public_key = private_key.public_key()
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return private_pem.decode('utf-8'), public_pem.decode('utf-8')

    def encrypt_with_public_key(self, data: str, public_key_pem: str) -> str:
        public_key = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
        encrypted = public_key.encrypt(
            data.encode('utf-8'),
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return base64.b64encode(encrypted).decode('utf-8')

    def decrypt_with_private_key(self, encrypted_data: str, private_key_pem: str) -> str:
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode('utf-8'),
            password=None
        )
        encrypted_bytes = base64.b64decode(encrypted_data)
        decrypted = private_key.decrypt(
            encrypted_bytes,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return decrypted.decode('utf-8')
