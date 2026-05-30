import os
import fnmatch
from typing import List, Optional
from .processor import Processor, AnnotationResult
from .parsers import ParserFactory


class BatchProcessor:
    def __init__(self, processor: Processor, ignore_patterns: List[str] = None):
        self.processor = processor
        self.ignore_patterns = ignore_patterns or []
        self.default_ignores = [
            'node_modules', '.git', '__pycache__', '.venv', 'venv',
            'dist', 'build', '.idea', '.vscode', 'target',
            '*.min.js', '*.min.css', '*.pyc', '*.class',
        ]

    def process_directory(self, directory: str, output_dir: str = None,
                          recursive: bool = True) -> List[AnnotationResult]:
        if not os.path.isdir(directory):
            raise NotADirectoryError(f"Not a directory: {directory}")

        results = []
        files = self._collect_files(directory, recursive)

        for file_path in files:
            try:
                if output_dir:
                    rel_path = os.path.relpath(file_path, directory)
                    out_path = os.path.join(output_dir, rel_path)
                else:
                    base, ext = os.path.splitext(file_path)
                    out_path = f"{base}_annotated{ext}"

                result = self.processor.process_file(file_path, out_path)
                if result:
                    results.append(result)
            except Exception as e:
                print(f"Error processing {file_path}: {e}")

        return results

    def _collect_files(self, directory: str, recursive: bool) -> List[str]:
        files = []
        all_ignores = self.default_ignores + self.ignore_patterns

        if recursive:
            for root, dirs, filenames in os.walk(directory):
                dirs[:] = [d for d in dirs if not self._should_ignore(d, all_ignores)]

                if self._should_ignore(os.path.basename(root), all_ignores):
                    continue

                for filename in filenames:
                    if self._should_ignore(filename, all_ignores):
                        continue
                    full_path = os.path.join(root, filename)
                    if ParserFactory.is_supported(full_path):
                        files.append(full_path)
        else:
            for filename in os.listdir(directory):
                if self._should_ignore(filename, all_ignores):
                    continue
                full_path = os.path.join(directory, filename)
                if os.path.isfile(full_path) and ParserFactory.is_supported(full_path):
                    files.append(full_path)

        return sorted(files)

    def _should_ignore(self, name: str, patterns: List[str]) -> bool:
        for pattern in patterns:
            if fnmatch.fnmatch(name, pattern):
                return True
            if name == pattern:
                return True
        return False
