from __future__ import annotations
import sys
import os
import uuid
import random
from typing import List, Dict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from card_game.core import (
    Game, Player, Card, CardInstance,
    CardClass, CardType, Zone,
    CardEffect, EffectType, TriggerType
)
from card_game.engine import ActionExecutor
from card_game.ai import MCTSPlayer, GreedyAI
from card_game.deck import CardDatabase
from card_game.ladder import LadderSystem, Rank, RANK_INFO
from card_game.achievements import (
    AchievementManager, Achievement, AchievementCategory
)


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def demo_card_effects():
    print_header("🎴 演示1: 卡牌效果类型展示")

    database = CardDatabase()

    effect_types = {
        EffectType.POISONOUS: "剧毒 - 消灭任何受到伤害的随从",
        EffectType.WINDFURY: "风怒 - 每回合可以攻击两次",
        EffectType.REBORN: "重生 - 第一次死亡时以1/1复活",
        EffectType.LIFESTEAL: "吸血 - 造成的伤害同时恢复等量生命值",
        EffectType.RUSH: "突袭 - 打出当回合可攻击随从",
        EffectType.ECHO: "回响 - 打出后复制一张到手牌",
        EffectType.DISCOVER: "发现 - 从三张卡牌中选择一张",
        EffectType.OUTCAST: "流放 - 在手牌最左或最右时触发额外效果",
        EffectType.FRENZY: "狂乱 - 第一次受到伤害时触发",
        EffectType.CORRUPT: "腐化 - 打出更高费用的卡牌后升级",
        EffectType.TRADEABLE: "可交易 - 可以花费1费洗入牌库抽一张牌",
        EffectType.COLOSSAL: "巨型 - 召唤时附带特殊效果",
        EffectType.DREDGE: "探底 - 查看牌库底三张牌",
        EffectType.MANA_TITAN: "法力巨人 - 每有一点空法力值就获得+1/+1",
        EffectType.AVENGE: "复仇 - 友方随从死亡时触发",
    }

    print("\n  新增卡牌效果类型：\n")
    for effect, desc in effect_types.items():
        print(f"    • {effect.name:20s} - {desc}")

    print(f"\n  总效果类型总数: {len(EffectType)} 种")
    print(f"  数据库中卡牌总数: {len(database.get_all_cards())} 张")

    cards_with_new_effects = []
    for card in database.get_all_cards():
        for effect in card.effects:
            if effect.effect_type in effect_types:
                cards_with_new_effects.append(card)
                break

    print(f"  包含新效果的卡牌: {len(cards_with_new_effects)} 张")

    if cards_with_new_effects:
        print("\n  示例卡牌：\n")
        for card in cards_with_new_effects[:5]:
            effects_str = ", ".join([e.effect_type.name for e in card.effects])
            print(f"    • [{card.cost}费] {card.name} - {effects_str}")
            if card.description:
                print(f"      {card.description}")

    print("\n  ✅ 卡牌效果系统演示完成！")


def demo_ai_improvements():
    print_header("🤖 演示2: AI决策算法优化")

    print("""
  AI系统优化内容：

  1. 高级启发式评估函数 (AdvancedHeuristic)
     • 生命值和护甲的综合评估
     • 战场控制评估（随从价值计算）
     • 手牌资源评估
     • 法力曲线评估
     • 特殊效果权重（嘲讽、圣盾、剧毒等）
     • 斩杀线检测
     • 场面压力评估

  2. MCTS搜索策略优化
     • UCT (Upper Confidence Bound for Trees)
     • 探索与利用平衡
     • 迭代加深搜索
     • 可选难度等级
        - 简单: Greedy AI (快速决策)
        - 中等: MCTS 100次迭代
        - 困难: MCTS 300次迭代

  3. 游戏风格支持
     • TEMPO (节奏型)
     • AGGRESSIVE (进攻型)
     • DEFENSIVE (防守型)
     • CONTROL (控制型)
""")

    player1_id = "demo_player_" + uuid.uuid4().hex[:8]
    player2_id = "demo_ai_" + uuid.uuid4().hex[:8]

    player1 = Player(player_id=player1_id, name="玩家", card_class=CardClass.MAGE)
    player2 = Player(player_id=player2_id, name="AI", card_class=CardClass.WARRIOR)

    game = Game(game_id="demo_game_" + uuid.uuid4().hex[:8], player1=player1, player2=player2)

    print(f"\n  创建测试游戏...")
    print(f"    玩家1: {player1.name} ({player1.card_class.name})")
    print(f"    玩家2: {player2.name} ({player2.card_class.name})")

    greedy_ai = GreedyAI(player2_id)
    print(f"\n  GreedyAI 初始化完成")

    mcts_ai = MCTSPlayer(player2_id, iterations=50)
    print(f"  MCTS AI 初始化完成 (50次迭代)")

    print("\n  ✅ AI系统演示完成！")


