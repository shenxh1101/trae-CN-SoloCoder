from __future__ import annotations
import os
import sys
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass

from ..core import Game, GameState, Player, CardInstance, Card, CardClass, CardType, Zone
from ..engine import ActionExecutor
from ..ai import MCTSPlayer, GreedyAI
from ..deck import CardDatabase, DeckValidator


class CLIGameUI:
    def __init__(self):
        self.database = CardDatabase()
        self.validator = DeckValidator()
        self.current_game: Optional[Game] = None
        self.executor: Optional[ActionExecutor] = None
        self.human_player_id: Optional[str] = None
        self.ai_player_id: Optional[str] = None
        self.ai = None
        self.card_cache: Dict[str, Card] = {}
        self._init_card_cache()

    def _init_card_cache(self):
        for card in self.database.cards:
            self.card_cache[card.card_id] = card

    def clear_screen(self):
        os.system('cls' if os.name == 'nt' else 'clear')

    def print_header(self, title: str):
        print("\n" + "=" * 70)
        print(f"  {title}")
        print("=" * 70)

    def print_menu(self, options: List[str]):
        for i, option in enumerate(options, 1):
            print(f"  {i}. {option}")
        print()

    def get_input(self, prompt: str, validator: Optional[Callable] = None) -> str:
        while True:
            try:
                choice = input(f"\n{prompt}: ").strip()
                if validator and not validator(choice):
                    print("  无效输入，请重试。")
                    continue
                return choice
            except (EOFError, KeyboardInterrupt):
                print("\n\n  退出游戏...")
                sys.exit(0)

    def get_int_input(self, prompt: str, min_val: int, max_val: int) -> int:
        def validator(x: str) -> bool:
            return x.isdigit() and min_val <= int(x) <= max_val
        return int(self.get_input(prompt, validator))

    def main_menu(self):
        self.clear_screen()
        self.print_header("🃏 卡牌对战游戏 - 主菜单")
        print("""
  欢迎来到卡牌对战游戏！

  游戏特色：
  • 58 张精心设计的卡牌
  • 19 种不同的卡牌效果
  • 智能 AI 对手 (MCTS + 贪婪算法)
  • 完整的天梯匹配系统
  • 丰富的成就系统
  • 游戏回放功能
        """)

        options = [
            "开始对战 (vs AI)",
            "查看卡牌数据库",
            "卡组构建器",
            "天梯系统",
            "成就系统",
            "游戏回放",
            "退出游戏"
        ]

        self.print_menu(options)
        choice = self.get_int_input("请选择操作", 1, len(options))

        handlers = {
            1: self.start_vs_ai_game,
            2: self.view_card_database,
            3: self.deck_builder,
            4: self.ladder_system,
            5: self.achievement_system,
            6: self.replay_system,
            7: sys.exit
        }

        handlers.get(choice, lambda: None)()

    def start_vs_ai_game(self):
        self.clear_screen()
        self.print_header("⚔️ 开始对战 - 选择职业")

        classes = [
            ("法师", CardClass.MAGE, "🔮"),
            ("战士", CardClass.WARRIOR, "⚔️"),
            ("牧师", CardClass.PRIEST, "✨"),
            ("术士", CardClass.WARLOCK, "💀"),
            ("盗贼", CardClass.ROGUE, "🗡️")
        ]

        for i, (name, cls, icon) in enumerate(classes, 1):
            print(f"  {i}. {icon} {name}")

        choice = self.get_int_input("选择你的职业", 1, len(classes))
        player_class = classes[choice - 1][1]
        player_name = self.get_input("输入你的名字", lambda x: len(x) > 0)

        print("\n选择 AI 难度：")
        difficulties = ["简单 (Greedy AI)", "中等 (MCTS - 100 迭代)", "困难 (MCTS - 300 迭代)"]
        self.print_menu(difficulties)
        diff_choice = self.get_int_input("选择难度", 1, 3)

        ai_classes = [c for c in classes if c[1] != player_class]
        import random
        ai_class = random.choice(ai_classes)[1]

        self._create_game(player_name, player_class, "AI对手", ai_class, diff_choice)
        self._run_game()

    def _create_game(self, player1_name: str, player1_class: CardClass,
                     player2_name: str, player2_class: CardClass, ai_difficulty: int):
        import uuid
        self.human_player_id = "human_" + str(uuid.uuid4())[:8]
        self.ai_player_id = "ai_" + str(uuid.uuid4())[:8]

        player1 = Player(
            player_id=self.human_player_id,
            name=player1_name,
            card_class=player1_class
        )
        player2 = Player(
            player_id=self.ai_player_id,
            name=player2_name,
            card_class=player2_class
        )

        game_id = "game_" + str(uuid.uuid4())[:8]
        self.current_game = Game(game_id=game_id, player1=player1, player2=player2)
        self.executor = ActionExecutor(self.current_game)

        self._populate_deck(player1)
        self._populate_deck(player2)

        self._start_game()

        if ai_difficulty == 1:
            self.ai = GreedyAI(self.ai_player_id)
        elif ai_difficulty == 2:
            self.ai = MCTSPlayer(self.ai_player_id, iterations=100)
        else:
            self.ai = MCTSPlayer(self.ai_player_id, iterations=300)

    def _populate_deck(self, player: Player):
        import random
        import uuid
        available_cards = [c for c in self.database.cards
                          if c.card_class in [CardClass.NEUTRAL, player.card_class]]

        deck_cards = []
        for _ in range(30):
            card = random.choice(available_cards)
            instance = CardInstance(
                instance_id=f"{player.player_id}_deck_{uuid.uuid4().hex[:8]}",
                card=card,
                zone=Zone.DECK,
                controller_id=player.player_id
            )
            deck_cards.append(instance)

        random.shuffle(deck_cards)
        player.deck = deck_cards

    def _start_game(self):
        import random
        for player in self.current_game.state.players.values():
            for _ in range(3):
                if player.deck:
                    card = player.deck.pop(0)
                    card.zone = Zone.HAND
                    player.hand.append(card)

            player.max_mana = 1
            player.mana = 1

        if random.random() > 0.5:
            self.current_game.state.current_player_id = self.human_player_id
        else:
            self.current_game.state.current_player_id = self.ai_player_id

    def _run_game(self):
        while not self.current_game.state.game_over:
            self.clear_screen()

            if self.current_game.state.current_player_id == self.human_player_id:
                self._display_game_state()
                self._human_turn()
            else:
                self._display_game_state()
                print("\n  AI 正在思考...")
                self._ai_turn()

        self._display_game_result()
        input("\n  按回车键返回主菜单...")
        self.main_menu()

    def _display_game_state(self):
        state = self.current_game.state
        human = state.players[self.human_player_id]
        ai = state.players[self.ai_player_id]

        print(f"\n  回合 {state.turn} | 当前: {state.get_current_player().name}")
        print("-" * 70)

        print(f"\n  【{ai.name}】 ({ai.card_class.name})")
        print(f"    ❤️ {ai.health}/{ai.max_health} | 🛡️ {getattr(ai, 'armor', 0)} | 💎 {ai.mana}/{ai.max_mana}")
        print(f"    手牌: {len(ai.hand)} | 牌库: {len(ai.deck)} | 墓地: {len(ai.graveyard)}")

        if ai.battlefield:
            print(f"    战场:")
            for m in ai.battlefield:
                status = []
                if m.taunt: status.append("🛡️")
                if m.divine_shield: status.append("✨")
                if m.charge: status.append("⚡")
                if m.poisonous: status.append("☠️")
                if m.lifesteal: status.append("💚")
                if m.windfury: status.append("🌪️")
                if m.reborn: status.append("🔄")
                if m.frozen: status.append("❄️")
                if m.exhausted: status.append("😴")
                status_str = " ".join(status)
                print(f"      [{m.attack}/{m.health}] {m.card.name} {status_str}")
        else:
            print(f"    战场: 空")

        print("\n" + "-" * 70)

        if human.battlefield:
            print(f"    战场:")
            for i, m in enumerate(human.battlefield):
                status = []
                if m.taunt: status.append("🛡️")
                if m.divine_shield: status.append("✨")
                if m.charge: status.append("⚡")
                if m.poisonous: status.append("☠️")
                if m.lifesteal: status.append("💚")
                if m.windfury: status.append("🌪️")
                if m.reborn: status.append("🔄")
                if m.frozen: status.append("❄️")
                if m.exhausted: status.append("😴")
                status_str = " ".join(status)
                can_attack = not m.exhausted and not m.frozen
                attack_icon = "⚔️ " if can_attack else "   "
                print(f"      {attack_icon}{i+1}. [{m.attack}/{m.health}] {m.card.name} {status_str}")
        else:
            print(f"    战场: 空")

        print(f"\n  【{human.name}】 ({human.card_class.name})")
        print(f"    ❤️ {human.health}/{human.max_health} | 🛡️ {getattr(human, 'armor', 0)} | 💎 {human.mana}/{human.max_mana}")
        print(f"    手牌: {len(human.hand)} | 牌库: {len(human.deck)} | 墓地: {len(human.graveyard)}")

        if human.hand:
            print(f"    手牌:")
            for i, card in enumerate(human.hand):
                playable = human.mana >= card.card.cost
                playable_icon = "✅" if playable else "❌"
                type_icon = "👤" if card.card.card_type == CardType.MINION else "📜" if card.card.card_type == CardType.SPELL else "🗡️"
                stats = ""
                if card.card.card_type == CardType.MINION:
                    stats = f" [{card.card.attack}/{card.card.health}]"
                print(f"      {playable_icon} {i+1}. {type_icon} ({card.card.cost}费){stats} {card.card.name}")
                if card.card.description:
                    print(f"           {card.card.description}")

    def _human_turn(self):
        human = self.current_game.state.players[self.human_player_id]

        while True:
            print("\n" + "=" * 70)
            print("  你的回合")
            print("=" * 70)

            options = ["打出卡牌", "使用随从攻击", "使用英雄技能", "结束回合", "投降"]
            self.print_menu(options)

            choice = self.get_int_input("选择操作", 1, 5)

            if choice == 1:
                self._play_card_action()
            elif choice == 2:
                self._attack_action()
            elif choice == 3:
                self._hero_power_action()
            elif choice == 4:
                self.executor.end_turn(self.human_player_id)
                break
            elif choice == 5:
                self.current_game.state.game_over = True
                self.current_game.state.winner_id = self.ai_player_id
                break

    def _play_card_action(self):
        human = self.current_game.state.players[self.human_player_id]

        if not human.hand:
            print("  没有手牌！")
            return

        playable_cards = [(i, c) for i, c in enumerate(human.hand) if human.mana >= c.card.cost]

        if not playable_cards:
            print("  没有足够的法力值打出任何卡牌！")
            return

        print("\n  可打出的卡牌：")
        for idx, (i, card) in enumerate(playable_cards, 1):
            type_icon = "👤" if card.card.card_type == CardType.MINION else "📜" if card.card.card_type == CardType.SPELL else "🗡️"
            stats = ""
            if card.card.card_type == CardType.MINION:
                stats = f" [{card.card.attack}/{card.card.health}]"
            print(f"    {idx}. {type_icon} ({card.card.cost}费){stats} {card.card.name}")

        choice = self.get_int_input("选择要打出的卡牌 (0取消)", 0, len(playable_cards))

        if choice == 0:
            return

        card_idx, card = playable_cards[choice - 1]
        success = self.executor.play_card(self.human_player_id, card.instance_id)

        if success:
            print(f"  ✅ 成功打出 {card.card.name}！")
        else:
            print(f"  ❌ 无法打出 {card.card.name}！")

        self._check_game_over()

    def _attack_action(self):
        human = self.current_game.state.players[self.human_player_id]
        ai = self.current_game.state.players[self.ai_player_id]

        attackers = [m for m in human.battlefield if not m.exhausted and not m.frozen]

        if not attackers:
            print("  没有可以攻击的随从！")
            return

        print("\n  可攻击的随从：")
        for i, attacker in enumerate(attackers, 1):
            print(f"    {i}. [{attacker.attack}/{attacker.health}] {attacker.card.name}")

        attacker_choice = self.get_int_input("选择攻击的随从 (0取消)", 0, len(attackers))

        if attacker_choice == 0:
            return

        attacker = attackers[attacker_choice - 1]

        has_taunt = any(m.taunt for m in ai.battlefield)

        if has_taunt:
            targets = [m for m in ai.battlefield if m.taunt]
            print("\n  必须先攻击嘲讽随从！")
        else:
            targets = list(ai.battlefield)
            print(f"\n  可攻击目标：")
            print(f"    0. 敌方英雄 ({ai.health} 生命值)")

        for i, target in enumerate(targets, 1):
            print(f"    {i}. [{target.attack}/{target.health}] {target.card.name}")

        target_choice = self.get_int_input("选择目标", 0, len(targets))

        if target_choice == 0:
            if has_taunt:
                print("  必须先攻击嘲讽随从！")
                return
            target_id = ai.player_id
        else:
            target_id = targets[target_choice - 1].instance_id

        success = self.executor.attack(self.human_player_id, attacker.instance_id, target_id)

        if success:
            print(f"  ⚔️ {attacker.card.name} 攻击成功！")
        else:
            print(f"  ❌ 攻击失败！")

        self._check_game_over()

    def _hero_power_action(self):
        human = self.current_game.state.players[self.human_player_id]

        if human.hero_power_used:
            print("  本回合已经使用过英雄技能！")
            return

        if human.mana < 2:
            print("  法力值不足！")
            return

        print(f"\n  使用 {human.card_class.name} 英雄技能")

        success = self.executor.use_hero_power(self.human_player_id)

        if success:
            print(f"  ✅ 英雄技能使用成功！")
        else:
            print(f"  ❌ 英雄技能使用失败！")

        self._check_game_over()

    def _ai_turn(self):
        ai = self.current_game.state.players[self.ai_player_id]

        action_count = 0
        while (self.current_game.state.current_player_id == self.ai_player_id and
               not self.current_game.state.game_over and
               action_count < 5):
            action = self.ai.choose_action(self.current_game.state)

            if action is None or action.get("type") == "end_turn":
                self.executor.end_turn(self.ai_player_id)
                break

            if action["type"] == "play_card":
                card = self.current_game.state.get_card_by_instance_id(action["card_instance_id"])
                if card:
                    self.executor.play_card(self.ai_player_id, action["card_instance_id"])
                    print(f"  🤖 AI 打出了 {card.card.name}")
            elif action["type"] == "attack":
                attacker = self.current_game.state.get_card_by_instance_id(action["attacker_id"])
                target = self.current_game.state.get_card_by_instance_id(action["target_id"])
                target_name = target.card.name if target else "英雄"
                self.executor.attack(self.ai_player_id, action["attacker_id"], action["target_id"])
                if attacker:
                    print(f"  🤖 AI 的 {attacker.card.name} 攻击了 {target_name}")
            elif action["type"] == "hero_power":
                self.executor.use_hero_power(self.ai_player_id)
                print(f"  🤖 AI 使用了英雄技能")

            action_count += 1
            self._check_game_over()

    def _check_game_over(self):
        if self.current_game.state.game_over:
            return

        for player in self.current_game.state.players.values():
            if player.health <= 0:
                self.current_game.state.game_over = True
                opponent = self.current_game.state.get_opponent(player.player_id)
                if opponent.health > 0:
                    self.current_game.state.winner_id = opponent.player_id
                break

    def _display_game_result(self):
        self.clear_screen()
        self.print_header("🏆 对战结束")

        winner = None
        if self.current_game.state.winner_id:
            winner = self.current_game.state.players[self.current_game.state.winner_id]

        if winner:
            if winner.player_id == self.human_player_id:
                print("\n  🎉 恭喜你获胜了！")
            else:
                print(f"\n  😢 {winner.name} 获胜了！")
        else:
            print("\n  平局！")

        human = self.current_game.state.players[self.human_player_id]
        ai = self.current_game.state.players[self.ai_player_id]

        print(f"\n  最终状态：")
        print(f"    {human.name}: {human.health}/{human.max_health} 生命值")
        print(f"    {ai.name}: {ai.health}/{ai.max_health} 生命值")
        print(f"    总回合数: {self.current_game.state.turn}")
        print(f"    总动作数: {len(self.current_game.action_history)}")

    def view_card_database(self):
        self.clear_screen()
        self.print_header("📚 卡牌数据库")

        total = len(self.database.cards)
        print(f"\n  总卡牌数: {total}")

        print("\n  按职业分类：")
        classes = [CardClass.NEUTRAL, CardClass.MAGE, CardClass.WARRIOR,
                   CardClass.PRIEST, CardClass.WARLOCK, CardClass.ROGUE]
        for cls in classes:
            count = len([c for c in self.database.cards if c.card_class == cls])
            print(f"    {cls.name}: {count} 张")

        print("\n  按类型分类：")
        for ctype in [CardType.MINION, CardType.SPELL, CardType.WEAPON]:
            count = len([c for c in self.database.cards if c.card.card_type == ctype])
            print(f"    {ctype.name}: {count} 张")

        print("\n  按效果分类：")
        from ..core.enums import EffectType
        implemented = set()
        for card in self.database.cards:
            for effect in card.effects:
                implemented.add(effect.effect_type)
        print(f"    已实现效果类型: {len(implemented)} / {len(EffectType)}")
        for eff in sorted(implemented, key=lambda x: x.name):
            count = len([c for c in self.database.cards
                        if any(e.effect_type == eff for e in c.effects)])
            print(f"      ✓ {eff.name}: {count} 张")

        print("\n" + "=" * 70)
        options = ["查看所有卡牌", "按职业查看", "按费用查看", "搜索卡牌", "返回主菜单"]
        self.print_menu(options)

        choice = self.get_int_input("选择操作", 1, 5)

        if choice == 1:
            self._display_cards(self.database.cards)
        elif choice == 2:
            self._view_cards_by_class()
        elif choice == 3:
            self._view_cards_by_cost()
        elif choice == 4:
            self._search_cards()

        if choice != 5:
            input("\n  按回车键继续...")
            self.view_card_database()

    def _display_cards(self, cards: List[Card]):
        print(f"\n  显示 {len(cards)} 张卡牌：")
        for i, card in enumerate(cards, 1):
            type_icon = "👤" if card.card_type == CardType.MINION else "📜" if card.card_type == CardType.SPELL else "🗡️"
            class_color = self._get_class_color(card.card_class)
            stats = ""
            if card.card_type == CardType.MINION:
                stats = f" [{card.attack}/{card.health}]"
            rarity_stars = "★" * {"common": 1, "rare": 2, "epic": 3, "legendary": 4}.get(card.rarity, 1)
            print(f"\n  {i}. {type_icon} ({card.cost}费){stats} {card.name} {rarity_stars}")
            print(f"     职业: {card.card_class.name} | 类型: {card.card_type.name}")
            if card.description:
                print(f"     效果: {card.description}")
            if card.effects:
                effects_str = ", ".join([e.effect_type.name for e in card.effects])
                print(f"     效果类型: {effects_str}")

    def _get_class_color(self, card_class: CardClass) -> str:
        colors = {
            CardClass.MAGE: "\033[94m",
            CardClass.WARRIOR: "\033[91m",
            CardClass.PRIEST: "\033[97m",
            CardClass.WARLOCK: "\033[95m",
            CardClass.ROGUE: "\033[93m",
            CardClass.NEUTRAL: "\033[92m"
        }
        return colors.get(card_class, "\033[0m")

    def _view_cards_by_class(self):
        classes = [CardClass.NEUTRAL, CardClass.MAGE, CardClass.WARRIOR,
                   CardClass.PRIEST, CardClass.WARLOCK, CardClass.ROGUE]
        print("\n  选择职业：")
        for i, cls in enumerate(classes, 1):
            print(f"    {i}. {cls.name}")

        choice = self.get_int_input("选择职业", 1, len(classes))
        selected_class = classes[choice - 1]
        cards = [c for c in self.database.cards if c.card_class == selected_class]
        self._display_cards(cards)

    def _view_cards_by_cost(self):
        cost = self.get_int_input("输入费用 (0-10)", 0, 10)
        cards = [c for c in self.database.cards if c.cost == cost]
        self._display_cards(cards)

    def _search_cards(self):
        keyword = self.get_input("输入搜索关键词", lambda x: len(x) > 0).lower()
        cards = [c for c in self.database.cards
                if keyword in c.name.lower() or keyword in c.description.lower()]
        self._display_cards(cards)

    def deck_builder(self):
        self.clear_screen()
        self.print_header("🃏 卡组构建器")

        classes = [CardClass.MAGE, CardClass.WARRIOR, CardClass.PRIEST,
                   CardClass.WARLOCK, CardClass.ROGUE]
        print("\n  选择职业：")
        for i, cls in enumerate(classes, 1):
            print(f"    {i}. {cls.name}")

        choice = self.get_int_input("选择职业", 1, len(classes))
        selected_class = classes[choice - 1]

        available_cards = [c for c in self.database.cards
                          if c.card_class in [CardClass.NEUTRAL, selected_class]]

        deck = []
        card_counts = {}

        while len(deck) < 30:
            self.clear_screen()
            self.print_header(f"🃏 卡组构建 - {selected_class.name}")
            print(f"\n  卡组进度: {len(deck)}/30")

            if deck:
                print(f"\n  当前卡组：")
                for i, card in enumerate(deck, 1):
                    print(f"    {i}. ({card.cost}费) {card.name}")

                cost_curve = [0] * 11
                for card in deck:
                    cost_curve[min(card.cost, 10)] += 1
                print(f"\n  费用曲线：")
                for cost in range(11):
                    bar = "█" * cost_curve[cost]
                    print(f"    {cost}费: {bar} ({cost_curve[cost]})")

            print(f"\n  可用卡牌：")
            for i, card in enumerate(available_cards[:20], 1):
                count = card_counts.get(card.card_id, 0)
                max_count = 1 if card.rarity == "legendary" else 2
                type_icon = "👤" if card.card_type == CardType.MINION else "📜" if card.card_type == CardType.SPELL else "🗡️"
                stats = ""
                if card.card_type == CardType.MINION:
                    stats = f" [{card.attack}/{card.health}]"
                print(f"    {i}. {type_icon} ({card.cost}费){stats} {card.name} (已选: {count}/{max_count})")

            print("\n  操作：")
            print("    输入卡牌编号添加到卡组")
            print("    输入 'r' + 编号 从卡组移除")
            print("    输入 'd' 完成卡组")
            print("    输入 'q' 取消")

            cmd = self.get_input("输入命令").lower()

            if cmd == 'q':
                break
            elif cmd == 'd':
                if len(deck) == 30:
                    print(f"\n  ✅ 卡组完成！")
                    result = self.validator.validate([c.card_id for c in deck])
                    print(f"  验证结果: {'通过' if result.is_valid else '失败'}")
                    if not result.is_valid:
                        for err in result.errors:
                            print(f"    ❌ {err}")
                    for warn in result.warnings:
                        print(f"    ⚠️ {warn}")
                    input("\n  按回车键继续...")
                else:
                    print(f"  ❌ 卡组需要30张卡牌，当前 {len(deck)} 张！")
                    input("\n  按回车键继续...")
                break
            elif cmd.startswith('r'):
                try:
                    idx = int(cmd[1:]) - 1
                    if 0 <= idx < len(deck):
                        removed = deck.pop(idx)
                        card_counts[removed.card_id] -= 1
                        print(f"  ✅ 移除了 {removed.name}")
                except (ValueError, IndexError):
                    pass
            else:
                try:
                    idx = int(cmd) - 1
                    if 0 <= idx < len(available_cards):
                        card = available_cards[idx]
                        max_count = 1 if card.rarity == "legendary" else 2
                        if card_counts.get(card.card_id, 0) < max_count:
                            deck.append(card)
                            card_counts[card.card_id] = card_counts.get(card.card_id, 0) + 1
                            print(f"  ✅ 添加了 {card.name}")
                        else:
                            print(f"  ❌ {card.name} 已达最大数量！")
                except (ValueError, IndexError):
                    pass

        input("\n  按回车键返回主菜单...")
        self.main_menu()

    def ladder_system(self):
        self.clear_screen()
        self.print_header("🏆 天梯系统")

        print("""
  天梯系统介绍：
  • 通过对战获得或失去天梯积分 (MMR)
  • 根据积分划分不同段位
  • 每个赛季重置一次段位
  • 高段位可以获得丰厚奖励

  段位系统：
  • 青铜: 0-999 分
  • 白银: 1000-1999 分
  • 黄金: 2000-2999 分
  • 铂金: 3000-3999 分
  • 钻石: 4000-4999 分
  • 大师: 5000+ 分
  • 传说: 服务器前 100 名

  匹配机制：
  • 根据 MMR 进行匹配
  • 匹配相近积分的对手
  • 连胜可以获得额外积分
        """)

        input("\n  按回车键返回主菜单...")
        self.main_menu()

    def achievement_system(self):
        self.clear_screen()
        self.print_header("🏅 成就系统")

        achievements = [
            ("初出茅庐", "完成第一场对战", False),
            ("首胜", "赢得第一场对战", False),
            ("卡牌收藏家", "收集 100 张不同的卡牌", False),
            ("卡组大师", "构建一个完整的卡组", False),
            ("连胜达人", "获得 5 连胜", False),
            ("天梯新星", "达到白银段位", False),
            ("常胜将军", "累计赢得 10 场对战", False),
            ("传说之路", "达到黄金段位", False),
            ("伤害之王", "单局造成 50 点伤害", False),
            ("不死之身", "单局恢复 30 点生命值", False),
            ("嘲讽大师", "单局召唤 5 个嘲讽随从", False),
            ("OTK", "一回合造成 30 点伤害", False),
        ]

        unlocked = sum(1 for _, _, unlocked in achievements if unlocked)
        print(f"\n  成就进度: {unlocked}/{len(achievements)}")
        print()

        for i, (name, desc, unlocked) in enumerate(achievements, 1):
            status = "✅" if unlocked else "🔒"
            print(f"  {status} {i}. {name}")
            print(f"     {desc}")
            if unlocked:
                print(f"     已解锁！")

        input("\n  按回车键返回主菜单...")
        self.main_menu()

    def replay_system(self):
        self.clear_screen()
        self.print_header("🎬 游戏回放")

        print("""
  回放系统功能：
  • 保存和查看之前的对战
  • 逐帧回放对战过程
  • 导出和导入回放文件

  系统正在完善中...
        """)

        input("\n  按回车键返回主菜单...")
        self.main_menu()


def main():
    ui = CLIGameUI()
    try:
        ui.main_menu()
    except Exception as e:
        print(f"\n  ❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        input("\n  按回车键退出...")


if __name__ == "__main__":
    main()
