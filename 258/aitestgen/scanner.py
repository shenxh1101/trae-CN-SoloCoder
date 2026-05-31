import os
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class ScanResult:
    file_path: str
    language: str
    functions: List[str]
    classes: List[str]


class ProjectScanner:
    def __init__(self, root_dir: str):
        self.root_dir = root_dir
        self.supported_extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'javascript',
            '.tsx': 'javascript'
        }
        self.ignore_dirs = {
            'node_modules', '__pycache__', '.git', 'venv', 'env',
            'dist', 'build', '.next', 'tests', 'test', '__tests__'
        }
        self.ignore_files = {'__init__.py', 'setup.py', 'conftest.py'}

    def scan_file(self, file_path: str) -> Optional[ScanResult]:
        from .parser import parse_file
        
        try:
            module_info = parse_file(file_path)
            functions = [f.name for f in module_info.functions]
            classes = [c.name for c in module_info.classes]
            
            return ScanResult(
                file_path=file_path,
                language=module_info.language,
                functions=functions,
                classes=classes
            )
        except Exception as e:
            print(f"Warning: Could not scan {file_path}: {e}")
            return None

    def scan_directory(self, directory: str = None) -> List[ScanResult]:
        if directory is None:
            directory = self.root_dir
        
        results = []
        
        for root, dirs, files in os.walk(directory):
            dirs[:] = [d for d in dirs if d not in self.ignore_dirs]
            
            for file in files:
                if file in self.ignore_files:
                    continue
                
                _, ext = os.path.splitext(file)
                if ext in self.supported_extensions:
                    file_path = os.path.join(root, file)
                    result = self.scan_file(file_path)
                    if result and (result.functions or result.classes):
                        results.append(result)
        
        return results

    def get_test_file_path(self, source_file: str, output_dir: str = None, keep_structure: bool = True) -> str:
        _, ext = os.path.splitext(source_file)
        language = self.supported_extensions.get(ext)
        
        if language == 'python':
            test_filename = f"test_{os.path.basename(source_file)}"
        else:
            base = os.path.splitext(os.path.basename(source_file))[0]
            test_filename = f"{base}.test{ext}"
        
        if keep_structure and output_dir:
            rel_path = os.path.relpath(os.path.dirname(source_file), self.root_dir)
            if rel_path != '.':
                output_path = os.path.join(output_dir, rel_path, test_filename)
            else:
                output_path = os.path.join(output_dir, test_filename)
        elif output_dir:
            output_path = os.path.join(output_dir, test_filename)
        else:
            output_path = os.path.join(os.path.dirname(source_file), test_filename)
        
        return output_path

    def ensure_directory(self, file_path: str):
        directory = os.path.dirname(file_path)
        if directory:
            os.makedirs(directory, exist_ok=True)


def scan_project(root_dir: str) -> List[ScanResult]:
    scanner = ProjectScanner(root_dir)
    return scanner.scan_directory()
