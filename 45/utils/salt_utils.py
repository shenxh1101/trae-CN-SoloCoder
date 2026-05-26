import random
import string


SALT_LENGTH = 16
SALT_DELIMITER = '::'


def _generate_salt(length: int = SALT_LENGTH) -> str:
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


def add_salt(ciphertext: str, salt: str = None) -> str:
    if salt is None:
        salt = _generate_salt()
    return f"{salt}{SALT_DELIMITER}{ciphertext}"


def extract_salt(salted_ciphertext: str) -> tuple:
    if SALT_DELIMITER not in salted_ciphertext:
        return salted_ciphertext, None
    
    parts = salted_ciphertext.split(SALT_DELIMITER, 1)
    salt = parts[0]
    ciphertext = parts[1]
    return ciphertext, salt
