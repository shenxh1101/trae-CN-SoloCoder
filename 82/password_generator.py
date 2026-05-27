import random
import string
import secrets


class PasswordGenerator:
    CONFUSING_CHARS = set('0O1lI')

    COMMON_WORDS = [
        'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden', 'harbor',
        'island', 'jungle', 'kingdom', 'lemon', 'mountain', 'nature', 'ocean', 'piano',
        'queen', 'river', 'sunset', 'tiger', 'umbrella', 'valley', 'winter', 'yellow',
        'zebra', 'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf',
        'hotel', 'india', 'juliett', 'kilo', 'lima', 'mike', 'november', 'oscar',
        'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey',
        'xray', 'yankee', 'zulu', 'azure', 'bolt', 'crimson', 'diamond', 'emerald',
        'flame', 'gold', 'horizon', 'ice', 'jade', 'kestrel', 'lightning', 'moon',
        'nebula', 'opal', 'phoenix', 'quartz', 'rainbow', 'star', 'thunder', 'vortex',
        'wave', 'xenon', 'youth', 'zenith', 'amber', 'blaze', 'cobalt', 'dusk',
        'ember', 'frost', 'glacier', 'hawk', 'iris', 'jade', 'koala', 'lunar',
        'mystic', 'nova', 'orbit', 'prism', 'raven', 'storm', 'twilight', 'unity',
        'violet', 'willow', 'xylophone', 'yeti', 'zero'
    ]

    def generate(self, length=16, include_upper=True, include_lower=True,
                 include_digits=True, include_symbols=True, exclude_confusing=False):
        if length < 8 or length > 32:
            raise ValueError('密码长度必须在8到32位之间')

        chars = ''
        if include_upper:
            upper = string.ascii_uppercase
            if exclude_confusing:
                upper = ''.join(c for c in upper if c not in self.CONFUSING_CHARS)
            chars += upper
        if include_lower:
            lower = string.ascii_lowercase
            if exclude_confusing:
                lower = ''.join(c for c in lower if c not in self.CONFUSING_CHARS)
            chars += lower
        if include_digits:
            digits = string.digits
            if exclude_confusing:
                digits = ''.join(c for c in digits if c not in self.CONFUSING_CHARS)
            chars += digits
        if include_symbols:
            chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

        if not chars:
            raise ValueError('至少需要选择一种字符类型')

        password = []
        if include_upper:
            upper_chars = string.ascii_uppercase
            if exclude_confusing:
                upper_chars = ''.join(c for c in upper_chars if c not in self.CONFUSING_CHARS)
            password.append(secrets.choice(upper_chars))
        if include_lower:
            lower_chars = string.ascii_lowercase
            if exclude_confusing:
                lower_chars = ''.join(c for c in lower_chars if c not in self.CONFUSING_CHARS)
            password.append(secrets.choice(lower_chars))
        if include_digits:
            digit_chars = string.digits
            if exclude_confusing:
                digit_chars = ''.join(c for c in digit_chars if c not in self.CONFUSING_CHARS)
            password.append(secrets.choice(digit_chars))
        if include_symbols:
            password.append(secrets.choice('!@#$%^&*()_+-=[]{}|;:,.<>?'))

        remaining_length = length - len(password)
        for _ in range(remaining_length):
            password.append(secrets.choice(chars))

        secrets.SystemRandom().shuffle(password)
        return ''.join(password)

    def generate_readable(self, exclude_confusing=False):
        word = secrets.choice(self.COMMON_WORDS).capitalize()
        digit_chars = string.digits
        if exclude_confusing:
            digit_chars = ''.join(c for c in digit_chars if c not in self.CONFUSING_CHARS)
        number = ''.join(secrets.choice(digit_chars) for _ in range(3))
        special = secrets.choice('!@#$%^&*')
        return f'{word}{number}{special}'

    def generate_passphrase(self, word_count=4):
        if word_count < 4 or word_count > 6:
            raise ValueError('密码短语单词数必须在4到6个之间')

        words = secrets.SystemRandom().sample(self.COMMON_WORDS, word_count)
        capitalized = [w.capitalize() for w in words]
        return ''.join(capitalized)
