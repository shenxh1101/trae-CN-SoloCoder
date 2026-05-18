#!/usr/bin/env python3
"""
卡牌对战游戏核心引擎 - 主入口文件

功能列表:
1. 核心规则引擎 - 支持各种卡牌效果和时序优先级
2. MCTS AI - 使用蒙特卡洛树搜索进行决策
3. 卡组构筑验证 - 费用曲线、职业限制
4. 回放系统 - 游戏录制和重播
5. 断线重连 - 游戏状态恢复
6. 好友对战网络框架
"""

import sys
import uuid
from typing import List

from .core import Card, Player, Game, CardInstance
from .core.enums import CardType, CardClass, EffectType, TriggerType
from .engine import ActionExecutor, EffectEngine
from .ai import MCTSPlayer, GreedyAI
from .deck import CardDatabase, DeckValidator
from .replay import ReplayManager, BalanceSimulator


def demo_card_database():
    """演示卡牌数据库的使用"""
    print("=" * 60)
    print("卡牌数据库演示")
    print("=" * 60)

    CardDatabase.initialize()
    all_cards = CardDatabase.get_all_cards()

    print(f"\n总卡牌数量: {len(all_cards)}")
    print("\n所有卡牌列表:")
    for card in all_cards:
        effects_count = len(card.effects)
        print(f"  - {card.name} (费用: {card.cost}, 效果数: {effects_count})")

    print("\n按职业筛选 (法师):")
    mage_cards = CardDatabase.get_cards_by_class(CardClass.MAGE)
    for card in mage_cards:
        print(f"  - {card.name}")


def demo_deck_validation():
    """演示卡组验证功能"""
    print("\n" + "=" * 60)
    print("卡组验证演示")
    print("=" * 60)

    CardDatabase.initialize()
    all_cards = CardDatabase.get_all_cards()

    card_ids = []
    for card in all_cards:
        card_ids.extend([card.card_id, card.card_id])

    card_ids = card_ids[:30]

    validator = DeckValidator(CardClass.MAGE)
    result = validator.validate(card_ids)

    print(f"\n验证结果: {'通过' if result.valid else '失败'}")

    if result.errors:
        print("错误:")
        for error in result.errors:
            print(f"  - {error}")

    if result.warnings:
        print("\n警告:")
        for warning in result.warnings:
            print(f"  - {warning}")

    print("\n费用曲线:")
    for cost in sorted(result.mana_curve.keys()):
        count = result.mana_curve[cost]
        bar = "█" * count
        print(f"  {cost:2d}费: {bar} ({count})")

    stats = validator.get_deck_stats(card_ids)
    print("\n卡组统计:")
    for key, value in stats.items():
        print(f"  {key}: {value}")


