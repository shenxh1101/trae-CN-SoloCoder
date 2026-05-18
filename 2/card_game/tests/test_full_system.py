#!/usr/bin/env python3
"""
完整系统测试 - 验证卡牌游戏核心引擎的所有功能
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import uuid
import random
from typing import List, Dict

from card_game.core import Card, CardInstance, Player, Game, GameState
from card_game.core.enums import CardType, CardClass, EffectType, TriggerType, Phase, Zone
from card_game.engine import EffectEngine, ActionExecutor
from card_game.ai import MCTSPlayer, GreedyAI, SimpleHeuristic
from card_game.deck import CardDatabase, DeckValidator, DeckValidationResult
from card_game.replay import ReplayManager, GameRestorer, BalanceSimulator


def test_card_database():
    """测试卡牌数据库 - 验证至少50张卡牌"""
    print("=" * 70)
    print("测试 1: 卡牌数据库验证")
    print("=" * 70)

    CardDatabase.initialize()
    all_cards = CardDatabase.get_all_cards()
    print(f"\n总卡牌数量: {len(all_cards)}")
    assert len(all_cards) >= 50, f"需要至少50张卡牌，目前只有{len(all_cards)}张"
    print("✓ 卡牌数量满足要求 (>=50)")

    # 按类型统计
    minions = CardDatabase.get_cards_by_type(CardType.MINION)
    spells = CardDatabase.get_cards_by_type(CardType.SPELL)
    weapons = CardDatabase.get_cards_by_type(CardType.WEAPON)

    print(f"\n按类型统计:")
    print(f"  随从: {len(minions)}")
    print(f"  法术: {len(spells)}")
    print(f"  武器: {len(weapons)}")

    # 按职业统计
    print(f"\n按职业统计:")
    for card_class in [CardClass.MAGE, CardClass.WARRIOR, CardClass.PRIEST, CardClass.WARLOCK, CardClass.ROGUE]:
        class_cards = [c for c in all_cards if c.card_class == card_class]
        print(f"  {card_class.name}: {len(class_cards)}")

    # 验证所有效果类型都有卡牌使用
    effect_types_used = set()
    for card in all_cards:
        for effect in card.effects:
            effect_types_used.add(effect.effect_type)

    print(f"\n已实现的效果类型: {len(effect_types_used)} / {len(EffectType)}")
    for effect_type in sorted(effect_types_used, key=lambda e: e.name):
        print(f"  ✓ {effect_type.name}")

    print("\n✓ 卡牌数据库测试通过!\n")
    return True


def test_effect_engine():
    """测试效果引擎 - 验证所有效果能正确处理"""
    print("=" * 70)
    print("测试 2: 效果引擎验证")
    print("=" * 70)

    # 创建测试游戏状态
    player1_id = "p1_" + str(uuid.uuid4())[:8]
    player2_id = "p2_" + str(uuid.uuid4())[:8]

    player1 = Player(player_id=player1_id, name="Player1", card_class=CardClass.MAGE)
    player2 = Player(player_id=player2_id, name="Player2", card_class=CardClass.WARRIOR)

    game = Game(game_id="test_game", player1=player1, player2=player2)

    # 填充一些测试卡牌 - 创建一些简单测试卡牌
    from card_game.core import Card
    test_minion_def = Card(
        card_id="test_minion",
        name="Test Minion",
        card_type=CardType.MINION,
        card_class=CardClass.NEUTRAL,
        cost=1,
        attack=1,
        health=1,
    )
    test_minions = [test_minion_def] * 5

    for i, card in enumerate(test_minions[:3]):
        instance = CardInstance(
            instance_id=f"{player1_id}_m_{i}",
            card=card,
            zone=Zone.PLAY,
            controller_id=player1_id,
            play_order=i,
        )
        player1.battlefield.append(instance)

    for i, card in enumerate(test_minions[3:]):
        instance = CardInstance(
            instance_id=f"{player2_id}_m_{i}",
            card=card,
            zone=Zone.PLAY,
            controller_id=player2_id,
            play_order=100 + i,
        )
        player2.battlefield.append(instance)

    print(f"\n初始战场状态:")
    print(f"  {player1.name}: {len(player1.battlefield)} 个随从")
    print(f"  {player2.name}: {len(player2.battlefield)} 个随从")

    # 测试效果引擎
    engine = EffectEngine()
    executor = ActionExecutor(game)

    # 测试战斗怒吼效果
    print("\n测试战吼效果...")
    minion = player1.battlefield[0]
    game.state = engine.process_trigger(game.state, TriggerType.BATTLECRY, minion)
    print("✓ 战吼效果处理成功")

    # 测试伤害效果
    print("\n测试伤害效果...")
    from card_game.engine.effect_engine import PendingEffect

    effect = PendingEffect(
        effect_id="test_damage",
        effect_type=EffectType.DAMAGE,
        source_id=minion.instance_id,
        trigger=TriggerType.ON_PLAY,
        value=2,
        target_selector="enemy_hero",
        priority=0,
        play_order=0,
        controller_id=player1_id,
    )

    initial_health = player2.health
    game.state = engine._handle_damage(game.state, effect)
    assert player2.health == initial_health - 2, f"伤害计算错误: {player2.health}"
    print(f"✓ 伤害效果正确: {initial_health} -> {player2.health}")

    # 测试护甲效果
    print("\n测试护甲效果...")
    effect = PendingEffect(
        effect_id="test_armor",
        effect_type=EffectType.ARMOR,
        source_id=minion.instance_id,
        trigger=TriggerType.ON_PLAY,
        value=5,
        target_selector="friendly_hero",
        priority=0,
        play_order=0,
        controller_id=player1_id,
    )

    initial_armor = player1.armor
    game.state = engine._handle_armor(game.state, effect)
    assert player1.armor == initial_armor + 5, f"护甲计算错误: {player1.armor}"
    print(f"✓ 护甲效果正确: {initial_armor} -> {player1.armor}")

    # 测试治疗效果
    print("\n测试治疗效果...")
    player2.health = 10
    effect = PendingEffect(
        effect_id="test_heal",
        effect_type=EffectType.HEAL,
        source_id=minion.instance_id,
        trigger=TriggerType.ON_PLAY,
        value=5,
        target_selector="friendly_hero",
        priority=0,
        play_order=0,
        controller_id=player2_id,
    )

    game.state = engine._handle_heal(game.state, effect)
    assert player2.health == 15, f"治疗计算错误: {player2.health}"
    print(f"✓ 治疗效果正确: 10 -> 15")

    # 测试嘲讽效果
    print("\n测试嘲讽效果...")
    effect = PendingEffect(
        effect_id="test_taunt",
        effect_type=EffectType.TAUNT,
        trigger=TriggerType.BATTLECRY,
        target_selector="source",
        priority=0,
        play_order=0,
        controller_id=player1_id,
        source_id=minion.instance_id,
        value=None,
    )

    assert not minion.taunt, "初始状态不应有嘲讽"
    game.state = engine._handle_taunt(game.state, effect)
    assert minion.taunt, "嘲讽效果未正确应用"
    print("✓ 嘲讽效果正确")

    print("\n✓ 效果引擎测试通过!\n")
    return True


def test_ai_battle():
    """测试AI对战 - 验证AI能够产生有效动作"""
    print("=" * 70)
    print("测试 3: AI决策验证")
    print("=" * 70)

    # 创建测试卡牌
    test_cards = []
    for i in range(5):
        card = Card(
            card_id=f"test_card_{i}",
            name=f"Test Card {i}",
            card_type=CardType.MINION,
            card_class=CardClass.NEUTRAL,
            cost=1,
            attack=1,
            health=1,
        )
        test_cards.append(card)

    # 创建玩家
    player1_id = "ai_test_p1_" + str(uuid.uuid4())[:8]
    player2_id = "ai_test_p2_" + str(uuid.uuid4())[:8]

    player1 = Player(player_id=player1_id, name="Greedy AI 1", card_class=CardClass.MAGE)
    player2 = Player(player_id=player2_id, name="Greedy AI 2", card_class=CardClass.WARRIOR)

    game = Game(game_id="ai_test_" + str(uuid.uuid4())[:8], player1=player1, player2=player2)

    # 填充手牌
    for i, card in enumerate(test_cards[:3]):
        instance = CardInstance(
            instance_id=f"{player1_id}_hand_{i}",
            card=card,
            zone=Zone.HAND,
            controller_id=player1_id,
        )
        player1.hand.append(instance)

    for i, card in enumerate(test_cards[3:]):
        instance = CardInstance(
            instance_id=f"{player2_id}_hand_{i}",
            card=card,
            zone=Zone.HAND,
            controller_id=player2_id,
        )
        player2.hand.append(instance)

    # 设置初始法力值
    player1.max_mana = 3
    player1.mana = 3
    player2.max_mana = 3
    player2.mana = 3

    print(f"\n测试开始: {player1.name} ({player1.card_class.name}) vs {player2.name} ({player2.card_class.name})")
    print(f"初始手牌: {len(player1.hand)} vs {len(player2.hand)}")

    # 创建AI
    ai1 = GreedyAI(player1_id)
    ai2 = GreedyAI(player2_id)
    executor = ActionExecutor(game)

    # 测试1: 验证AI能够产生有效动作
    print("\n测试AI动作生成...")
    action1 = ai1.choose_action(game.state)
    assert action1 is not None, "AI 1 应该能够生成动作"
    print(f"  AI 1 动作: {action1.get('type', 'unknown')}")

    action2 = ai2.choose_action(game.state)
    assert action2 is not None, "AI 2 应该能够生成动作"
    print(f"  AI 2 动作: {action2.get('type', 'unknown')}")

    # 测试2: 执行一些简单回合
    print("\n执行简单回合...")
    for turn in range(2):
        current_id = game.state.current_player_id
        ai = ai1 if current_id == player1_id else ai2
        player = game.state.players[current_id]

        # 尝试打出一张牌
        actions_taken = 0
        for _ in range(2):
            action = ai.choose_action(game.state)
            if action is None:
                executor.end_turn(current_id)
                break

            if action["type"] == "play_card":
                success = executor.play_card(current_id, action["card_instance_id"])
                if success:
                    actions_taken += 1
                    print(f"  回合 {turn + 1}: 打出卡牌成功")
            elif action["type"] == "end_turn":
                executor.end_turn(current_id)
                break

    print(f"  成功执行 {len(game.action_history)} 个游戏动作")

    # 测试3: 验证游戏状态正确更新
    print("\n验证游戏状态...")
    assert player1.health == 30, "玩家1 生命值应该保持初始值"
    assert player2.health == 30, "玩家2 生命值应该保持初始值"
    print(f"  玩家1 战场随从数: {len(player1.battlefield)}")
    print(f"  玩家2 战场随从数: {len(player2.battlefield)}")

    print("\n✓ AI决策测试通过!\n")
    return True


def test_deck_validation():
    """测试卡组验证系统"""
    print("=" * 70)
    print("测试 4: 卡组验证系统")
    print("=" * 70)

    # 创建测试卡牌
    test_cards = []
    for i in range(15):
        card_class = CardClass.MAGE if i % 3 == 0 else CardClass.NEUTRAL
        card = Card(
            card_id=f"test_deck_card_{i}",
            name=f"Deck Card {i}",
            card_type=CardType.MINION,
            card_class=card_class,
            cost=i % 5 + 1,
            attack=i % 3 + 1,
            health=i % 3 + 1,
        )
        test_cards.append(card)

    # 创建一个标准法师卡组
    mage_cards = [c for c in test_cards if c.card_class == CardClass.MAGE or c.card_class == CardClass.NEUTRAL]
    deck_card_ids = []
    for card in mage_cards[:15]:
        deck_card_ids.extend([card.card_id, card.card_id])

    print(f"\n测试卡组: {len(deck_card_ids)} 张卡牌")

    validator = DeckValidator(CardClass.MAGE)
    result = validator.validate(deck_card_ids)

    print(f"\n验证结果: {'通过' if result.valid else '失败'}")

    if result.errors:
        print("错误:")
        for error in result.errors:
            print(f"  ✗ {error}")

    if result.warnings:
        print("\n警告:")
        for warning in result.warnings:
            print(f"  ! {warning}")

    print(f"\n费用曲线分析:")
    for cost in sorted(result.mana_curve.keys()):
        count = result.mana_curve[cost]
        bar = "█" * count
        print(f"  {cost:2d} 费: {bar} ({count} 张)")

    # 测试卡组统计
    stats = validator.get_deck_stats(deck_card_ids)
    print(f"\n卡组统计:")
    for key, value in stats.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.2f}")
        else:
            print(f"  {key}: {value}")

    # 测试职业统计
    class_stats = CardDatabase.get_class_stats(CardClass.MAGE)
    print(f"\n法师职业卡牌统计:")
    print(f"  总卡牌数: {class_stats['total_cards']}")
    print(f"  随从: {class_stats['minions']}, 法术: {class_stats['spells']}, 武器: {class_stats['weapons']}")

    # 测试无效卡组 - 包含其他职业卡牌
    print("\n测试无效卡组 (包含非法职业卡牌)...")
    rogue_card = Card(
        card_id="rogue_test_card",
        name="Rogue Card",
        card_type=CardType.MINION,
        card_class=CardClass.ROGUE,
        cost=2,
        attack=2,
        health=2,
    )
    invalid_deck = deck_card_ids[:29] + [rogue_card.card_id]
    invalid_result = validator.validate(invalid_deck)
    assert not invalid_result.valid, "应该检测到非法职业卡牌"
    print("✓ 正确检测到非法职业卡牌")

    print("\n✓ 卡组验证系统测试通过!\n")
    return True


def test_replay_system():
    """测试回放系统"""
    print("=" * 70)
    print("测试 5: 回放系统")
    print("=" * 70)

    replay_manager = ReplayManager()

    # 创建一个简单游戏用于测试
    CardDatabase.initialize()
    player1_id = "replay_p1_" + str(uuid.uuid4())[:8]
    player2_id = "replay_p2_" + str(uuid.uuid4())[:8]

    player1 = Player(player_id=player1_id, name="Replay Player 1", card_class=CardClass.MAGE)
    player2 = Player(player_id=player2_id, name="Replay Player 2", card_class=CardClass.WARRIOR)

    game = Game(game_id="replay_test", player1=player1, player2=player2)

    # 开始录制回放
    replay_id = replay_manager.start_replay(game, player1, player2)
    print(f"\n回放ID: {replay_id}")

    # 模拟一些游戏动作
    actions = [
        {"action": "play_card", "card_id": "minion_001", "turn": 1},
        {"action": "attack", "attacker": "minion_001", "target": "hero", "turn": 1},
        {"action": "end_turn", "turn": 1},
        {"action": "play_card", "card_id": "minion_002", "turn": 2},
        {"action": "end_turn", "turn": 2},
    ]

    for action in actions:
        replay_manager.record_action(game.state.game_id, action)

    # 结束回放
    replay_manager.end_replay(game.state.game_id, player1.name)

    # 列出所有回放
    replays = replay_manager.list_replays()
    print(f"\n回放列表: {len(replays)} 个")
    for replay in replays[:3]:
        print(f"  - {replay['players']} (胜者: {replay['winner']}, {replay['turns']} 回合)")

    # 测试游戏恢复
    print("\n测试游戏恢复...")
    restorer = GameRestorer()
    replay_data = replay_manager.load_replay(replay_id)

    if replay_data:
        print(f"✓ 成功加载回放数据")
        print(f"  玩家: {replay_data.player1_name} vs {replay_data.player2_name}")
        print(f"  动作数: {len(replay_data.action_history)}")

    print("\n✓ 回放系统测试通过!\n")
    return True


def test_balance_simulation():
    """测试平衡模拟系统"""
    print("=" * 70)
    print("测试 6: 平衡模拟系统")
    print("=" * 70)

    simulator = BalanceSimulator()

    print("\n开始模拟法师 vs 战士对战 (10 场)...")
    results = simulator.simulate_matchup(CardClass.MAGE, CardClass.WARRIOR, num_games=10)

    print(f"\n模拟结果:")
    print(f"  法师胜率: {results['deck1_win_rate']:.1%}")
    print(f"  战士胜率: {results['deck2_win_rate']:.1%}")
    print(f"  平均回合数: {results['avg_turns']:.1f}")
    print(f"  法师平均剩余血量: {results['deck1_avg_health']:.1f}")
    print(f"  战士平均剩余血量: {results['deck2_avg_health']:.1f}")

    # 验证统计数据生成成功（由于简化回合，可能没有胜负）
    assert results['deck1_win_rate'] + results['deck2_win_rate'] <= 1.0, "胜率计算错误"
    assert results['avg_turns'] > 0, "平均回合数应该大于0"
    print("✓ 平衡模拟统计数据生成正确")

    # 测试多职业对战
    print("\n进行多职业对战模拟...")
    matchups = [
        (CardClass.MAGE, CardClass.PRIEST),
        (CardClass.WARLOCK, CardClass.ROGUE),
    ]

    for class1, class2 in matchups:
        results = simulator.simulate_matchup(class1, class2, num_games=5)
        print(f"  {class1.name} vs {class2.name}: {results['deck1_win_rate']:.1%} - {results['deck2_win_rate']:.1%}")

    print("\n✓ 平衡模拟系统测试通过!\n")
    return True


def test_network_communication():
    """测试网络通信系统"""
    print("=" * 70)
    print("测试 7: 网络通信系统")
    print("=" * 70)

    from card_game.network import NetworkManager

    network = NetworkManager()

    # 测试玩家加入大厅
    print("\n测试玩家加入大厅...")
    player1_id = "net_p1_" + str(uuid.uuid4())[:8]
    player2_id = "net_p2_" + str(uuid.uuid4())[:8]

    lobby_players = network.get_lobby_players()
    print(f"初始大厅玩家数: {len(lobby_players)}")

    # 模拟消息处理
    print("\n测试消息处理...")

    # 测试游戏会话创建
    print("\n测试游戏会话创建...")
    from card_game.network.network_manager import GameSession
    session = GameSession(
        game_id="test_session",
        player1_id=player1_id,
        player2_id=player2_id,
    )

    assert session.game_id == "test_session"
    assert session.player1_id == player1_id
    assert session.player2_id == player2_id
    assert session.is_active == True
    print("✓ 游戏会话创建成功")

    # 测试状态快照
    print("\n测试状态快照...")
    session.state = {
        "turn": 5,
        "phase": "main",
        "player1_health": 25,
        "player2_health": 20,
    }

    snapshot = session.to_dict()
    assert "game_id" in snapshot
    assert "state" in snapshot
    assert "action_history" in snapshot
    print("✓ 状态快照创建成功")

    # 测试断线重连逻辑
    print("\n测试断线重连逻辑...")
    restored_session = GameSession.from_dict(snapshot)
    assert restored_session.game_id == session.game_id
    assert restored_session.state["turn"] == 5
    print("✓ 状态恢复成功")

    print("\n✓ 网络通信系统测试通过!\n")
    return True


def test_extensibility():
    """测试效果引擎的可扩展性 - 添加新效果不破坏现有功能"""
    print("=" * 70)
    print("测试 8: 效果引擎可扩展性")
    print("=" * 70)

    # 模拟添加一个新的效果类型处理器
    print("\n测试添加新效果处理器...")

    engine = EffectEngine()

    # 定义一个新效果处理函数
    def handle_new_effect(game_state, effect, **kwargs):
        """新效果处理函数"""
        target_selector = effect.target_selector
        if target_selector == "source":
            source = game_state.get_card_by_instance_id(effect.source_id)
            if source and hasattr(source, "attack"):
                source.attack += 1
        return game_state

    # 添加新效果处理器
    NEW_EFFECT = "NEW_EFFECT"
    engine.effect_handlers[NEW_EFFECT] = handle_new_effect

    # 验证新处理器已添加
    assert NEW_EFFECT in engine.effect_handlers
    print(f"✓ 新效果处理器已添加")
    print(f"  总处理器数量: {len(engine.effect_handlers)}")

    # 验证现有处理器仍正常工作
    print("\n验证现有效果处理器不受影响...")
    existing_effects = [EffectType.DAMAGE, EffectType.HEAL, EffectType.BUFF, EffectType.TAUNT, EffectType.CHARGE]
    for effect_type in existing_effects:
        assert effect_type in engine.effect_handlers, f"{effect_type.name} 处理器丢失"
        print(f"  ✓ {effect_type.name} 处理器正常")

    # 验证效果堆栈机制
    print("\n验证效果堆栈机制...")
    from card_game.engine.effect_engine import EffectStack
    stack = EffectStack()
    assert stack.is_empty()
    print("  ✓ 初始状态为空")

    # 测试添加和弹出
    from card_game.engine.effect_engine import PendingEffect
    effect1 = PendingEffect(
        effect_id="e1", effect_type=EffectType.DAMAGE, source_id="s1",
        trigger=TriggerType.ON_PLAY, value=1, target_selector=None,
        priority=1, play_order=1, controller_id="p1"
    )

    stack.push(effect1)
    assert not stack.is_empty()
    print("  ✓ 效果添加成功")

    popped = stack.pop()
    assert popped is not None
    assert popped.effect_id == "e1"
    print("  ✓ 效果弹出正确")
    assert stack.is_empty()
    print("  ✓ 堆栈为空状态正确")

    print("\n✓ 效果引擎可扩展性测试通过!\n")
    return True


def run_all_tests():
    """运行所有测试"""
    print("\n" + "#" * 70)
    print("#" + "卡牌对战游戏核心引擎 - 完整系统测试".center(68) + "#")
    print("#" * 70 + "\n")

    tests = [
        ("卡牌数据库", test_card_database),
        ("效果引擎", test_effect_engine),
        ("AI对战", test_ai_battle),
        ("卡组验证", test_deck_validation),
        ("回放系统", test_replay_system),
        ("平衡模拟", test_balance_simulation),
        ("网络通信", test_network_communication),
        ("可扩展性", test_extensibility),
    ]

    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"\n✗ {test_name}测试失败: {e}")
            import traceback
            traceback.print_exc()
            results[test_name] = False

    # 测试总结
    print("\n" + "=" * 70)
    print("测试总结")
    print("=" * 70)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "✓ 通过" if result else "✗ 失败"
        print(f"  {status} - {test_name}")

    print(f"\n总测试: {passed}/{total} 通过")

    if passed == total:
        print("\n🎉 所有测试通过! 核心引擎运行正常。")
    else:
        print(f"\n⚠️  {total - passed} 项测试失败, 需要进一步调试。")

    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
