def extract_strings(data, min_length=4):
    strings = []
    current = []
    current_offset = None
    for offset, byte in enumerate(data):
        if 32 <= byte <= 126:
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
