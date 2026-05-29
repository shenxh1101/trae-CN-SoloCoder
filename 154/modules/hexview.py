def hex_view(data, offset=0, length=None, width=16):
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError("data must be bytes or bytearray")
    
    if length is None:
        length = len(data) - offset
    
    end = min(offset + length, len(data))
    lines = []
    
    for i in range(offset, end, width):
        hex_offset = f"{i:08x}"
        chunk = data[i:min(i + width, end)]
        
        hex_parts = []
        ascii_parts = []
        
        for j in range(width):
            if j < len(chunk):
                byte = chunk[j]
                hex_parts.append(f"{byte:02x}")
                ascii_parts.append(chr(byte) if 32 <= byte < 127 else '.')
            else:
                hex_parts.append("  ")
                ascii_parts.append(" ")
        
        hex_str = " ".join(hex_parts)
        ascii_str = "".join(ascii_parts)
        
        line = f"{hex_offset}  {hex_str}  {ascii_str}"
        lines.append(line)
    
    return lines


def paginate_hex_view(data, page_size=256, width=16):
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError("data must be bytes or bytearray")
    
    total = len(data)
    offset = 0
    
    while offset < total:
        page_length = min(page_size, total - offset)
        yield hex_view(data, offset=offset, length=page_length, width=width)
        offset += page_length
