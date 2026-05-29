const CLASS_DATA = {
    warrior: { name: '战士', emoji: '⚔️', maxHp: 120, attack: 15, defense: 10 },
    mage: { name: '法师', emoji: '🔮', maxHp: 80, attack: 20, defense: 5 },
    ranger: { name: '游侠', emoji: '🏹', maxHp: 100, attack: 18, defense: 7 }
};

const GameEngine = {
    state: {
        player: null,
        currentScenario: null,
        currentScene: null,
        visitedScenes: [],
        battleLog: [],
        gameOver: false,
        ending: null,
        selectedClass: null,
        selectedScenario: null,
        inBattle: false,
        currentEnemy: null,
        isDefending: false,
        typewriterActive: false
    },

    init() {
        Settings.init();
        AudioManager.init();
        this.checkContinueButton();
    },

    checkContinueButton() {
        const btn = document.getElementById('continue-btn');
        if (btn) {
            btn.style.display = Storage.hasSave() ? 'flex' : 'none';
        }
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    },

    showMainMenu() {
        this.closeAllModals();
        this.showScreen('main-menu');
        this.checkContinueButton();
    },

    showCharacterCreation() {
        AudioManager.playButton();
        this.state.selectedClass = null;
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        document.getElementById('player-name').value = '';
        document.getElementById('confirm-class-btn').disabled = true;
        this.showScreen('character-creation');
    },

    selectClass(className) {
        AudioManager.playButton();
        this.state.selectedClass = className;
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        document.querySelector(`.class-card[data-class="${className}"]`).classList.add('selected');
        this.updateConfirmButton();
    },

    updateConfirmButton() {
        const nameInput = document.getElementById('player-name');
        const btn = document.getElementById('confirm-class-btn');
        const hasName = nameInput.value.trim().length > 0;
        const hasClass = this.state.selectedClass !== null;
        btn.disabled = !(hasName && hasClass);
    },

    confirmCharacter() {
        const name = document.getElementById('player-name').value.trim();
        if (!name || !this.state.selectedClass) return;

        AudioManager.playButton();
        const classData = CLASS_DATA[this.state.selectedClass];
        this.state.player = {
            name: name,
            class: this.state.selectedClass,
            className: classData.name,
            classEmoji: classData.emoji,
            maxHp: classData.maxHp,
            currentHp: classData.maxHp,
            baseAttack: classData.attack,
            baseDefense: classData.defense,
            inventory: [],
            equipment: { weapon: null, armor: null }
        };

        this.showScenarioSelection();
    },

    showScenarioSelection() {
        this.state.selectedScenario = null;
        document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('selected'));
        document.getElementById('start-game-btn').disabled = true;
        this.showScreen('scenario-selection');
    },

    selectScenario(scenarioId) {
        AudioManager.playButton();
        this.state.selectedScenario = scenarioId;
        document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('selected'));
        document.querySelector(`.scenario-card[data-scenario="${scenarioId}"]`).classList.add('selected');
        document.getElementById('start-game-btn').disabled = false;
    },

    startGame() {
        if (!this.state.selectedScenario || !this.state.player) return;

        AudioManager.playDice();
        this.state.currentScenario = this.state.selectedScenario;
        this.state.currentScene = null;
        this.state.visitedScenes = [];
        this.state.battleLog = [];
        this.state.gameOver = false;
        this.state.ending = null;
        this.state.inBattle = false;
        this.state.currentEnemy = null;
        this.state.isDefending = false;

        const scenario = SCENARIOS[this.state.currentScenario];
        this.showScreen('game-screen');
        this.loadScene(scenario.startScene);
    },

    getPlayerAttack() {
        let attack = this.state.player.baseAttack;
        if (this.state.player.equipment.weapon) {
            attack += this.state.player.equipment.weapon.effect.attack || 0;
        }
        return attack;
    },

    getPlayerDefense() {
        let defense = this.state.player.baseDefense;
        if (this.state.player.equipment.armor) {
            defense += this.state.player.equipment.armor.effect.defense || 0;
        }
        return defense;
    },

    loadScene(sceneId) {
        const scenario = SCENARIOS[this.state.currentScenario];
        const scene = scenario.scenes[sceneId];
        if (!scene) {
            console.error('Scene not found:', sceneId);
            return;
        }

        this.state.currentScene = sceneId;
        const isFirstVisit = !this.state.visitedScenes.includes(sceneId);
        if (isFirstVisit) {
            this.state.visitedScenes.push(sceneId);
        }

        this.state.inBattle = false;
        this.state.isDefending = false;

        if (isFirstVisit && scene.items && scene.items.length > 0) {
            scene.items.forEach(item => {
                this.addItemToInventory({ ...item });
            });
        }

        this.updateUI();

        document.getElementById('scene-title').textContent = scene.title;
        
        const descEl = document.getElementById('scene-description');
        this.typeText(descEl, scene.description);

        const battleContainer = document.getElementById('battle-container');
        const choicesContainer = document.getElementById('choices-container');

        if (scene.type === 'ending') {
            battleContainer.style.display = 'none';
            choicesContainer.style.display = 'none';
            setTimeout(() => {
                this.showGameOver(scene);
            }, 2000);
        } else if (scene.type === 'battle') {
            battleContainer.style.display = 'block';
            choicesContainer.style.display = 'none';
            this.startBattle(scene);
        } else {
            battleContainer.style.display = 'none';
            choicesContainer.style.display = 'grid';
            this.renderChoices(scene.choices);
        }

        this.autoSave();
        this.addLog(`📍 ${scene.title}`);
    },

    typeText(element, text, speed = 20) {
        this.state.typewriterActive = true;
        element.textContent = '';
        let index = 0;
        const type = () => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
                setTimeout(type, speed);
            } else {
                this.state.typewriterActive = false;
            }
        };
        type();
    },

    renderChoices(choices) {
        const container = document.getElementById('choices-container');
        container.innerHTML = '';
        choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            btn.onclick = () => this.makeChoice(index);
            container.appendChild(btn);
        });
    },

    makeChoice(index) {
        if (this.state.typewriterActive) return;
        AudioManager.playButton();

        const scenario = SCENARIOS[this.state.currentScenario];
        const scene = scenario.scenes[this.state.currentScene];
        const choice = scene.choices[index];
        if (choice && choice.nextScene) {
            this.loadScene(choice.nextScene);
        }
    },

    startBattle(scene) {
        this.state.inBattle = true;
        this.state.isDefending = false;
        this.state.currentEnemy = { ...scene.enemy };

        document.getElementById('enemy-avatar').textContent = scene.enemy.emoji;
        document.getElementById('enemy-name').textContent = scene.enemy.name;
        this.updateEnemyHp();
        this.updateBattleButtons(true);

        this.addLog(`⚔️ 战斗开始！${scene.enemy.name}出现了！`);
        AudioManager.playAttack();
    },

    updateEnemyHp() {
        const enemy = this.state.currentEnemy;
        if (!enemy) return;
        const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
        document.getElementById('enemy-hp-bar').style.width = Math.max(0, hpPercent) + '%';
        document.getElementById('enemy-hp-value').textContent = `${Math.max(0, enemy.currentHp)}/${enemy.maxHp}`;
    },

    updateBattleButtons(enabled) {
        document.querySelectorAll('.battle-btn').forEach(btn => {
            btn.disabled = !enabled;
        });
    },

    rollDice() {
        const diceEl = document.getElementById('dice-roll');
        diceEl.classList.add('rolling');
        AudioManager.playDice();
        setTimeout(() => diceEl.classList.remove('rolling'), 500);
        return Math.floor(Math.random() * 20) + 1;
    },

    calculateDamage(attackerAtk, defenderDef) {
        const diceRoll = this.rollDice();
        const hitChance = diceRoll + attackerAtk;
        const dodgeChance = 10 + defenderDef;

        if (diceRoll === 20) {
            const damage = attackerAtk * 2;
            return { hit: true, critical: true, damage, diceRoll };
        } else if (diceRoll === 1) {
            return { hit: false, critical: false, damage: 0, diceRoll };
        } else if (hitChance > dodgeChance) {
            const damage = Math.max(1, attackerAtk - Math.floor(defenderDef / 2));
            return { hit: true, critical: false, damage, diceRoll };
        } else {
            return { hit: false, critical: false, damage: 0, diceRoll };
        }
    },

    playerAttack() {
        if (!this.state.inBattle) return;
        this.updateBattleButtons(false);
        this.state.isDefending = false;

        const playerAtk = this.getPlayerAttack();
        const result = this.calculateDamage(playerAtk, this.state.currentEnemy.defense);

        setTimeout(() => {
            if (result.critical) {
                this.addLog(`🎲 掷出${result.diceRoll}！⚡暴击！你造成了${result.damage}点伤害！`, 'critical');
                AudioManager.playCritical();
                this.showDamageNumber(result.damage, 'critical');
            } else if (result.hit) {
                this.addLog(`🎲 掷出${result.diceRoll}！你命中了${this.state.currentEnemy.name}，造成${result.damage}点伤害！`, 'damage');
                AudioManager.playAttack();
                this.showDamageNumber(result.damage, 'damage');
            } else {
                this.addLog(`🎲 掷出${result.diceRoll}！你的攻击未命中！`, 'miss');
                AudioManager.playMiss();
            }

            this.state.currentEnemy.currentHp -= result.damage;
            this.updateEnemyHp();

            if (this.state.currentEnemy.currentHp <= 0) {
                this.battleVictory();
            } else {
                setTimeout(() => this.enemyAttack(), 800);
            }
        }, 300);
    },

    playerDefend() {
        if (!this.state.inBattle) return;
        this.updateBattleButtons(false);
        this.state.isDefending = true;

        this.addLog('🛡️ 你举起防御，准备抵挡敌人的攻击！', 'heal');
        AudioManager.playDice();

        setTimeout(() => this.enemyAttack(), 800);
    },

    enemyAttack() {
        const enemy = this.state.currentEnemy;
        const playerDef = this.getPlayerDefense();

        const result = this.calculateDamage(enemy.attack, playerDef);

        setTimeout(() => {
            let finalDamage = result.damage;
            
            if (result.hit && this.state.isDefending) {
                finalDamage = Math.floor(finalDamage / 2);
                if (finalDamage < 1 && result.damage > 0) finalDamage = 1;
            }
            
            if (result.critical) {
                const defText = this.state.isDefending ? '（防御中）' : '';
                this.addLog(`🎲 ${enemy.name}掷出${result.diceRoll}${defText}！⚡暴击！你受到${finalDamage}点伤害！`, 'critical');
                AudioManager.playHit();
                this.showDamageNumber(finalDamage, 'damage');
            } else if (result.hit) {
                const defText = this.state.isDefending ? '（防御中，伤害减半）' : '';
                this.addLog(`🎲 ${enemy.name}掷出${result.diceRoll}${defText}！你受到${finalDamage}点伤害！`, 'damage');
                AudioManager.playHit();
                this.showDamageNumber(finalDamage, 'damage');
            } else {
                this.addLog(`🎲 ${enemy.name}掷出${result.diceRoll}！${enemy.name}的攻击未命中！`, 'miss');
                AudioManager.playMiss();
            }

            this.state.player.currentHp -= finalDamage;
            if (this.state.player.currentHp < 0) this.state.player.currentHp = 0;
            this.updateUI();

            if (this.state.player.currentHp <= 0) {
                this.battleDefeat();
            } else {
                this.state.isDefending = false;
                this.updateBattleButtons(true);
            }
        }, 300);
    },

    playerFlee() {
        if (!this.state.inBattle) return;
        AudioManager.playDice();

        const diceRoll = this.rollDice();
        if (diceRoll >= 10) {
            this.addLog(`🎲 掷出${diceRoll}！你成功逃离了战斗！`, 'heal');
            this.state.inBattle = false;
            document.getElementById('battle-container').style.display = 'none';
            document.getElementById('choices-container').style.display = 'grid';

            const scenario = SCENARIOS[this.state.currentScenario];
            const scene = scenario.scenes[this.state.currentScene];
            if (scene.choices && scene.choices.length > 0) {
                this.renderChoices(scene.choices);
            } else {
                this.addLog('你无处可逃......');
                this.state.currentEnemy.currentHp = this.state.currentEnemy.maxHp;
                this.updateEnemyHp();
                this.updateBattleButtons(true);
            }
        } else {
            this.addLog(`🎲 掷出${diceRoll}！逃跑失败！`, 'damage');
            this.updateBattleButtons(false);
            setTimeout(() => this.enemyAttack(), 800);
        }
    },

    useBattleItem() {
        if (!this.state.inBattle) return;
        const potions = this.state.player.inventory.filter(i => i.type === 'potion');
        if (potions.length === 0) {
            this.addLog('你没有可使用的药水！', 'miss');
            return;
        }

        const potion = potions[0];
        this.useItemDirect(potion);
        this.updateBattleButtons(false);
        setTimeout(() => this.enemyAttack(), 800);
    },

    battleVictory() {
        this.state.inBattle = false;
        this.state.currentEnemy = null;
        AudioManager.playVictory();

        const scenario = SCENARIOS[this.state.currentScenario];
        const scene = scenario.scenes[this.state.currentScene];

        this.addLog(`🏆 你击败了敌人！`, 'critical');

        document.getElementById('battle-container').style.display = 'none';

        if (scene.victoryScene) {
            setTimeout(() => this.loadScene(scene.victoryScene), 1500);
        }
    },

    battleDefeat() {
        this.state.inBattle = false;
        AudioManager.playDefeat();

        const scenario = SCENARIOS[this.state.currentScenario];
        const scene = scenario.scenes[this.state.currentScene];

        if (scene.defeatScene) {
            this.loadScene(scene.defeatScene);
        } else {
            this.showGameOver({
                type: 'ending',
                ending: 'death',
                endingTitle: '战斗失败',
                endingMessage: '你在战斗中倒下了......但不要放弃，每一次失败都是新的开始。'
            });
        }
    },

    showDamageNumber(amount, type) {
        if (amount <= 0) return;
        const num = document.createElement('div');
        num.className = `damage-number ${type}`;
        num.textContent = type === 'heal' ? `+${amount}` : `-${amount}`;
        
        const mainPanel = document.querySelector('.main-panel');
        if (mainPanel) {
            const rect = mainPanel.getBoundingClientRect();
            num.style.left = rect.left + rect.width / 2 + (Math.random() * 100 - 50) + 'px';
            num.style.top = rect.top + rect.height / 2 + (Math.random() * 50 - 25) + 'px';
        } else {
            num.style.left = '50%';
            num.style.top = '50%';
        }
        
        document.body.appendChild(num);
        setTimeout(() => num.remove(), 1000);
    },

    addItemToInventory(item, silent = false) {
        const existing = this.state.player.inventory.find(i => i.id === item.id);
        if (existing) {
            existing.count = (existing.count || 1) + 1;
        } else {
            const newItem = { ...item };
            newItem.count = 1;
            this.state.player.inventory.push(newItem);
        }
        if (!silent) {
            this.addLog(`📦 获得物品：${item.emoji} ${item.name}`, 'heal');
            AudioManager.playItem();
        }
    },

    removeItemFromInventory(itemId) {
        const index = this.state.player.inventory.findIndex(i => i.id === itemId);
        if (index !== -1) {
            const item = this.state.player.inventory[index];
            if (item.count > 1) {
                item.count--;
            } else {
                this.state.player.inventory.splice(index, 1);
            }
        }
    },

    showItemModal(item) {
        AudioManager.playButton();
        document.getElementById('item-modal-title').textContent = `${item.emoji} ${item.name}`;
        document.getElementById('item-modal-desc').textContent = item.description;

        const useBtn = document.getElementById('item-use-btn');
        useBtn.onclick = () => {
            this.useItem(item);
            this.closeModal('item-modal');
        };

        if (item.type === 'potion') {
            useBtn.textContent = '使用';
        } else if (item.type === 'weapon') {
            useBtn.textContent = '装备';
        } else if (item.type === 'armor') {
            useBtn.textContent = '装备';
        }

        this.openModal('item-modal');
    },

    useItem(item) {
        if (item.type === 'potion') {
            const healAmount = item.effect.hp || 0;
            this.state.player.currentHp = Math.min(
                this.state.player.maxHp,
                this.state.player.currentHp + healAmount
            );
            this.addLog(`🧪 使用了${item.name}，恢复了${healAmount}点生命值！`, 'heal');
            AudioManager.playHeal();
            this.showDamageNumber(healAmount, 'heal');
            this.removeItemFromInventory(item.id);
        } else if (item.type === 'weapon') {
            if (this.state.player.equipment.weapon) {
                this.addItemToInventory(this.state.player.equipment.weapon, true);
            }
            this.state.player.equipment.weapon = { ...item };
            this.removeItemFromInventory(item.id);
            this.addLog(`⚔️ 装备了${item.name}！攻击力+${item.effect.attack}`, 'heal');
            AudioManager.playItem();
        } else if (item.type === 'armor') {
            if (this.state.player.equipment.armor) {
                this.addItemToInventory(this.state.player.equipment.armor, true);
            }
            this.state.player.equipment.armor = { ...item };
            this.removeItemFromInventory(item.id);
            this.addLog(`🛡️ 装备了${item.name}！防御力+${item.effect.defense}`, 'heal');
            AudioManager.playItem();
        }

        this.updateUI();
    },

    useItemDirect(item) {
        if (item.type === 'potion') {
            const healAmount = item.effect.hp || 0;
            this.state.player.currentHp = Math.min(
                this.state.player.maxHp,
                this.state.player.currentHp + healAmount
            );
            this.addLog(`🧪 使用了${item.name}，恢复了${healAmount}点生命值！`, 'heal');
            AudioManager.playHeal();
            this.showDamageNumber(healAmount, 'heal');
            this.removeItemFromInventory(item.id);
        }
        this.updateUI();
    },

    updateUI() {
        const player = this.state.player;
        if (!player) return;

        document.getElementById('character-avatar').textContent = player.classEmoji;
        document.getElementById('character-name').textContent = player.name;
        document.getElementById('character-class').textContent = player.className;

        const hpPercent = (player.currentHp / player.maxHp) * 100;
        document.getElementById('hp-bar').style.width = Math.max(0, hpPercent) + '%';
        document.getElementById('hp-value').textContent = `${Math.max(0, player.currentHp)}/${player.maxHp}`;
        document.getElementById('attack-value').textContent = this.getPlayerAttack();
        document.getElementById('defense-value').textContent = this.getPlayerDefense();

        this.renderInventory();
        this.renderEquipment();
    },

    renderInventory() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';

        const maxSlots = 9;
        for (let i = 0; i < maxSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';

            if (i < this.state.player.inventory.length) {
                const item = this.state.player.inventory[i];
                slot.textContent = item.emoji;
                slot.onclick = () => this.showItemModal(item);

                if (item.count > 1) {
                    const countBadge = document.createElement('span');
                    countBadge.className = 'item-count';
                    countBadge.textContent = item.count;
                    slot.appendChild(countBadge);
                }
            }

            grid.appendChild(slot);
        }
    },

    renderEquipment() {
        const weaponSlot = document.getElementById('weapon-item');
        const armorSlot = document.getElementById('armor-item');

        const weapon = this.state.player.equipment.weapon;
        const armor = this.state.player.equipment.armor;

        weaponSlot.textContent = weapon ? `${weapon.emoji} ${weapon.name}` : '-';
        armorSlot.textContent = armor ? `${armor.emoji} ${armor.name}` : '-';
    },

    addLog(message, type = '') {
        const container = document.getElementById('log-container');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;

        this.state.battleLog.push({ message, type });
    },

    showGameOver(scene) {
        const isVictory = scene.ending !== 'death';
        const title = document.getElementById('gameover-title');
        const message = document.getElementById('gameover-message');
        const stats = document.getElementById('gameover-stats');

        title.textContent = scene.endingTitle || '游戏结束';
        title.className = `gameover-title ${isVictory ? 'victory' : 'defeat'}`;
        message.textContent = scene.endingMessage || '';

        stats.innerHTML = `
            <p>👤 ${this.state.player.name} - ${this.state.player.className}</p>
            <p>❤️ 剩余生命：${this.state.player.currentHp}/${this.state.player.maxHp}</p>
            <p>⚔️ 最终攻击：${this.getPlayerAttack()}</p>
            <p>🛡️ 最终防御：${this.getPlayerDefense()}</p>
            <p>📍 探索场景：${this.state.visitedScenes.length}</p>
            <p>📦 获得物品：${this.state.player.inventory.length}</p>
        `;

        this.state.gameOver = true;
        this.state.ending = scene.ending;
        this.showScreen('game-over');

        if (isVictory) {
            AudioManager.playVictory();
        } else {
            AudioManager.playDefeat();
        }
    },

    restartScenario() {
        if (!this.state.currentScenario) return;
        this.state.currentScene = null;
        this.state.visitedScenes = [];
        this.state.battleLog = [];
        this.state.gameOver = false;
        this.state.ending = null;
        this.state.inBattle = false;
        this.state.currentEnemy = null;
        this.state.isDefending = false;

        const classData = CLASS_DATA[this.state.player.class];
        this.state.player.maxHp = classData.maxHp;
        this.state.player.currentHp = classData.maxHp;
        this.state.player.baseAttack = classData.attack;
        this.state.player.baseDefense = classData.defense;
        this.state.player.inventory = [];
        this.state.player.equipment = { weapon: null, armor: null };

        const scenario = SCENARIOS[this.state.currentScenario];
        this.showScreen('game-screen');
        this.loadScene(scenario.startScene);
    },

    saveGame() {
        if (this.state.gameOver) {
            this.addLog('游戏已结束，无法保存。', 'miss');
            return;
        }

        const gameState = {
            player: this.state.player,
            currentScenario: this.state.currentScenario,
            currentScene: this.state.currentScene,
            visitedScenes: this.state.visitedScenes,
            battleLog: this.state.battleLog.slice(-50),
            gameOver: this.state.gameOver,
            ending: this.state.ending,
            inBattle: this.state.inBattle,
            currentEnemy: this.state.currentEnemy,
            timestamp: new Date().toISOString()
        };

        if (Storage.saveGame(gameState)) {
            this.addLog('💾 游戏已保存！', 'heal');
            AudioManager.playItem();
        } else {
            this.addLog('❌ 保存失败！', 'damage');
        }
    },

    autoSave() {
        if (this.state.gameOver) return;
        const gameState = {
            player: this.state.player,
            currentScenario: this.state.currentScenario,
            currentScene: this.state.currentScene,
            visitedScenes: this.state.visitedScenes,
            battleLog: this.state.battleLog.slice(-50),
            gameOver: this.state.gameOver,
            ending: this.state.ending,
            inBattle: false,
            currentEnemy: null,
            timestamp: new Date().toISOString()
        };
        Storage.saveGame(gameState);
    },

    continueGame() {
        const gameState = Storage.loadGame();
        if (!gameState) {
            alert('没有找到存档！');
            return;
        }

        AudioManager.playButton();
        this.state.player = gameState.player;
        this.state.currentScenario = gameState.currentScenario;
        this.state.currentScene = gameState.currentScene;
        this.state.visitedScenes = gameState.visitedScenes || [];
        this.state.battleLog = gameState.battleLog || [];
        this.state.gameOver = gameState.gameOver || false;
        this.state.ending = gameState.ending || null;
        this.state.inBattle = false;
        this.state.currentEnemy = null;
        this.state.isDefending = false;

        this.showScreen('game-screen');
        document.getElementById('log-container').innerHTML = '';
        this.addLog('📂 存档已加载！');

        this.loadScene(this.state.currentScene);
    },

    confirmQuit() {
        document.getElementById('confirm-title').textContent = '退出游戏';
        document.getElementById('confirm-message').textContent = '确定要退出当前游戏吗？未保存的进度将丢失。';
        document.getElementById('confirm-btn').onclick = () => {
            this.closeModal('confirm-modal');
            this.showMainMenu();
        };
        this.openModal('confirm-modal');
    },

    resetGame() {
        document.getElementById('confirm-title').textContent = '重置游戏';
        document.getElementById('confirm-message').textContent = '确定要清除所有游戏数据吗？此操作不可撤销！';
        document.getElementById('confirm-btn').onclick = () => {
            Storage.clearSave();
            this.state = {
                player: null,
                currentScenario: null,
                currentScene: null,
                visitedScenes: [],
                battleLog: [],
                gameOver: false,
                ending: null,
                selectedClass: null,
                selectedScenario: null,
                inBattle: false,
                currentEnemy: null,
                isDefending: false,
                typewriterActive: false
            };
            this.closeModal('confirm-modal');
            this.closeModal('settings-modal');
            this.showMainMenu();
            alert('游戏数据已清除！');
        };
        this.openModal('confirm-modal');
    },

    showHelp() {
        AudioManager.playButton();
        this.openModal('help-modal');
    },

    showSettings() {
        AudioManager.playButton();
        Settings.apply();
        this.openModal('settings-modal');
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    GameEngine.init();

    const nameInput = document.getElementById('player-name');
    if (nameInput) {
        nameInput.addEventListener('input', () => GameEngine.updateConfirmButton());
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                GameEngine.confirmCharacter();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            GameEngine.closeAllModals();
        }
    });
});
