import base64


def base64_encode(text: str) -> str:
    text_bytes = text.encode('utf-8')
    encoded_bytes = base64.b64encode(text_bytes)
    return encoded_bytes.decode('utf-8')


def base64_decode(encoded_text: str) -> str:
    try:
        encoded_bytes = encoded_text.encode('utf-8')
        decoded_bytes = base64.b64decode(encoded_bytes)
        return decoded_bytes.decode('utf-8')
    except Exception as e:
        raise ValueError(f"Base64解码失败: {e}")
