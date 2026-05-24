from typing import List, Dict, Tuple
from collections import defaultdict
from models import PasswordEntry


class SecurityAuditor:
    def __init__(self):
        pass

    def find_duplicate_passwords(self, entries: List[PasswordEntry]) -> Dict[str, List[PasswordEntry]]:
        password_groups = defaultdict(list)
        for entry in entries:
            if entry.password:
                password_groups[entry.password].append(entry)

        return {
            password: group
            for password, group in password_groups.items()
            if len(group) > 1
        }

    def find_weak_passwords(self, entries: List[PasswordEntry], threshold: int = 4) -> List[Tuple[PasswordEntry, int]]:
        weak_entries = []
        for entry in entries:
            if entry.strength_score is not None and entry.strength_score <= threshold:
                weak_entries.append((entry, entry.strength_score))
            elif entry.strength_score is None:
                from password_strength import PasswordStrengthChecker
                checker = PasswordStrengthChecker()
                result = checker.check(entry.password)
                if result["score"] <= threshold:
                    weak_entries.append((entry, result["score"]))
        return sorted(weak_entries, key=lambda x: x[1])

    def find_expired_passwords(self, entries: List[PasswordEntry]) -> List[Tuple[PasswordEntry, int]]:
        expired = []
        for entry in entries:
            if entry.is_expired():
                days = entry.days_until_expiration()
                expired.append((entry, days if days is not None else 0))
        return sorted(expired, key=lambda x: x[1])

    def find_expiring_soon(self, entries: List[PasswordEntry], days: int = 7) -> List[Tuple[PasswordEntry, int]]:
        expiring = []
        for entry in entries:
            days_left = entry.days_until_expiration()
            if days_left is not None and 0 <= days_left <= days:
                expiring.append((entry, days_left))
        return sorted(expiring, key=lambda x: x[1])

    def find_old_passwords(self, entries: List[PasswordEntry], days: int = 90) -> List[Tuple[PasswordEntry, int]]:
        from datetime import datetime
        old_entries = []
        for entry in entries:
            try:
                updated_at = datetime.fromisoformat(entry.updated_at)
                days_since_update = (datetime.now() - updated_at).days
                if days_since_update >= days:
                    old_entries.append((entry, days_since_update))
            except (ValueError, TypeError):
                continue
        return sorted(old_entries, key=lambda x: x[1], reverse=True)

    def generate_audit_report(self, entries: List[PasswordEntry]) -> Dict:
        duplicates = self.find_duplicate_passwords(entries)
        weak_passwords = self.find_weak_passwords(entries)
        expired = self.find_expired_passwords(entries)
        expiring_soon = self.find_expiring_soon(entries)
        old_passwords = self.find_old_passwords(entries)

        total_entries = len(entries)
        duplicate_count = sum(len(group) for group in duplicates.values())
        weak_count = len(weak_passwords)
        expired_count = len(expired)
        expiring_count = len(expiring_soon)
        old_count = len(old_passwords)

        unique_websites = len(set(e.website for e in entries if e.website))
        unique_usernames = len(set(e.username for e in entries if e.username))

        avg_strength = 0
        if total_entries > 0:
            strengths = []
            for e in entries:
                if e.strength_score is not None:
                    strengths.append(e.strength_score)
                else:
                    from password_strength import PasswordStrengthChecker
                    checker = PasswordStrengthChecker()
                    result = checker.check(e.password)
                    strengths.append(result["score"])
            if strengths:
                avg_strength = sum(strengths) / len(strengths)

        return {
            "total_entries": total_entries,
            "unique_websites": unique_websites,
            "unique_usernames": unique_usernames,
            "duplicate_password_groups": len(duplicates),
            "duplicate_entries_count": duplicate_count,
            "weak_password_count": weak_count,
            "expired_password_count": expired_count,
            "expiring_soon_count": expiring_count,
            "old_password_count": old_count,
            "average_strength": round(avg_strength, 2),
            "duplicates": duplicates,
            "weak_passwords": weak_passwords,
            "expired_passwords": expired,
            "expiring_soon": expiring_soon,
            "old_passwords": old_passwords,
        }

    def print_audit_report(self, entries: List[PasswordEntry]):
        report = self.generate_audit_report(entries)

        print("\n" + "=" * 60)
        print("安全审计报告")
        print("=" * 60)
        print(f"总条目数: {report['total_entries']}")
        print(f"唯一网站数: {report['unique_websites']}")
        print(f"唯一用户名数: {report['unique_usernames']}")
        print(f"平均密码强度: {report['average_strength']}/10")
        print("-" * 60)

        if report["duplicate_password_groups"] > 0:
            print(f"\n⚠️  发现 {report['duplicate_password_groups']} 组重复密码")
            print(f"   涉及 {report['duplicate_entries_count']} 个条目")
            for password, group in report["duplicates"].items():
                print(f"\n   密码: {'*' * 8}")
                for entry in group:
                    print(f"     - {entry.website} ({entry.username})")

        if report["weak_password_count"] > 0:
            print(f"\n⚠️  发现 {report['weak_password_count']} 个弱密码")
            for entry, score in report["weak_passwords"]:
                print(f"   - {entry.website} ({entry.username}): 强度 {score}/10")

        if report["expired_password_count"] > 0:
            print(f"\n⚠️  发现 {report['expired_password_count']} 个已过期密码")
            for entry, days in report["expired_passwords"]:
                print(f"   - {entry.website} ({entry.username}): 已过期 {abs(days)} 天")

        if report["expiring_soon_count"] > 0:
            print(f"\n⚠️  发现 {report['expiring_soon_count']} 个即将过期密码")
            for entry, days in report["expiring_soon"]:
                print(f"   - {entry.website} ({entry.username}): 还有 {days} 天过期")

        if report["old_password_count"] > 0:
            print(f"\n⚠️  发现 {report['old_password_count']} 个长期未更新的密码")
            for entry, days in report["old_passwords"][:10]:
                print(f"   - {entry.website} ({entry.username}): {days} 天未更新")

        print("\n" + "=" * 60)

        total_issues = (
            report["duplicate_password_groups"]
            + report["weak_password_count"]
            + report["expired_password_count"]
        )
        if total_issues == 0:
            print("✅ 安全检查通过，未发现重大安全问题！")
        else:
            print(f"⚠️  共发现 {total_issues} 个安全问题，建议及时处理")
        print("=" * 60 + "\n")
