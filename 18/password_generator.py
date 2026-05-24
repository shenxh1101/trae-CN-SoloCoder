import secrets
import string
from typing import Optional


class PasswordGenerator:
    def __init__(self):
        self.lowercase = string.ascii_lowercase
        self.uppercase = string.ascii_uppercase
        self.digits = string.digits
        self.symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?~"

    def generate(
        self,
        length: int = 16,
        use_lowercase: bool = True,
        use_uppercase: bool = True,
        use_digits: bool = True,
        use_symbols: bool = True,
        exclude_chars: Optional[str] = None,
    ) -> str:
        if length < 4:
            raise ValueError("密码长度至少为4位")

        if not any([use_lowercase, use_uppercase, use_digits, use_symbols]):
            raise ValueError("至少需要选择一种字符类型")

        char_pool = ""
        if use_lowercase:
            char_pool += self.lowercase
        if use_uppercase:
            char_pool += self.uppercase
        if use_digits:
            char_pool += self.digits
        if use_symbols:
            char_pool += self.symbols

        if exclude_chars:
            char_pool = "".join(c for c in char_pool if c not in exclude_chars)

        if len(char_pool) == 0:
            raise ValueError("字符池为空，请调整排除字符")

        password_chars = []
        if use_lowercase:
            available = "".join(c for c in self.lowercase if c not in (exclude_chars or ""))
            if available:
                password_chars.append(secrets.choice(available))
        if use_uppercase:
            available = "".join(c for c in self.uppercase if c not in (exclude_chars or ""))
            if available:
                password_chars.append(secrets.choice(available))
        if use_digits:
            available = "".join(c for c in self.digits if c not in (exclude_chars or ""))
            if available:
                password_chars.append(secrets.choice(available))
        if use_symbols:
            available = "".join(c for c in self.symbols if c not in (exclude_chars or ""))
            if available:
                password_chars.append(secrets.choice(available))

        remaining_length = length - len(password_chars)
        if remaining_length > 0:
            password_chars.extend(
                secrets.choice(char_pool) for _ in range(remaining_length)
            )

        secrets.SystemRandom().shuffle(password_chars)
        return "".join(password_chars)

    def generate_strong(self, length: int = 20) -> str:
        return self.generate(
            length=length,
            use_lowercase=True,
            use_uppercase=True,
            use_digits=True,
            use_symbols=True,
        )

    def generate_memorable(self, word_count: int = 4, separator: str = "-") -> str:
        words = [
            "apple", "banana", "cherry", "dragon", "eagle", "forest",
            "guitar", "harbor", "island", "jungle", "kingdom", "lemon",
            "mountain", "night", "ocean", "piano", "queen", "river",
            "sunset", "tiger", "umbrella", "valley", "winter", "xenon",
            "yellow", "zebra", "alpha", "beta", "gamma", "delta",
            "echo", "foxtrot", "golf", "hotel", "india", "juliett",
            "kilo", "lima", "mike", "november", "oscar", "papa",
            "quebec", "romeo", "sierra", "tango", "uniform", "victor",
            "whiskey", "xray", "yankee", "zulu"
        ]
        selected_words = [secrets.choice(words).capitalize() for _ in range(word_count)]
        number = secrets.randbelow(1000)
        symbol = secrets.choice(self.symbols)
        return separator.join(selected_words) + separator + str(number) + symbol
