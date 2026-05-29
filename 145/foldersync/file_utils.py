import hashlib
import os
import fnmatch
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Set


@dataclass
class FileInfo:
    rel_path: str
    abs_path: str
    size: int
    mtime: float
    md5: Optional[str] = field(default=None)

    def compute_md5(self, chunk_size: int = 8192) -> str:
        if self.md5 is not None:
            return self.md5
        h = hashlib.md5()
        with open(self.abs_path, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                h.update(chunk)
        self.md5 = h.hexdigest()
        return self.md5


def compute_file_md5(filepath: str, chunk_size: int = 8192) -> str:
    h = hashlib.md5()
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def should_exclude(rel_path: str, name: str, excludes: List[str]) -> bool:
    for pattern in excludes:
        if fnmatch.fnmatch(name, pattern):
            return True
        if fnmatch.fnmatch(rel_path, pattern):
            return True
        if "/" in pattern:
            if fnmatch.fnmatch(rel_path, pattern):
                return True
    return False


def should_include_extension(name: str, extensions: Optional[List[str]]) -> bool:
    if not extensions:
        return True
    _, ext = os.path.splitext(name)
    return ext.lower() in [e.lower() for e in extensions]


def scan_directory(
    root: str,
    excludes: Optional[List[str]] = None,
    extensions: Optional[List[str]] = None,
    compute_md5s: bool = False,
    since_time: Optional[float] = None,
    max_workers: int = 4,
) -> dict:
    if excludes is None:
        excludes = []
    result = {}
    root_path = Path(root).resolve()

    if not root_path.exists():
        return result

    file_list = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d for d in dirnames
            if not should_exclude(
                os.path.relpath(os.path.join(dirpath, d), root), d, excludes
            )
        ]
        for fname in filenames:
            abs_fpath = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(abs_fpath, root)
            if should_exclude(rel_path, fname, excludes):
                continue
            if not should_include_extension(fname, extensions):
                continue
            file_list.append((abs_fpath, rel_path))

    def process_file(item):
        abs_fpath, rel_path = item
        try:
            stat = os.stat(abs_fpath)
            if since_time is not None and stat.st_mtime <= since_time:
                return rel_path, None
            fi = FileInfo(
                rel_path=rel_path,
                abs_path=abs_fpath,
                size=stat.st_size,
                mtime=stat.st_mtime,
            )
            if compute_md5s:
                fi.compute_md5()
            return rel_path, fi
        except (OSError, PermissionError):
            return rel_path, None

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_file, item): item for item in file_list}
        for future in as_completed(futures):
            rel_path, fi = future.result()
            if fi is not None:
                result[rel_path] = fi

    return result


def get_all_subdirs(root: str, excludes: Optional[List[str]] = None) -> Set[str]:
    if excludes is None:
        excludes = []
    dirs = set()
    root_path = Path(root).resolve()
    if not root_path.exists():
        return dirs
    for dirpath, dirnames, _ in os.walk(root):
        filtered = []
        for d in dirnames:
            rel = os.path.relpath(os.path.join(dirpath, d), root)
            if not should_exclude(rel, d, excludes):
                filtered.append(d)
                dirs.add(rel)
        dirnames[:] = filtered
    return dirs


def ensure_directory(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def copy_file(src: str, dst: str) -> None:
    ensure_directory(os.path.dirname(dst))
    with open(src, "rb") as fsrc:
        with open(dst, "wb") as fdst:
            while True:
                chunk = fsrc.read(8192)
                if not chunk:
                    break
                fdst.write(chunk)


def delete_file(path: str) -> None:
    if os.path.exists(path):
        os.remove(path)


def remove_empty_dirs(root: str, excludes: Optional[List[str]] = None) -> List[str]:
    if excludes is None:
        excludes = []
    removed = []
    for dirpath, dirnames, filenames in os.walk(root, topdown=False):
        rel = os.path.relpath(dirpath, root)
        if rel == ".":
            continue
        if should_exclude(rel, os.path.basename(dirpath), excludes):
            continue
        try:
            if not os.listdir(dirpath):
                os.rmdir(dirpath)
                removed.append(rel)
        except OSError:
            pass
    return removed
