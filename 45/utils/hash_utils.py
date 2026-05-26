import hashlib


def calculate_md5(text: str) -> str:
    text_bytes = text.encode('utf-8')
    md5_hash = hashlib.md5(text_bytes)
    return md5_hash.hexdigest()


def calculate_sha256(text: str) -> str:
    text_bytes = text.encode('utf-8')
    sha256_hash = hashlib.sha256(text_bytes)
    return sha256_hash.hexdigest()


def calculate_file_md5(filename: str) -> str:
    md5_hash = hashlib.md5()
    with open(filename, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            md5_hash.update(chunk)
    return md5_hash.hexdigest()


def calculate_file_sha256(filename: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(filename, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()
