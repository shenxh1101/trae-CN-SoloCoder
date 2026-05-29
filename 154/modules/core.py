import os
import struct
import math
from collections import Counter

FILE_SIGNATURES = {
    b'PK\x03\x04': 'ZIP Archive',
    b'PK\x05\x06': 'ZIP Archive (empty)',
    b'PK\x07\x08': 'ZIP Archive (spanned)',
    b'\x89PNG\r\n\x1a\n': 'PNG Image',
    b'%PDF-': 'PDF Document',
    b'ID3': 'MP3 Audio (ID3v2)',
    b'\xff\xfb': 'MP3 Audio (MPEG frame)',
    b'\xff\xf3': 'MP3 Audio (MPEG frame)',
    b'\xff\xf2': 'MP3 Audio (MPEG frame)',
    b'MZ': 'PE/COFF Executable (Windows)',
    b'\x7fELF': 'ELF Executable (Unix/Linux)',
    b'\xca\xfe\xba\xbe': 'Mach-O Universal Binary',
    b'\xfe\xed\xfa\xce': 'Mach-O 32-bit',
    b'\xfe\xed\xfa\xcf': 'Mach-O 64-bit',
    b'\xcf\xfa\xed\xfe': 'Mach-O 64-bit (ARM)',
    b'\xce\xfa\xed\xfe': 'Mach-O 32-bit (ARM)',
    b'GIF87a': 'GIF Image',
    b'GIF89a': 'GIF Image',
    b'\xff\xd8\xff': 'JPEG Image',
    b'BM': 'BMP Image',
    b'RIFF': 'RIFF/WAVE Audio',
    b'OggS': 'OGG Audio',
    b'\x1f\x8b\x08': 'GZIP Compressed',
    b'BZh': 'BZIP2 Compressed',
    b'\x78\x9c': 'ZLIB Compressed',
    b'\x78\xda': 'ZLIB Compressed (max)',
    b'\x78\x01': 'ZLIB Compressed (no)',
    b'504B0304': 'ZIP (hex string)',
}


def get_file_size(file_path):
    return os.path.getsize(file_path)


def read_file_header(file_path, num_bytes=64):
    with open(file_path, 'rb') as f:
        return f.read(num_bytes)


def bytes_to_hex(data, width=16):
    lines = []
    for i in range(0, len(data), width):
        chunk = data[i:i + width]
        hex_part = ' '.join(f'{b:02x}' for b in chunk)
        ascii_part = ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk)
        lines.append(f'{i:08x}  {hex_part:<{width * 3}}  {ascii_part}')
    return '\n'.join(lines)


def identify_file_type(header_bytes):
    for sig, ftype in sorted(FILE_SIGNATURES.items(), key=lambda x: -len(x[0])):
        if header_bytes.startswith(sig):
            return ftype, sig.hex()
    return 'Unknown', header_bytes[:8].hex()


def detect_signatures(header_bytes):
    found = []
    for sig, ftype in FILE_SIGNATURES.items():
        if sig in header_bytes:
            found.append((ftype, sig.hex(), header_bytes.index(sig)))
    return found


def calculate_entropy(data):
    if not data:
        return 0.0
    byte_counts = Counter(data)
    data_len = len(data)
    entropy = 0.0
    for count in byte_counts.values():
        p = count / data_len
        if p > 0:
            entropy -= p * math.log2(p)
    return entropy


def get_byte_distribution(data):
    counts = Counter(data)
    distribution = [0] * 256
    for byte_val, count in counts.items():
        distribution[byte_val] = count
    return distribution


def is_encrypted_or_compressed(entropy, data_len):
    if entropy > 7.5:
        return True, "High entropy (>7.5) - likely encrypted or compressed"
    elif entropy > 6.5:
        return True, "Moderate-high entropy (>6.5) - possibly encrypted or compressed"
    elif entropy < 3.0 and data_len > 1000:
        return False, "Low entropy (<3.0) - likely uncompressed data or text"
    else:
        return False, f"Entropy {entropy:.2f} - normal for mixed content"


def extract_strings(data, min_length=4):
    strings = []
    current = []
    current_offset = None
    for offset, byte in enumerate(data):
        if 32 <= byte < 127:
            if current_offset is None:
                current_offset = offset
            current.append(chr(byte))
        else:
            if len(current) >= min_length:
                strings.append((current_offset, ''.join(current)))
            current = []
            current_offset = None
    if len(current) >= min_length:
        strings.append((current_offset, ''.join(current)))
    return strings
