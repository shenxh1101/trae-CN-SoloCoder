import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Callable, Optional, Dict, Any
from dataclasses import dataclass, field
from pathlib import Path
import queue

from .config import Config
from .scanner import ArchiveInfo
from .extractor import Extractor, WrongPasswordError
from .reporter import Reporter
from .classifier import FileClassifier
from .password_manager import PasswordManager
from .logger import get_logger, console

logger = get_logger(__name__)


@dataclass
class ThreadResult:
    archive: ArchiveInfo
    success: bool
    integrity_passed: Optional[bool] = None


class ThreadManager:
    def __init__(self, config: Config, extractor: Extractor, reporter: Reporter,
                 password_manager: PasswordManager, classifier: Optional[FileClassifier] = None):
        self.config = config
        self.extractor = extractor
        self.reporter = reporter
        self.password_manager = password_manager
        self.classifier = classifier
        self._lock = threading.Lock()
        self._progress_queue: queue.Queue = queue.Queue()

    def process_archives(self, archives: List[ArchiveInfo]) -> List[ThreadResult]:
        results: List[ThreadResult] = []
        max_workers = min(self.config.threads, len(archives))

        logger.info(f"Starting extraction with {max_workers} thread(s)")

        with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="Extractor") as executor:
            future_to_archive = {
                executor.submit(self._process_single_archive, archive): archive
                for archive in archives
            }

            from rich.progress import (
                Progress, SpinnerColumn, BarColumn, TextColumn,
                TimeElapsedColumn, MofNCompleteColumn
            )

            with Progress(
                SpinnerColumn(),
                TextColumn("[bold blue]{task.description}"),
                BarColumn(),
                MofNCompleteColumn(),
                TimeElapsedColumn(),
                console=console,
                transient=False
            ) as progress:
                task = progress.add_task(
                    "[cyan]Extracting archives...",
                    total=len(archives)
                )

                for future in as_completed(future_to_archive):
                    archive = future_to_archive[future]
                    try:
                        result = future.result()
                        results.append(result)

                        with self._lock:
                            self.reporter.add_archive_result(result.archive)
                            if result.integrity_passed is not None:
                                self.reporter.add_integrity_result(
                                    result.archive, result.integrity_passed
                                )

                        progress.update(task, advance=1, description=f"[cyan]Processed {archive.name}")

                    except Exception as e:
                        logger.error(f"Unexpected error processing {archive.name}: {e}")
                        archive.extract_success = False
                        archive.error_message = str(e)
                        results.append(ThreadResult(archive=archive, success=False))
                        progress.update(task, advance=1)

        self.password_manager.save_cache()
        return results

    def _process_single_archive(self, archive: ArchiveInfo) -> ThreadResult:
        thread_id = threading.get_ident()
        logger.debug(f"Thread {thread_id} processing {archive.name}")

        console.print(f"[cyan]Processing:[/cyan] {archive.name}")

        integrity_passed = None

        try:
            if self.config.test_integrity:
                logger.info(f"Testing integrity of {archive.name}")
                integrity_passed = False
                integrity_error = None
                integrity_password = None

                if not archive.is_encrypted:
                    passed, error = self.extractor.test_integrity(archive, None)
                    integrity_passed = passed
                    integrity_error = error
                else:
                    for password in self.password_manager.iterate_passwords(archive.path):
                        try:
                            passed, error = self.extractor.test_integrity(archive, password)
                            if passed:
                                integrity_passed = True
                                integrity_password = password
                                break
                            else:
                                integrity_error = error
                        except WrongPasswordError:
                            continue
                        except Exception as e:
                            integrity_error = str(e)
                            continue

                if not integrity_passed:
                    logger.warning(f"Integrity test failed for {archive.name}: {integrity_error}")
                    archive.error_message = f"Integrity test failed: {integrity_error}"
                    archive.extract_success = False
                    return ThreadResult(archive=archive, success=False, integrity_passed=False)
                else:
                    if integrity_password:
                        self.password_manager.cache_password(archive.path, integrity_password)
                    logger.info(f"Integrity test passed for {archive.name}")

            success = self.extractor.try_extract(archive)

            if success:
                console.print(f"[green]✓ Successfully extracted:[/green] {archive.name}")

                if self.config.classify_files and self.classifier:
                    output_dir = self.extractor.get_output_dir(archive)
                    logger.info(f"Classifying files in {output_dir}")
                    stats = self.classifier.classify_directory(output_dir)
                    logger.debug(f"Classification stats: {stats.moved_files} files moved")

                if self.config.delete_after_extract:
                    self.extractor.delete_archive(archive)
            else:
                console.print(f"[red]✗ Failed to extract:[/red] {archive.name}")

            return ThreadResult(
                archive=archive,
                success=success,
                integrity_passed=integrity_passed
            )

        except Exception as e:
            logger.error(f"Error in thread processing {archive.name}: {e}", exc_info=True)
            archive.extract_success = False
            archive.error_message = str(e)
            return ThreadResult(
                archive=archive,
                success=False,
                integrity_passed=integrity_passed
            )