def demo_ladder_system():
    print_header("🏆 演示3: 天梯匹配系统")

    ladder = LadderSystem("demo_ladder_data.json")

    print("""
  天梯系统特性：

  1. MMR评分系统
     • 初始积分: 1500
     • K因子: 32
     • 基于Elo rating系统
     • 连胜奖励机制

  2. 段位系统
""")

    for rank, info in RANK_INFO.items():
        print(f"     {info.icon} {info.name:6s} - {info.min_mmr:5d} - {info.max_mmr:5d} 分")

    print("""
  3. 匹配机制
     • 优先匹配相近积分的对手
     • 最大积分差: 200分
     • 超时自动扩大搜索范围

  4. 排行榜系统
     • 按积分排序
     • 胜率统计
     • 连胜记录
""")

    test_players = [
        ("player_1", "天梯新手", 1450),
        ("player_2", "白银玩家", 1650),
        ("player_3", "黄金选手", 2100),
        ("player_4", "铂金大神", 3200),
        ("player_5", "传说玩家", 5500),
    ]

    print("  示例玩家数据：\n")
    for pid, name, mmr in test_players:
        stats = ladder.get_or_create_player(pid, name)
        stats.mmr = mmr
        stats.wins = random.randint(0, 100)
        stats.losses = random.randint(0, 100)
        stats.update_rank()
        rank_info = ladder.get_rank_info(stats.rank)
        print(f"    {rank_info.icon} {name}: {mmr} 分 - {rank_info.name} 段位")

    leaderboard = ladder.get_leaderboard(5)
    print(f"\n  排行榜 (前5名):\n")
    for i, stats in enumerate(leaderboard, 1):
        rank_info = ladder.get_rank_info(stats.rank)
        print(f"    {i}. {rank_info.icon} {stats.player_name}: {stats.mmr} 分 ({stats.wins}胜{stats.losses}负)")

    import os
    if os.path.exists("demo_ladder_data.json"):
        os.remove("demo_ladder_data.json")

    print("\n  ✅ 天梯系统演示完成！")


