import zipfile
import os
import shutil
import subprocess
import json
from pathlib import Path
from typing import Optional, Callable, List, Tuple, Dict, Any
from tqdm import tqdm

from .config import Config
from .scanner import ArchiveInfo
from .password_manager import PasswordManager
from .logger import get_logger

logger = get_logger(__name__)


class ExtractionError(Exception):
    pass


class PasswordRequiredError(ExtractionError):
    pass


class WrongPasswordError(ExtractionError):
    pass


class UnarBackend:
    LSAR_BIN = 'lsar'
    UNAR_BIN = 'unar'

    @classmethod
    def is_available(cls) -> bool:
        try:
            subprocess.run([cls.LSAR_BIN, '--version'], capture_output=True, check=False)
            subprocess.run([cls.UNAR_BIN, '--version'], capture_output=True, check=False)
            return True
        except (FileNotFoundError, Exception):
            return False

    @classmethod
    def list_archive(cls, archive_path: Path, password: Optional[str] = None) -> Dict[str, Any]:
        cmd = [cls.LSAR_BIN, '-json', str(archive_path)]
        if password:
            cmd.extend(['-p', password])

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if result.returncode != 0:
                stderr = result.stderr.strip()
                if 'password' in stderr.lower() or 'encrypted' in stderr.lower():
                    raise PasswordRequiredError("Password required for listing")
                raise ExtractionError(f"lsar failed: {stderr or result.stdout}")

            return json.loads(result.stdout)
        except json.JSONDecodeError as e:
            raise ExtractionError(f"Failed to parse lsar output: {e}")
        except FileNotFoundError:
            raise ExtractionError("lsar not found")

    @classmethod
    def test_integrity(cls, archive_path: Path, password: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        cmd = [cls.LSAR_BIN, '-test', str(archive_path)]
        if password:
            cmd.extend(['-p', password])

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            output = result.stdout + result.stderr

            if result.returncode == 0:
                import re
                match = re.search(r'(\d+)\s+passed,\s+(\d+)\s+failed', output.lower())
                if match:
                    failed_count = int(match.group(2))
                    if failed_count > 0:
                        return False, output.strip()
                return True, None
            else:
                if 'password' in output.lower() or 'encrypted' in output.lower():
                    raise WrongPasswordError("Wrong password or password required")
                return False, output.strip()
        except FileNotFoundError:
            raise ExtractionError("lsar not found")

    @classmethod
    def extract(cls, archive_path: Path, output_dir: Path,
                password: Optional[str] = None,
                exclude_patterns: Optional[List[str]] = None,
                exclude_extensions: Optional[List[str]] = None,
                show_progress: bool = True) -> Tuple[bool, Optional[str]]:
        output_dir.mkdir(parents=True, exist_ok=True)

        cmd = [cls.UNAR_BIN, '-D', '-f', '-o', str(output_dir), str(archive_path)]
        if password:
            cmd.extend(['-p', password])

        try:
            if show_progress:
                result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            else:
                result = subprocess.run(cmd, capture_output=True, text=True, check=False)

            output = result.stdout + result.stderr

            if result.returncode == 0:
                if 'successfully' in output.lower() or 'ok' in output.lower():
                    cls._apply_exclusions(output_dir, exclude_patterns, exclude_extensions)
                    return True, None
                return False, output.strip()
            else:
                if 'password' in output.lower() or 'encrypted' in output.lower():
                    raise WrongPasswordError(f"Wrong password: {output.strip()}")
                return False, output.strip()
        except FileNotFoundError:
            raise ExtractionError("unar not found")

    @staticmethod
    def _apply_exclusions(output_dir: Path,
                          exclude_patterns: Optional[List[str]],
                          exclude_extensions: Optional[List[str]]) -> None:
        import fnmatch

        if not exclude_patterns and not exclude_extensions:
            return

        exclude_extensions_lower = set()
        if exclude_extensions:
            for ext in exclude_extensions:
                if not ext.startswith('.'):
                    ext = '.' + ext
                exclude_extensions_lower.add(ext.lower())

        for file_path in output_dir.rglob('*'):
            if not file_path.is_file():
                continue

            name = file_path.name
            suffix = file_path.suffix.lower()

            should_exclude = False

            if exclude_patterns:
                for pattern in exclude_patterns:
                    if fnmatch.fnmatch(name, pattern):
                        should_exclude = True
                        break

            if not should_exclude and exclude_extensions_lower:
                if suffix in exclude_extensions_lower:
                    should_exclude = True

            if should_exclude:
                try:
                    file_path.unlink()
                    logger.debug(f"Excluded file: {file_path}")
                except Exception as e:
                    logger.debug(f"Failed to exclude {file_path}: {e}")


class Extractor:
    def __init__(self, config: Config, password_manager: PasswordManager):
        self.config = config
        self.password_manager = password_manager
        self._unar_available = UnarBackend.is_available()

    def get_output_dir(self, archive: ArchiveInfo) -> Path:
        if self.config.output_dir:
            base_dir = self.config.output_dir
        else:
            base_dir = archive.path.parent

        if self.config.extract_to_subdir:
            return base_dir / archive.stem
        return base_dir

    def probe_archive(self, archive: ArchiveInfo) -> None:
        try:
            if archive.file_type == '.zip':
                self._probe_zip(archive)
            elif archive.file_type == '.rar':
                self._probe_rar_unar(archive)
            else:
                raise ExtractionError(f"Unsupported archive type: {archive.file_type}")
        except Exception as e:
            logger.debug(f"Failed to probe {archive.name}: {e}")
            archive.is_encrypted = None
            archive.file_count = None

    def _probe_zip(self, archive: ArchiveInfo) -> None:
        try:
            with zipfile.ZipFile(archive.path, 'r') as zf:
                archive.file_count = len(zf.infolist())
                archive.file_list = [info.filename for info in zf.infolist()]

                encrypted = False
                for info in zf.infolist():
                    if info.flag_bits & 0x1:
                        encrypted = True
                        break

                if not encrypted:
                    try:
                        first_file = next((f for f in zf.infolist() if not f.is_dir()), None)
                        if first_file:
                            with zf.open(first_file) as f:
                                f.read(1)
                    except RuntimeError as e:
                        if 'password' in str(e).lower():
                            encrypted = True

                archive.is_encrypted = encrypted
        except Exception as e:
            raise ExtractionError(f"ZIP probe failed: {e}")

    def _probe_rar_unar(self, archive: ArchiveInfo) -> None:
        if not self._unar_available:
            raise ExtractionError("unar/lsar not available for RAR support")

        try:
            try:
                info = UnarBackend.list_archive(archive.path)
                archive.file_count = len(info.get('lsarContents', []))
                archive.file_list = [f.get('XADFileName', '') for f in info.get('lsarContents', [])]

                encrypted = any(f.get('XADIsEncrypted', False) for f in info.get('lsarContents', []))
                archive.is_encrypted = encrypted
            except PasswordRequiredError:
                archive.is_encrypted = True
                archive.file_count = None
                archive.file_list = []
        except Exception as e:
            raise ExtractionError(f"RAR probe failed: {e}")

    def test_integrity(self, archive: ArchiveInfo, password: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        try:
            if archive.file_type == '.zip':
                return self._test_zip_integrity(archive, password)
            elif archive.file_type == '.rar':
                return self._test_rar_integrity_unar(archive, password)
            else:
                return False, f"Unsupported archive type: {archive.file_type}"
        except WrongPasswordError:
            raise
        except Exception as e:
            return False, str(e)

    def _test_zip_integrity(self, archive: ArchiveInfo, password: Optional[str]) -> Tuple[bool, Optional[str]]:
        try:
            with zipfile.ZipFile(archive.path, 'r') as zf:
                if password:
                    zf.setpassword(password.encode('utf-8'))

                result = zf.testzip()
                if result is None:
                    return True, None
                else:
                    return False, f"Corrupted file detected: {result}"
        except RuntimeError as e:
            if 'password' in str(e).lower():
                raise WrongPasswordError(f"Wrong password: {e}")
            return False, str(e)
        except Exception as e:
            return False, str(e)

    def _test_rar_integrity_unar(self, archive: ArchiveInfo, password: Optional[str]) -> Tuple[bool, Optional[str]]:
        if not self._unar_available:
            raise ExtractionError("unar/lsar not available for RAR support")

        try:
            return UnarBackend.test_integrity(archive.path, password)
        except WrongPasswordError:
            raise
        except Exception as e:
            return False, str(e)

    def try_extract(self, archive: ArchiveInfo,
                    progress_callback: Optional[Callable[[int, int, str], None]] = None) -> bool:
        output_dir = self.get_output_dir(archive)
        output_dir.mkdir(parents=True, exist_ok=True)

        passwords_tried = 0
        correct_password = None

        if not archive.is_encrypted:
            try:
                if self._extract_with_password(archive, output_dir, None, progress_callback):
                    archive.extract_success = True
                    archive.password_attempts = 0
                    return True
            except PasswordRequiredError:
                logger.info(f"{archive.name} appears to be encrypted despite probe result")
                archive.is_encrypted = True

        if archive.is_encrypted:
            for password in self.password_manager.iterate_passwords(archive.path):
                passwords_tried += 1
                try:
                    if self._extract_with_password(archive, output_dir, password, progress_callback):
                        correct_password = password
                        break
                except WrongPasswordError:
                    continue
                except Exception as e:
                    logger.debug(f"Password attempt {passwords_tried} failed for {archive.name}: {e}")
                    continue

            archive.password_attempts = passwords_tried

            if correct_password:
                archive.correct_password = correct_password
                archive.extract_success = True
                self.password_manager.cache_password(archive.path, correct_password)
                logger.info(f"Successfully extracted {archive.name} with password #{passwords_tried}")
                return True
            else:
                archive.extract_success = False
                archive.error_message = f"Failed to find correct password after {passwords_tried} attempts"
                logger.error(f"{archive.error_message}")
                return False

        archive.extract_success = False
        archive.error_message = "Extraction failed for unknown reason"
        return False

    def _extract_with_password(self, archive: ArchiveInfo, output_dir: Path,
                               password: Optional[str],
                               progress_callback: Optional[Callable[[int, int, str], None]]) -> bool:
        if archive.file_type == '.zip':
            return self._extract_zip(archive, output_dir, password, progress_callback)
        elif archive.file_type == '.rar':
            return self._extract_rar_unar(archive, output_dir, password, progress_callback)
        else:
            raise ExtractionError(f"Unsupported archive type: {archive.file_type}")

    def _extract_zip(self, archive: ArchiveInfo, output_dir: Path,
                     password: Optional[str],
                     progress_callback: Optional[Callable[[int, int, str], None]]) -> bool:
        try:
            with zipfile.ZipFile(archive.path, 'r') as zf:
                if password:
                    zf.setpassword(password.encode('utf-8'))

                members = zf.infolist()
                total_size = sum(m.file_size for m in members)
                extracted_size = 0

                for member in members:
                    if self._is_excluded_member(member.filename):
                        continue

                    try:
                        member_path = output_dir / member.filename
                        if member.is_dir():
                            member_path.mkdir(parents=True, exist_ok=True)
                            continue

                        member_path.parent.mkdir(parents=True, exist_ok=True)

                        with zf.open(member) as source, open(member_path, 'wb') as target:
                            if self.config.show_progress and total_size > 0:
                                with tqdm(total=member.file_size, unit='B', unit_scale=True,
                                          desc=f"  {member.filename[:40]}", leave=False) as pbar:
                                    while True:
                                        chunk = source.read(1024 * 1024)
                                        if not chunk:
                                            break
                                        target.write(chunk)
                                        pbar.update(len(chunk))
                                        extracted_size += len(chunk)
                                        if progress_callback:
                                            progress_callback(extracted_size, total_size, member.filename)
                            else:
                                shutil.copyfileobj(source, target)
                                extracted_size += member.file_size
                                if progress_callback:
                                    progress_callback(extracted_size, total_size, member.filename)

                    except RuntimeError as e:
                        if 'password' in str(e).lower():
                            raise WrongPasswordError(str(e))
                        raise
                    except Exception as e:
                        logger.warning(f"Failed to extract {member.filename}: {e}")
                        raise

            return True
        except (PasswordRequiredError, WrongPasswordError):
            raise
        except zipfile.BadZipFile as e:
            raise ExtractionError(f"Corrupted ZIP file: {e}")
        except Exception as e:
            raise ExtractionError(f"ZIP extraction failed: {e}")

    def _extract_rar_unar(self, archive: ArchiveInfo, output_dir: Path,
                          password: Optional[str],
                          progress_callback: Optional[Callable[[int, int, str], None]]) -> bool:
        if not self._unar_available:
            raise ExtractionError("unar/lsar not available for RAR support")

        try:
            success, error = UnarBackend.extract(
                archive.path,
                output_dir,
                password=password,
                exclude_patterns=self.config.exclude_patterns,
                exclude_extensions=self.config.exclude_extensions,
                show_progress=self.config.show_progress
            )

            if not success:
                if error and ('password' in error.lower() or 'encrypted' in error.lower()):
                    raise WrongPasswordError(error)
                raise ExtractionError(error or "RAR extraction failed")

            return True
        except WrongPasswordError:
            raise
        except Exception as e:
            raise ExtractionError(f"RAR extraction failed: {e}")

    def _is_excluded_member(self, filename: str) -> bool:
        import fnmatch
        name = Path(filename).name
        suffix = Path(filename).suffix.lower()

        for pattern in self.config.exclude_patterns:
            if fnmatch.fnmatch(name, pattern):
                return True

        for ext in self.config.exclude_extensions:
            if not ext.startswith('.'):
                ext = '.' + ext
            if suffix == ext.lower():
                return True

        return False

    def delete_archive(self, archive: ArchiveInfo) -> bool:
        try:
            archive.path.unlink()
            logger.info(f"Deleted original archive: {archive.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete {archive.name}: {e}")
            return False
