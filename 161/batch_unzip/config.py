from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Dict


@dataclass
class Extensions:
    images: List[str] = field(default_factory=lambda: [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', '.ico', '.heic', '.raw'
    ])
    documents: List[str] = field(default_factory=lambda: [
        '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.csv',
        '.ppt', '.pptx', '.md', '.epub', '.pages', '.numbers', '.key'
    ])
    videos: List[str] = field(default_factory=lambda: [
        '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg'
    ])
    audios: List[str] = field(default_factory=lambda: [
        '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.aiff'
    ])
    archives: List[str] = field(default_factory=lambda: [
        '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz'
    ])
    executables: List[str] = field(default_factory=lambda: [
        '.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.apk', '.bat', '.sh'
    ])
    code: List[str] = field(default_factory=lambda: [
        '.py', '.js', '.ts', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go',
        '.rs', '.rb', '.php', '.swift', '.kt', '.html', '.css', '.json', '.xml', '.yaml', '.yml'
    ])

    def get_category_map(self) -> Dict[str, str]:
        mapping = {}
        for ext in self.images:
            mapping[ext] = 'images'
        for ext in self.documents:
            mapping[ext] = 'documents'
        for ext in self.videos:
            mapping[ext] = 'videos'
        for ext in self.audios:
            mapping[ext] = 'audios'
        for ext in self.archives:
            mapping[ext] = 'archives'
        for ext in self.executables:
            mapping[ext] = 'executables'
        for ext in self.code:
            mapping[ext] = 'code'
        return mapping


@dataclass
class Config:
    source_dir: Path
    password_file: Optional[Path] = None
    password_cache_file: Path = field(default_factory=lambda: Path.home() / '.batch_unzip_passwords.json')
    output_dir: Optional[Path] = None
    extract_to_subdir: bool = True
    preview_mode: bool = False
    delete_after_extract: bool = False
    classify_files: bool = False
    exclude_patterns: List[str] = field(default_factory=list)
    exclude_extensions: List[str] = field(default_factory=list)
    threads: int = 4
    log_file: Optional[Path] = None
    report_file: Optional[Path] = None
    test_integrity: bool = False
    show_progress: bool = True
    extensions: Extensions = field(default_factory=Extensions)
    supported_extensions: List[str] = field(default_factory=lambda: ['.zip', '.rar'])

    def __post_init__(self):
        self.source_dir = Path(self.source_dir).resolve()
        if self.output_dir:
            self.output_dir = Path(self.output_dir).resolve()
        if self.password_file:
            self.password_file = Path(self.password_file).resolve()
        if self.log_file:
            self.log_file = Path(self.log_file).resolve()
        if self.report_file:
            self.report_file = Path(self.report_file).resolve()
        self.password_cache_file = Path(self.password_cache_file).resolve()