def demo_achievement_system():
    print_header("🏅 演示4: 成就系统")

    achievement_manager = AchievementManager("demo_achievements.json")

    print("""
  成就系统特性：

  1. 成就分类：
     • 综合类: 游戏完成、胜利次数等
     • 游戏玩法: 伤害、治疗、特殊操作
     • 天梯类: 达到特定段位
     • 收藏类: 卡牌收集、卡组构建
     • 每日成就: 每日任务
     • 隐藏成就: 特殊条件解锁

  2. 成就追踪机制
     • 事件驱动的进度更新
     • 自动解锁检测
     • 解锁通知回调

  3. 奖励系统
     • 成就点数
     • 进度百分比显示
""")

    all_achievements = achievement_manager.achievements
    print(f"\n  总成就数: {len(all_achievements)} 个")

    categories = {}
    for achievement in all_achievements.values():
        cat = achievement.category
        categories[cat] = categories.get(cat, 0) + 1

    print(f"\n  成就分类：\n")
    for cat, count in categories.items():
        print(f"    • {cat.name}: {count} 个")

    test_player_id = "demo_player_001"
    print(f"\n  模拟成就进度：\n")

    events = [
        ("game_played", {}),
        ("game_won", {}),
        ("game_played", {}),
        ("game_won", {}),
        ("damage_dealt", {"amount": 50}),
        ("damage_dealt", {"amount": 30}),
        ("healing_done", {"amount": 20}),
        ("rank_reached", {"rank_name": "SILVER"}),
    ]

    for event_type, kwargs in events:
        achievement_manager.track_event(test_player_id, event_type, **kwargs)
        print(f"    触发事件: {event_type} {kwargs}")

    unlocked = achievement_manager.get_unlocked_achievements(test_player_id)
    print(f"\n  已解锁成就: {len(unlocked)} 个")
    for achievement in unlocked:
        print(f"    ✅ {achievement.icon} {achievement.name} - {achievement.points} 点")

    player_achievements = achievement_manager.get_player_achievements(test_player_id)
    print(f"\n  成就进度:\n")
    for item in player_achievements[:8]:
        achievement = item["achievement"]
        progress = item["progress"]
        pct = item["progress_percent"]
        status = "✅" if item["is_unlocked"] else f"{pct:3.0f}%"
        print(f"    {achievement.icon} {achievement.name:15s} - {status}")

    total_points = achievement_manager.get_total_points(test_player_id)
    print(f"\n  总成就点数: {total_points}")

    import os
    if os.path.exists("demo_achievements.json"):
        os.remove("demo_achievements.json")

    print("\n  ✅ 成就系统演示完成！")


def demo_cli_ui():
    print_header("🎮 演示5: 命令行UI界面")

    print("""
  命令行UI界面特性：

  1. 主菜单系统
     • 开始对战 (vs AI)
     • 卡牌数据库浏览
     • 卡组构建器
     • 天梯系统
     • 成就系统
     • 游戏回放

  2. 游戏界面
     • 清晰的战场显示
     • 玩家状态显示
     • 随从状态显示
     • 手牌管理
     • 动作选择菜单

  3. 卡牌浏览器
     • 按职业筛选
     • 按费用筛选
     • 关键词搜索
     • 详细信息显示

  4. 卡组构建器
     • 30张卡组构建
     • 费用曲线可视化
     • 卡组验证
     • 职业限制检查

  运行UI界面命令：
    python -m card_game.ui.cli_game
""")

    print("\n  ✅ 命令行UI系统演示完成！")


def run_all_demos():
    demos = [
        ("卡牌效果类型", demo_card_effects),
        ("AI决策算法", demo_ai_improvements),
        ("天梯匹配系统", demo_ladder_system),
        ("成就系统", demo_achievement_system),
        ("命令行UI界面", demo_cli_ui),
    ]

    print("\n" + "#" * 70)
    print("#" + "卡牌对战游戏 - 新功能综合演示".center(68) + "#")
    print("#" * 70)

    for i, (name, demo_func) in enumerate(demos, 1):
        print(f"\n  演示 {i}/{len(demos)}: {name}")
        try:
            demo_func()
        except Exception as e:
            print(f"\n  ❌ 演示 {name} 失败: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 70)
    print("  🎉 所有演示完成！")
    print("=" * 70)
    print("""
  新功能总结：

  ✅ 1. 卡牌效果类型扩展
     - 新增 15 种新效果类型
     - 剧毒、风怒、重生、吸血、突袭等

  ✅ 2. AI决策算法优化
     - 高级启发式评估函数
     - MCTS搜索策略
     - 多难度等级

  ✅ 3. 命令行UI界面
     - 完整的游戏流程
     - 卡牌数据库浏览
     - 卡组构建器

  ✅ 4. 天梯匹配系统
     - MMR评分系统
     - 7个段位
     - 排行榜

  ✅ 5. 成就系统
     - 30个成就
     - 6个分类
     - 事件追踪
""")
    print("=" * 70)


if __name__ == "__main__":
    run_all_demos()
