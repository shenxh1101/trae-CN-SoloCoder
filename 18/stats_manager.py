from typing import List, Dict, Any
from collections import Counter
from models import PasswordEntry
from password_strength import PasswordStrengthChecker


class StatsManager:
    def __init__(self):
        self.strength_checker = PasswordStrengthChecker()

    def generate_stats(self, entries: List[PasswordEntry]) -> Dict[str, Any]:
        total_entries = len(entries)

        if total_entries == 0:
            return {
                "total_entries": 0,
                "weak_passwords": 0,
                "expired_passwords": 0,
                "expiring_soon": 0,
                "average_strength": 0,
                "strength_distribution": {},
                "websites": [],
                "stats": None,
            }

        expired_count = sum(1 for e in entries if e.is_expired())

        expiring_soon_count = 0
        for e in entries:
            days_left = e.days_until_expiration()
            if days_left is not None and 0 <= days_left <= 7:
                expiring_soon_count += 1

        weak_passwords = 0
        total_strength = 0
        strength_scores = []
        strength_levels = Counter()

        for entry in entries:
            if entry.strength_score is not None:
                score = entry.strength_score
                feedback = entry.strength_feedback
            else:
                result = self.strength_checker.check(entry.password)
                score = result["score"]
                feedback = result["feedback"]
                entry.strength_score = score
                entry.strength_feedback = feedback

            strength_scores.append(score)
            total_strength += score

            if score <= 4:
                weak_passwords += 1

            if score <= 2:
                strength_levels["非常弱"] += 1
            elif score <= 4:
                strength_levels["弱"] += 1
            elif score <= 6:
                strength_levels["中等"] += 1
            elif score <= 8:
                strength_levels["强"] += 1
            else:
                strength_levels["非常强"] += 1

        avg_strength = total_strength / total_entries if total_entries > 0 else 0

        website_counter = Counter(e.website for e in entries if e.website)
        top_websites = website_counter.most_common(10)

        username_counter = Counter(e.username for e in entries if e.username)
        top_usernames = username_counter.most_common(10)

        entries_with_expiry = sum(1 for e in entries if e.expiration_date)
        entries_with_notes = sum(1 for e in entries if e.notes)
        entries_with_custom = sum(1 for e in entries if e.custom_fields)

        oldest_entry = min(entries, key=lambda e: e.created_at) if entries else None
        newest_entry = max(entries, key=lambda e: e.updated_at) if entries else None

        duplicate_password_groups = 0
        from collections import defaultdict
        password_groups = defaultdict(list)
        for entry in entries:
            if entry.password:
                password_groups[entry.password].append(entry)
        duplicate_password_groups = sum(1 for g in password_groups.values() if len(g) > 1)

        return {
            "total_entries": total_entries,
            "weak_passwords": weak_passwords,
            "expired_passwords": expired_count,
            "expiring_soon": expiring_soon_count,
            "average_strength": round(avg_strength, 2),
            "strength_distribution": dict(strength_levels),
            "duplicate_password_groups": duplicate_password_groups,
            "entries_with_expiry": entries_with_expiry,
            "entries_with_notes": entries_with_notes,
            "entries_with_custom_fields": entries_with_custom,
            "top_websites": top_websites,
            "top_usernames": top_usernames,
            "oldest_entry": oldest_entry,
            "newest_entry": newest_entry,
            "strength_scores": strength_scores,
        }

    def print_stats(self, entries: List[PasswordEntry]):
        stats = self.generate_stats(entries)

        print("\n" + "=" * 60)
        print("密码库统计信息")
        print("=" * 60)
        print(f"总条目数: {stats['total_entries']}")
        print(f"平均密码强度: {stats['average_strength']}/10")
        print("-" * 60)

        print(f"🔒 安全状态:")
        print(f"  弱密码数量: {stats['weak_passwords']}")
        print(f"  已过期密码: {stats['expired_passwords']}")
        print(f"  7天内过期: {stats['expiring_soon']}")
        print(f"  重复密码组: {stats['duplicate_password_groups']}")

        print("\n📊 强度分布:")
        for level, count in stats["strength_distribution"].items():
            bar = "█" * int(count / max(stats["total_entries"], 1) * 20)
            print(f"  {level}: {count:3d} {bar}")

        print("\n📋 条目详情:")
        print(f"  设置过期时间: {stats['entries_with_expiry']}")
        print(f"  包含备注: {stats['entries_with_notes']}")
        print(f"  包含自定义字段: {stats['entries_with_custom_fields']}")

        if stats["top_websites"]:
            print("\n🌐 最常使用的网站 (Top 5):")
            for website, count in stats["top_websites"][:5]:
                print(f"  {website}: {count} 个账户")

        if stats["oldest_entry"]:
            print(f"\n🕐 最早创建: {stats['oldest_entry'].website} ({stats['oldest_entry'].created_at[:10]})")
        if stats["newest_entry"]:
            print(f"🕐 最近更新: {stats['newest_entry'].website} ({stats['newest_entry'].updated_at[:10]})")

        print("=" * 60 + "\n")

        if stats["weak_passwords"] > 0 or stats["expired_passwords"] > 0:
            print("⚠️  建议运行 'audit' 命令进行详细安全审计\n")
