import os
import json
import base64
from datetime import datetime, timedelta
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class PasswordVault:
    SALT_SIZE = 16
    ITERATIONS = 100000
    EXPIRY_DAYS = 90

    def __init__(self, master_password, vault_path=None):
        self.master_password = master_password.encode()
        self.vault_path = Path(vault_path) if vault_path else Path.home() / '.password_vault.enc'
        self.entries = {}
        self.fernet = None

    def _derive_key(self, salt):
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=self.ITERATIONS,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_password))
        return key

    def load(self):
        if not self.vault_path.exists():
            self.entries = {}
            return True

        try:
            with open(self.vault_path, 'rb') as f:
                data = f.read()

            salt = data[:self.SALT_SIZE]
            encrypted_data = data[self.SALT_SIZE:]

            key = self._derive_key(salt)
            self.fernet = Fernet(key)

            decrypted_data = self.fernet.decrypt(encrypted_data)
            self.entries = json.loads(decrypted_data.decode())
            return True
        except Exception:
            raise ValueError('主密码错误或文件损坏')

    def save(self):
        salt = os.urandom(self.SALT_SIZE)
        key = self._derive_key(salt)
        self.fernet = Fernet(key)

        data = json.dumps(self.entries).encode()
        encrypted_data = self.fernet.encrypt(data)

        with open(self.vault_path, 'wb') as f:
            f.write(salt + encrypted_data)

    def add_entry(self, site, username, password):
        site_lower = site.lower()
        self.entries[site_lower] = {
            'site': site,
            'username': username,
            'password': password,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }

    def get_entry(self, site):
        site_lower = site.lower()
        entry = self.entries.get(site_lower)
        if entry:
            return {
                'site': entry['site'],
                'username': entry['username'],
                'password': entry['password'],
                'created_at': entry['created_at'],
                'updated_at': entry.get('updated_at', entry['created_at'])
            }
        return None

    def get_all_entries(self):
        return [
            {
                'site': entry['site'],
                'username': entry['username'],
                'password': entry['password'],
                'created_at': entry['created_at'],
                'updated_at': entry.get('updated_at', entry['created_at'])
            }
            for entry in self.entries.values()
        ]

    def update_entry(self, site, username, password):
        site_lower = site.lower()
        if site_lower in self.entries:
            self.entries[site_lower].update({
                'username': username,
                'password': password,
                'updated_at': datetime.now().isoformat()
            })
            return True
        return False

    def delete_entry(self, site):
        site_lower = site.lower()
        if site_lower in self.entries:
            del self.entries[site_lower]
            return True
        return False

    def search_entries(self, keyword):
        keyword_lower = keyword.lower()
        results = []
        for entry in self.entries.values():
            if (keyword_lower in entry['site'].lower() or
                    keyword_lower in entry['username'].lower()):
                results.append({
                    'site': entry['site'],
                    'username': entry['username'],
                    'password': entry['password']
                })
        return results

    def check_expired(self, site):
        site_lower = site.lower()
        if site_lower not in self.entries:
            return False

        entry = self.entries[site_lower]
        updated_at = entry.get('updated_at', entry['created_at'])
        created_date = datetime.fromisoformat(updated_at)
        expiry_date = created_date + timedelta(days=self.EXPIRY_DAYS)
        return datetime.now() > expiry_date

    def export_backup(self, output_path):
        with open(output_path, 'w') as f:
            json.dump(self.entries, f, indent=2)

    def import_backup(self, input_path):
        with open(input_path, 'r') as f:
            data = json.load(f)
            self.entries.update(data)
