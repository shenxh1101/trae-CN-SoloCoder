import os
from pathlib import Path
from typing import Optional


def extract_from_pdf(pdf_path: str) -> str:
    try:
        import pdfplumber
    except ImportError:
        raise ImportError(
            "pdfplumber is required for PDF extraction. "
            "Install it with: pip install pdfplumber"
        )

    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    full_text = "\n\n".join(text_parts)
    if not full_text.strip():
        raise ValueError(f"No text could be extracted from {pdf_path}")
    return full_text


def extract_from_txt(txt_path: str) -> str:
    path = Path(txt_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {txt_path}")
    encodings = ["utf-8", "utf-8-sig", "latin-1", "gbk", "gb2312"]
    for enc in encodings:
        try:
            return path.read_text(encoding=enc)
        except (UnicodeDecodeError, UnicodeError):
            continue
    raise ValueError(f"Could not decode file {txt_path} with any supported encoding")


def extract_text(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_from_pdf(file_path)
    elif suffix in (".txt", ".text", ".md", ".markdown"):
        return extract_from_txt(file_path)
    else:
        return extract_from_txt(file_path)


def find_papers_in_dir(dir_path: str, recursive: bool = False) -> list[str]:
    path = Path(dir_path)
    if not path.is_dir():
        raise NotADirectoryError(f"Not a directory: {dir_path}")
    extensions = {".pdf", ".txt", ".text", ".md", ".markdown"}
    pattern = "**/*" if recursive else "*"
    papers = []
    for p in path.glob(pattern):
        if p.is_file() and p.suffix.lower() in extensions:
            papers.append(str(p))
    papers.sort()
    return papers
