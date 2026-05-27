import re


class PasswordStrength:
    @staticmethod
    def evaluate(password):
        score = 0
        suggestions = []

        length = len(password)

        if length >= 8:
            score += 20
        if length >= 12:
            score += 10
        if length >= 16:
            score += 10
        if length < 8:
            suggestions.append('密码长度至少需要8位')

        if re.search(r'[a-z]', password):
            score += 15
        else:
            suggestions.append('添加小写字母')

        if re.search(r'[A-Z]', password):
            score += 15
        else:
            suggestions.append('添加大写字母')

        if re.search(r'[0-9]', password):
            score += 15
        else:
            suggestions.append('添加数字')

        if re.search(r'[^a-zA-Z0-9]', password):
            score += 15
        else:
            suggestions.append('添加特殊字符')

        unique_chars = len(set(password))
        if unique_chars >= 10:
            score += 5
        if unique_chars >= 15:
            score += 5

        common_patterns = [
            r'123456', r'password', r'qwerty', r'abc123', r'admin',
            r'letmein', r'welcome', r'monkey', r'12345678', r'password1'
        ]
        password_lower = password.lower()
        for pattern in common_patterns:
            if pattern in password_lower:
                score -= 20
                suggestions.append('避免使用常见密码模式')
                break

        if re.search(r'(.)\1{2,}', password):
            score -= 10
            suggestions.append('避免连续重复字符')

        if re.search(r'012345|123456|234567|345678|456789|567890', password):
            score -= 10
            suggestions.append('避免连续数字序列')

        if re.search(r'abcdef|bcdefg|cdefgh|defghi|efghij|fghijk', password_lower):
            score -= 10
            suggestions.append('避免连续字母序列')

        score = max(0, min(100, score))

        if score < 40:
            level = '弱'
        elif score < 70:
            level = '中'
        else:
            level = '强'

        return {
            'score': score,
            'level': level,
            'suggestions': suggestions
        }
