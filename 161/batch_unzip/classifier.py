import shutil
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field

from .config import Config
from .logger import get_logger

logger = get_logger(__name__)


@dataclass
class ClassificationStats:
    total_files: int = 0
    moved_files: int = 0
    skipped_files: int = 0
    by_category: Dict[str, int] = field(default_factory=dict)

    def increment_category(self, category: str) -> None:
        self.by_category[category] = self.by_category.get(category, 0) + 1


class FileClassifier:
    def __init__(self, config: Config):
        self.config = config
        self.category_map = config.extensions.get_category_map()

    def classify_directory(self, directory: Path) -> ClassificationStats:
        stats = ClassificationStats()

        if not directory.exists() or not directory.is_dir():
            logger.warning(f"Directory does not exist: {directory}")
            return stats

        logger.info(f"Classifying files in: {directory}")

        for file_path in directory.rglob('*'):
            if not file_path.is_file():
                continue

            stats.total_files += 1

            category = self._get_category(file_path)
            if category:
                if self._move_file(file_path, directory, category):
                    stats.moved_files += 1
                    stats.increment_category(category)
                else:
                    stats.skipped_files += 1
            else:
                stats.skipped_files += 1

        self._cleanup_empty_dirs(directory)

        logger.info(f"Classification complete: {stats.moved_files} moved, {stats.skipped_files} skipped")
        return stats

    def _get_category(self, file_path: Path) -> Optional[str]:
        suffix = file_path.suffix.lower()
        return self.category_map.get(suffix)

    def _move_file(self, file_path: Path, base_dir: Path, category: str) -> bool:
        target_dir = base_dir / category
        target_path = target_dir / file_path.name

        if target_path.exists():
            target_path = self._resolve_conflict(target_path)

        try:
            target_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(file_path), str(target_path))
            logger.debug(f"Moved {file_path.name} -> {category}/")
            return True
        except Exception as e:
            logger.warning(f"Failed to move {file_path.name}: {e}")
            return False

    @staticmethod
    def _resolve_conflict(target_path: Path) -> Path:
        stem = target_path.stem
        suffix = target_path.suffix
        parent = target_path.parent
        counter = 1

        while True:
            new_path = parent / f"{stem}_{counter}{suffix}"
            if not new_path.exists():
                return new_path
            counter += 1

    def _cleanup_empty_dirs(self, base_dir: Path) -> None:
        for dir_path in sorted(base_dir.rglob('*'), key=lambda p: -len(p.parts)):
            if dir_path.is_dir() and dir_path != base_dir:
                try:
                    if not any(dir_path.iterdir()):
                        dir_path.rmdir()
                        logger.debug(f"Removed empty directory: {dir_path}")
                except Exception as e:
                    logger.debug(f"Failed to remove directory {dir_path}: {e}")
