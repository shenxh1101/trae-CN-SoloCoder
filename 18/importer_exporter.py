import csv
import io
import json
from typing import List, Dict, Any
from crypto import CryptoManager
from models import PasswordEntry


class ImportExportManager:
    def __init__(self, crypto: CryptoManager):
        self.crypto = crypto

    def export_to_encrypted_csv(
        self,
        entries: List[PasswordEntry],
        master_password: str,
        output_file: str,
    ) -> bool:
        try:
            csv_data = self._entries_to_csv(entries)
            encrypted = self.crypto.encrypt_data({"csv_data": csv_data}, master_password)
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(encrypted, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"导出失败: {e}")
            return False

    def import_from_encrypted_csv(
        self,
        input_file: str,
        master_password: str,
    ) -> List[PasswordEntry]:
        try:
            with open(input_file, "r", encoding="utf-8") as f:
                encrypted = json.load(f)
            decrypted = self.crypto.decrypt_data(encrypted, master_password)
            csv_data = decrypted.get("csv_data", "")
            return self._csv_to_entries(csv_data)
        except Exception as e:
            print(f"导入失败: {e}")
            return []

    def _entries_to_csv(self, entries: List[PasswordEntry]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "website", "username", "password", "notes",
            "custom_fields", "expiration_date", "created_at", "updated_at"
        ])
        for entry in entries:
            custom_fields_json = json.dumps(entry.custom_fields, ensure_ascii=False)
            writer.writerow([
                entry.website,
                entry.username,
                entry.password,
                entry.notes,
                custom_fields_json,
                entry.expiration_date or "",
                entry.created_at,
                entry.updated_at,
            ])
        return output.getvalue()

    def _csv_to_entries(self, csv_data: str) -> List[PasswordEntry]:
        entries = []
        input_io = io.StringIO(csv_data)
        reader = csv.DictReader(input_io)
        for row in reader:
            try:
                custom_fields = json.loads(row.get("custom_fields", "{}"))
            except (json.JSONDecodeError, KeyError):
                custom_fields = {}

            entry = PasswordEntry(
                website=row.get("website", ""),
                username=row.get("username", ""),
                password=row.get("password", ""),
                notes=row.get("notes", ""),
                custom_fields=custom_fields,
                expiration_date=row.get("expiration_date") or None,
                created_at=row.get("created_at"),
                updated_at=row.get("updated_at"),
            )
            entries.append(entry)
        return entries

    def export_to_plain_csv(
        self,
        entries: List[PasswordEntry],
        output_file: str,
    ) -> bool:
        try:
            with open(output_file, "w", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "website", "username", "password", "notes",
                    "custom_fields", "expiration_date"
                ])
                for entry in entries:
                    custom_fields_json = json.dumps(entry.custom_fields, ensure_ascii=False)
                    writer.writerow([
                        entry.website,
                        entry.username,
                        entry.password,
                        entry.notes,
                        custom_fields_json,
                        entry.expiration_date or "",
                    ])
            return True
        except Exception as e:
            print(f"导出失败: {e}")
            return False

    def import_from_plain_csv(self, input_file: str) -> List[PasswordEntry]:
        entries = []
        try:
            with open(input_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    try:
                        custom_fields = json.loads(row.get("custom_fields", "{}"))
                    except (json.JSONDecodeError, KeyError):
                        custom_fields = {}

                    entry = PasswordEntry(
                        website=row.get("website", ""),
                        username=row.get("username", ""),
                        password=row.get("password", ""),
                        notes=row.get("notes", ""),
                        custom_fields=custom_fields,
                        expiration_date=row.get("expiration_date") or None,
                    )
                    entries.append(entry)
        except Exception as e:
            print(f"导入失败: {e}")
        return entries
