import os

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
