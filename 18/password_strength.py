import re
from typing import Tuple, List, Dict, Any


class PasswordStrengthChecker:
    def __init__(self):
        self.common_passwords = set([
            "password", "123456", "123456789", "12345678", "12345",
            "qwerty", "abc123", "password1", "111111", "123123",
            "admin", "letmein", "welcome", "monkey", "dragon",
            "master", "iloveyou", "sunshine", "princess", "football",
            "admin123", "login", "welcome1", "123qwe", "123abc",
        ])

        self.weak_patterns = [
            r"(.)\1{2,}",
            r"12345|23456|34567|45678|56789|67890",
            r"abcde|bcdef|cdefg|defgh|efghi|fghij|ghijk|hijkl|ijklm|jklmn",
            r"qwert|werty|erty|asdfg|sdfgh|dfghj|fghjk|ghjkl|zxcvb|xcvbn|cvbnm",
            r"qwerty|asdfgh|zxcvbn",
        ]

    def check(self, password: str) -> Dict[str, Any]:
        score = 0
        feedback = []
        length = len(password)

        if length < 8:
            feedback.append("密码长度不足8位，建议至少8位")
        elif length >= 8 and length < 12:
            score += 1
            feedback.append("密码长度可以更长以增强安全性（建议12位以上）")
        elif length >= 12 and length < 16:
            score += 2
        else:
            score += 3

        if password.lower() in self.common_passwords:
            score = 0
            feedback.append("这是一个常见密码，非常不安全")
            return {"score": score, "feedback": feedback, "level": "非常弱"}

        has_lower = bool(re.search(r"[a-z]", password))
        has_upper = bool(re.search(r"[A-Z]", password))
        has_digit = bool(re.search(r"\d", password))
        has_symbol = bool(re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~]", password))

        if has_lower:
            score += 1
        else:
            feedback.append("建议添加小写字母")

        if has_upper:
            score += 1
        else:
            feedback.append("建议添加大写字母")

        if has_digit:
            score += 1
        else:
            feedback.append("建议添加数字")

        if has_symbol:
            score += 1
        else:
            feedback.append("建议添加特殊字符")

        variety_count = sum([has_lower, has_upper, has_digit, has_symbol])
        if variety_count >= 4:
            score += 1
        elif variety_count == 3:
            score += 0
        elif variety_count == 2:
            score -= 1
        elif variety_count <= 1:
            score -= 2

        for pattern in self.weak_patterns:
            if re.search(pattern, password, re.IGNORECASE):
                score -= 1
                feedback.append("密码包含重复或连续字符模式，容易被破解")
                break

        consecutive_lower = len(re.findall(r"[a-z]{4,}", password))
        consecutive_upper = len(re.findall(r"[A-Z]{4,}", password))
        consecutive_digit = len(re.findall(r"\d{4,}", password))
        if consecutive_lower + consecutive_upper + consecutive_digit > 0:
            score -= 1
            feedback.append("存在连续的相同类型字符，建议混合不同类型字符")

        if self._has_keyboard_pattern(password):
            score -= 1
            feedback.append("密码包含键盘连续序列，建议避免")

        if self._has_personal_info_pattern(password):
            feedback.append("注意不要在密码中包含个人信息（如生日、手机号等）")

        score = max(0, min(10, score))

        if score <= 2:
            level = "非常弱"
        elif score <= 4:
            level = "弱"
        elif score <= 6:
            level = "中等"
        elif score <= 8:
            level = "强"
        else:
            level = "非常强"

        if score >= 8:
            feedback.append("密码强度很好！")
        elif score >= 6:
            feedback.append("密码强度可以接受，但可以进一步增强")

        return {
            "score": score,
            "feedback": feedback,
            "level": level,
            "length": length,
            "has_lowercase": has_lower,
            "has_uppercase": has_upper,
            "has_digit": has_digit,
            "has_symbol": has_symbol,
        }

    def _has_keyboard_pattern(self, password: str) -> bool:
        keyboard_rows = [
            "qwertyuiop",
            "asdfghjkl",
            "zxcvbnm",
            "1234567890",
            "poiuytrewq",
            "lkjhgfdsa",
            "mnbvcxz",
        ]
        pwd_lower = password.lower()
        for row in keyboard_rows:
            for i in range(len(row) - 3):
                pattern = row[i:i+4]
                if pattern in pwd_lower or pattern[::-1] in pwd_lower:
                    return True
        return False

    def _has_personal_info_pattern(self, password: str) -> bool:
        if re.search(r"19\d{2}|20\d{2}", password):
            return True
        if re.search(r"\d{6,}", password):
            return True
        if re.search(r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)", password, re.IGNORECASE):
            return True
        return False

    def generate_suggestions(self, strength_result: Dict[str, Any]) -> List[str]:
        suggestions = []
        if not strength_result["has_lowercase"]:
            suggestions.append("添加小写字母")
        if not strength_result["has_uppercase"]:
            suggestions.append("添加大写字母")
        if not strength_result["has_digit"]:
            suggestions.append("添加数字")
        if not strength_result["has_symbol"]:
            suggestions.append("添加特殊字符")
        if strength_result["length"] < 12:
            suggestions.append("增加密码长度到12位以上")
        if not suggestions:
            suggestions.append("密码已足够强壮！")
        return suggestions
