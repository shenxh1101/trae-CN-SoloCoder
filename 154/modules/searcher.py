import re


def hex_pattern_to_bytes(hex_pattern):
    if not isinstance(hex_pattern, str):
        raise TypeError("hex_pattern must be a string")
    
    cleaned = re.sub(r'[\s,:\-]+', '', hex_pattern)
    
    if len(cleaned) % 2 != 0:
        raise ValueError("hex_pattern must have an even number of hex characters")
    
    if not re.match(r'^[0-9a-fA-F]*$', cleaned):
        raise ValueError("hex_pattern contains invalid hex characters")
    
    return bytes.fromhex(cleaned)


def search_hex_pattern(data, hex_pattern):
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError("data must be bytes or bytearray")
    
    pattern_bytes = hex_pattern_to_bytes(hex_pattern)
    
    if not pattern_bytes:
        return []
    
    offsets = []
    start = 0
    pattern_len = len(pattern_bytes)
    
    while True:
        pos = data.find(pattern_bytes, start)
        if pos == -1:
            break
        offsets.append(pos)
        start = pos + 1
    
    return offsets


def search_string(data, search_str, case_sensitive=True):
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError("data must be bytes or bytearray")
    
    if not isinstance(search_str, str):
        raise TypeError("search_str must be a string")
    
    if not search_str:
        return []
    
    if case_sensitive:
        search_bytes = search_str.encode('utf-8')
        search_data = data
    else:
        search_bytes = search_str.lower().encode('utf-8')
        search_data = data.lower()
    
    results = []
    start = 0
    search_len = len(search_bytes)
    
    while True:
        pos = search_data.find(search_bytes, start)
        if pos == -1:
            break
        
        try:
            end_pos = pos
            while end_pos < len(data):
                try:
                    decoded = data[pos:end_pos + 1].decode('utf-8')
                    if decoded == search_str or (not case_sensitive and decoded.lower() == search_str.lower()):
                        actual_str = decoded
                        break
                except UnicodeDecodeError:
                    pass
                end_pos += 1
            else:
                actual_str = data[pos:pos + search_len].decode('utf-8', errors='replace')
        except Exception:
            actual_str = data[pos:pos + search_len].decode('utf-8', errors='replace')
        
        results.append((pos, actual_str))
        start = pos + 1
    
    return results