def demo_ai_game():
    """演示 AI 对战"""
    print("\n" + "=" * 60)
    print("AI 对战演示")
    print("=" * 60)

    CardDatabase.initialize()

    player1_id = str(uuid.uuid4())[:8]
    player2_id = str(uuid.uuid4())[:8]

    player1 = Player(
        player_id=player1_id,
        name="MCTS AI",
        card_class=CardClass.MAGE,
    )
    player2 = Player(
        player_id=player2_id,
        name="Greedy AI",
        card_class=CardClass.WARRIOR,
    )

    game = Game(
        game_id=str(uuid.uuid4()),
        player1=player1,
        player2=player2,
    )

    all_cards = CardDatabase.get_all_cards()
    import random
    deck_cards = random.sample(all_cards, 15) * 2

    for i, card in enumerate(deck_cards[:30]):
        instance = CardInstance(
            instance_id=f"{player1_id}_card_{i}",
            card=card,
            zone=player1_id,
            controller_id=player1_id,
        )
        player1.deck.append(instance)

    for i, card in enumerate(deck_cards[30:]):
        instance = CardInstance(
            instance_id=f"{player2_id}_card_{i}",
            card=card,
            zone=player2_id,
            controller_id=player2_id,
        )
        player2.deck.append(instance)

    for _ in range(3):
        if player1.deck:
            player1.hand.append(player1.deck.pop(0))
        if player2.deck:
            player2.hand.append(player2.deck.pop(0))

    print(f"\n{player1.name} ({player1.card_class.name}) vs {player2.name} ({player2.card_class.name})")

    ai1 = MCTSPlayer(player1_id, iterations=50)
    ai2 = GreedyAI(player2_id)
    executor = ActionExecutor(game)

    turn_count = 0
    max_turns = 20

    while not game.state.game_over and turn_count < max_turns:
        current_player_id = game.state.current_player_id
        current_player = game.state.players[current_player_id]

        print(f"\n--- 回合 {turn_count + 1}: {current_player.name} ---")
        print(f"  法力: {current_player.mana}/{current_player.max_mana}")
        print(f"  生命值: {current_player.health}")
        print(f"  手牌数量: {len(current_player.hand)}")
        print(f"  场上随从: {len(current_player.battlefield)}")

        if current_player_id == player1_id:
            action = ai1.choose_action(game.state)
        else:
            action = ai2.choose_action(game.state)

        if action is None:
            print("  动作: 结束回合")
            executor.end_turn(current_player_id)
            turn_count += 1
            continue

        action_type = action.get("type")

        if action_type == "play_card":
            card_name = action.get("name", "Unknown")
            print(f"  动作: 打出 {card_name}")
            executor.play_card(current_player_id, action["card_instance_id"])
        elif action_type == "attack":
            attacker_name = action.get("attacker_name", "Unknown")
            target_name = action.get("target_name", "Unknown")
            print(f"  动作: {attacker_name} 攻击 {target_name}")
            executor.attack(current_player_id, action["attacker_id"], action["target_id"])
        elif action_type == "hero_power":
            print("  动作: 使用英雄技能")
            executor.use_hero_power(current_player_id)
        elif action_type == "end_turn":
            print("  动作: 结束回合")
            executor.end_turn(current_player_id)
            turn_count += 1

    print("\n" + "=" * 60)
    if game.state.winner_id:
        winner = game.state.players[game.state.winner_id]
        print(f"游戏结束! 胜者: {winner.name}")
    else:
        print("游戏结束! 平局")
    print(f"总回合数: {turn_count}")
    print(f"最终状态 - {player1.name}: {player1.health}HP, {player2.name}: {player2.health}HP")


def demo_balance_simulation():
    """演示平衡模拟"""
    print("\n" + "=" * 60)
    print("卡组平衡模拟演示")
    print("=" * 60)

    simulator = BalanceSimulator()

    print("\n开始模拟法师 vs 战士的对战 (10场)...")
    results = simulator.simulate_matchup(CardClass.MAGE, CardClass.WARRIOR, num_games=10)

    print(f"\n模拟结果:")
    print(f"  法师胜率: {results['deck1_win_rate']:.1%}")
    print(f"  战士胜率: {results['deck2_win_rate']:.1%}")
    print(f"  平均回合数: {results['avg_turns']:.1f}")
    print(f"  法师平均剩余血量: {results['deck1_avg_health']:.1f}")
    print(f"  战士平均剩余血量: {results['deck2_avg_health']:.1f}")


def demo_replay_system():
    """演示回放系统"""
    print("\n" + "=" * 60)
    print("回放系统演示")
    print("=" * 60)

    replay_manager = ReplayManager()

    print("\n回放管理器已初始化")
    print("可用回放列表:")

    replays = replay_manager.list_replays()
    if replays:
        for replay in replays:
            print(f"  - {replay['players']} (胜者: {replay['winner']}, 回合: {replay['turns']})")
    else:
        print("  (暂无回放)")


def main():
    """主函数"""
    print("\n" + "#" * 60)
    print("#" + " " * 58 + "#")
    print("#" + "卡牌对战游戏核心引擎 v1.0".center(58) + "#")
    print("#" + " " * 58 + "#")
    print("#" * 60)

    demo_card_database()
    demo_deck_validation()
    demo_ai_game()
    demo_balance_simulation()
    demo_replay_system()

    print("\n" + "=" * 60)
    print("演示完成!")
    print("=" * 60)


if __name__ == "__main__":
    main()
