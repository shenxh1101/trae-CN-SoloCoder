import fnmatch
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass, field

from .config import Config
from .logger import get_logger

logger = get_logger(__name__)


@dataclass
class ArchiveInfo:
    path: Path
    file_type: str
    size: int
    is_encrypted: Optional[bool] = None
    file_count: Optional[int] = None
    file_list: List[str] = field(default_factory=list)
    password_attempts: int = 0
    correct_password: Optional[str] = None
    extract_success: Optional[bool] = None
    error_message: Optional[str] = None

    @property
    def name(self) -> str:
        return self.path.name

    @property
    def stem(self) -> str:
        return self.path.stem


class ArchiveScanner:
    def __init__(self, config: Config):
        self.config = config

    def scan(self) -> List[ArchiveInfo]:
        archives = []
        source_dir = self.config.source_dir

        if not source_dir.exists():
            logger.error(f"Source directory does not exist: {source_dir}")
            return archives

        if not source_dir.is_dir():
            logger.error(f"Path is not a directory: {source_dir}")
            return archives

        logger.info(f"Scanning directory: {source_dir}")

        for file_path in source_dir.rglob('*'):
            if not file_path.is_file():
                continue

            if not self._is_supported_extension(file_path):
                continue

            if self._is_excluded(file_path):
                logger.debug(f"Excluded by pattern: {file_path.name}")
                continue

            file_type = file_path.suffix.lower()
            archive_info = ArchiveInfo(
                path=file_path,
                file_type=file_type,
                size=file_path.stat().st_size
            )
            archives.append(archive_info)

        logger.info(f"Found {len(archives)} archive(s)")
        return archives

    def _is_supported_extension(self, file_path: Path) -> bool:
        suffix = file_path.suffix.lower()
        return suffix in self.config.supported_extensions

    def _is_excluded(self, file_path: Path) -> bool:
        name = file_path.name
        suffix = file_path.suffix.lower()

        for pattern in self.config.exclude_patterns:
            if fnmatch.fnmatch(name, pattern):
                return True

        for ext in self.config.exclude_extensions:
            if not ext.startswith('.'):
                ext = '.' + ext
            if suffix == ext.lower():
                return True

        return False

    def preview(self, archives: List[ArchiveInfo]) -> None:
        from rich.table import Table
        from rich.console import Console

        console = Console()

        table = Table(title="Archive Preview")
        table.add_column("File", style="cyan")
        table.add_column("Type", style="green")
        table.add_column("Size", justify="right", style="magenta")
        table.add_column("Encrypted", style="yellow")
        table.add_column("Files", justify="right", style="blue")

        for archive in archives:
            size_str = self._format_size(archive.size)
            encrypted_str = "Unknown" if archive.is_encrypted is None else (
                "[red]Yes[/red]" if archive.is_encrypted else "[green]No[/green]"
            )
            file_count_str = str(archive.file_count) if archive.file_count is not None else "?"

            table.add_row(
                archive.name,
                archive.file_type.upper(),
                size_str,
                encrypted_str,
                file_count_str
            )

        console.print(table)

        if any(a.file_list for a in archives):
            console.print("\n[bold]File contents:[/bold]")
            for archive in archives:
                if archive.file_list:
                    console.print(f"\n[cyan]{archive.name}[/cyan]:")
                    for file_name in archive.file_list[:20]:
                        console.print(f"  - {file_name}")
                    if len(archive.file_list) > 20:
                        console.print(f"  ... and {len(archive.file_list) - 20} more files")

    @staticmethod
    def _format_size(size_bytes: int) -> str:
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"
