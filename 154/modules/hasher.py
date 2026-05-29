import hashlib


def calculate_file_hash(file_path, algorithm):
    hash_obj = hashlib.new(algorithm)
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            hash_obj.update(chunk)
    return hash_obj.hexdigest()


def calculate_hashes(file_path):
    algorithms = ['md5', 'sha1', 'sha256']
    hashes = {}
    for algorithm in algorithms:
        hashes[algorithm.upper()] = calculate_file_hash(file_path, algorithm)
    return hashes
