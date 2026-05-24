import json
from typing import Optional, Dict, Any
from crypto import CryptoManager


class EmergencyContactManager:
    def __init__(self, crypto: CryptoManager):
        self.crypto = crypto

    def generate_emergency_keypair(self) -> tuple:
        return self.crypto.generate_rsa_keypair()

    def setup_emergency_access(
        self,
        master_password: str,
        contact_name: str,
        public_key_pem: str,
        data_file: str,
    ) -> Optional[str]:
        try:
            with open(data_file, "r", encoding="utf-8") as f:
                encrypted_package = json.load(f)

            decrypted_data = self.crypto.decrypt_data(encrypted_package, master_password)

            data_for_emergency = {
                "master_password": master_password,
                "created_at": __import__("datetime").datetime.now().isoformat(),
            }

            emergency_package = {
                "contact_name": contact_name,
                "encrypted_data": self.crypto.encrypt_with_public_key(
                    json.dumps(data_for_emergency, ensure_ascii=False),
                    public_key_pem
                ),
                "public_key": public_key_pem,
            }

            emergency_file = f"{data_file}.emergency"
            with open(emergency_file, "w", encoding="utf-8") as f:
                json.dump(emergency_package, f, indent=2, ensure_ascii=False)

            return emergency_file
        except Exception as e:
            print(f"设置紧急访问失败: {e}")
            return None

    def recover_with_emergency_key(
        self,
        emergency_file: str,
        private_key_pem: str,
    ) -> Optional[str]:
        try:
            with open(emergency_file, "r", encoding="utf-8") as f:
                emergency_package = json.load(f)

            encrypted_data = emergency_package.get("encrypted_data", "")
            decrypted_json = self.crypto.decrypt_with_private_key(
                encrypted_data,
                private_key_pem
            )

            data = json.loads(decrypted_json)
            return data.get("master_password")
        except Exception as e:
            print(f"紧急恢复失败: {e}")
            return None

    def verify_public_key(self, public_key_pem: str) -> bool:
        try:
            from cryptography.hazmat.primitives import serialization
            serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
            return True
        except Exception:
            return False

    def verify_private_key(self, private_key_pem: str) -> bool:
        try:
            from cryptography.hazmat.primitives import serialization
            serialization.load_pem_private_key(
                private_key_pem.encode("utf-8"),
                password=None
            )
            return True
        except Exception:
            return False

    def save_key_to_file(self, key_data: str, filename: str) -> bool:
        try:
            with open(filename, "w", encoding="utf-8") as f:
                f.write(key_data)
            return True
        except Exception as e:
            print(f"保存密钥失败: {e}")
            return False

    def load_key_from_file(self, filename: str) -> Optional[str]:
        try:
            with open(filename, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"读取密钥失败: {e}")
            return None
