import math
from collections import Counter


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
    elif entropy < 3.0:
        return False, "Low entropy (<3.0) - likely uncompressed data or text"
    else:
        return False, f"Entropy {entropy:.2f} - normal for mixed content"
