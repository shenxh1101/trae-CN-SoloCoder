const SCENARIOS = {
    dungeon: {
        id: 'dungeon',
        name: '地牢逃生',
        startScene: 'dungeon_start',
        scenes: {
            dungeon_start: {
                id: 'dungeon_start',
                title: '黑暗牢房',
                description: '你在一阵剧痛中醒来，发现自己被关在一间阴暗潮湿的牢房里。冰冷的铁链束缚着你的手腕，空气中弥漫着腐臭的气味。远处传来水滴落在石头上的声音，偶尔还能听到某种低沉的咆哮。你注意到牢房的墙角有一块松动的石头，而铁门上的锁似乎已经锈蚀了大半。',
                type: 'normal',
                choices: [
                    { text: '🪨 尝试撬动松动的石头，寻找密道', nextScene: 'dungeon_secret' },
                    { text: '🔓 用力拉扯锈蚀的铁锁', nextScene: 'dungeon_door' },
                    { text: '👂 安静下来，倾听远处的声音', nextScene: 'dungeon_listen' }
                ]
            },
            dungeon_secret: {
                id: 'dungeon_secret',
                title: '隐秘通道',
                description: '你费力地撬开松动的石头，发现后面竟然是一条狭窄的通道！通道漆黑一片，但你感到一阵微弱的气流，说明通道的另一端是通的。你挤进通道，在黑暗中摸索前进。突然，你的手触碰到了一个冰冷的金属物体——是一把被遗忘的匕首！',
                type: 'normal',
                items: [{ id: 'rust_dagger', name: '锈蚀匕首', type: 'weapon', description: '一把锈迹斑斑的匕首，虽然破旧但依然锋利', effect: { attack: 3 }, emoji: '🗡️' }],
                choices: [
                    { text: '🔦 继续沿通道前进', nextScene: 'dungeon_tunnel' },
                    { text: '↩️ 回到牢房重新考虑', nextScene: 'dungeon_start' }
                ]
            },
            dungeon_door: {
                id: 'dungeon_door',
                title: '铁门之外',
                description: '你用力拉扯铁锁，锁链发出刺耳的吱嘎声。经过几次尝试，锈蚀的锁终于被你拉断了！铁门吱呀一声打开，外面是一条昏暗的走廊。走廊两侧排列着更多的牢房，大部分都空着。你注意到走廊尽头分成了两条路——左边传来微弱的光亮，右边则传来某种低沉的呼吸声。',
                type: 'normal',
                choices: [
                    { text: '💡 走向有光的方向', nextScene: 'dungeon_guard' },
                    { text: '⚠️ 小心地向呼吸声方向移动', nextScene: 'dungeon_beast' }
                ]
            },
            dungeon_listen: {
                id: 'dungeon_listen',
                title: '倾听黑暗',
                description: '你屏住呼吸，仔细聆听。远处的咆哮声时断时续，似乎来自地牢的深处。你还听到了脚步声——沉重的、有节奏的脚步声，正在朝你的方向走来。是守卫！你必须在守卫到来之前行动。你注意到牢房角落有一堆腐烂的稻草，以及一根从墙上突出的铁钉。',
                type: 'normal',
                choices: [
                    { text: '🧹 藏在稻草堆中，等待守卫离开', nextScene: 'dungeon_hide' },
                    { text: '📌 拔出墙上的铁钉作为武器，准备战斗', nextScene: 'dungeon_ambush' }
                ]
            },
            dungeon_tunnel: {
                id: 'dungeon_tunnel',
                title: '地下暗河',
                description: '通道越来越宽，最终你来到了一个地下洞穴。洞穴中有一条暗河，水流湍急但看起来可以涉水而过。河对岸有一个石阶，似乎通向地面。然而，你注意到水中有什么东西在移动——水蛇！不过它们看起来并不具有攻击性。',
                type: 'normal',
                choices: [
                    { text: '🏊 涉水过河，快速通过', nextScene: 'dungeon_river' },
                    { text: '🏔️ 沿着河岸寻找另一条路', nextScene: 'dungeon_shore' }
                ]
            },
            dungeon_guard: {
                id: 'dungeon_guard',
                title: '守卫室',
                description: '你沿着走廊来到一个灯火通明的房间——守卫室。一名穿着皮甲的地牢守卫正背对着你坐在桌前，似乎在打瞌睡。桌上放着一串钥匙和一些食物。守卫旁边还挂着一把长剑和一面盾牌。你可以趁机偷取装备，或者直接攻击守卫。',
                type: 'normal',
                choices: [
                    { text: '🗡️ 偷取长剑和盾牌，然后悄悄离开', nextScene: 'dungeon_steal' },
                    { text: '⚔️ 攻击毫无防备的守卫！', nextScene: 'dungeon_fight_guard' },
                    { text: '🍞 偷取食物，悄悄绕过守卫', nextScene: 'dungeon_sneak' }
                ]
            },
            dungeon_beast: {
                id: 'dungeon_beast',
                title: '地牢魔兽',
                description: '你小心地向呼吸声方向移动，来到一间更大的房间。一只巨大的地牢鼠正趴在一堆骨头旁边打盹！它的体型足有普通狗那么大，灰色的皮毛下是结实的肌肉。在它身后，你看到了一个通往上方的楼梯口。你必须面对这只魔兽才能逃出去！',
                type: 'battle',
                enemy: { name: '地牢魔兽鼠', emoji: '🐀', maxHp: 40, currentHp: 40, attack: 8, defense: 4 },
                victoryScene: 'dungeon_after_beast',
                defeatScene: 'dungeon_death'
            },
            dungeon_hide: {
                id: 'dungeon_hide',
                title: '稻草中的发现',
                description: '你钻进稻草堆中，屏住呼吸。守卫的脚步声越来越近，最终停在你的牢房前。你听到守卫嘟囔着什么，然后脚步声逐渐远去。等守卫走远后，你从稻草堆中爬出来——却发现稻草堆里藏着一个小瓶子！上面写着"生命药水"。',
                type: 'normal',
                items: [{ id: 'health_potion_1', name: '小型生命药水', type: 'potion', description: '一瓶散发着淡淡红光的药水，可恢复30点生命值', effect: { hp: 30 }, emoji: '🧪' }],
                choices: [
                    { text: '🔓 趁守卫离开，尝试打开牢门', nextScene: 'dungeon_door' },
                    { text: '🪨 继续搜索牢房，寻找更多线索', nextScene: 'dungeon_secret' }
                ]
            },
            dungeon_ambush: {
                id: 'dungeon_ambush',
                title: '伏击守卫',
                description: '你从墙上拔出铁钉，紧握在手中。脚步声越来越近，你躲在门后等待时机。当守卫经过时，你猛然冲出——但守卫反应很快，他拔出武器与你对峙！',
                type: 'battle',
                enemy: { name: '地牢守卫', emoji: '💂', maxHp: 50, currentHp: 50, attack: 10, defense: 6 },
                victoryScene: 'dungeon_after_guard',
                defeatScene: 'dungeon_death'
            },
            dungeon_river: {
                id: 'dungeon_river',
                title: '涉水渡河',
                description: '你踏入冰冷的暗河中，水没到了腰际。水蛇在你周围游弋，但并没有攻击你。你小心翼翼地涉水前进，终于到达了对岸。石阶向上延伸，你沿着阶梯攀爬，看到了一丝光亮！你加快脚步冲了上去——阳光刺得你眯起了眼睛，你终于逃出了地牢！',
                type: 'ending',
                ending: 'escape_river',
                endingTitle: '暗河逃生',
                endingMessage: '你凭借勇气和运气，通过地下暗河成功逃离了地牢。自由的阳光洒在你身上，但你知道这段经历将永远铭刻在你的记忆中。'
            },
            dungeon_shore: {
                id: 'dungeon_shore',
                title: '河岸洞穴',
                description: '你沿着河岸前行，发现了一个隐藏的洞穴。洞穴中有一个古老的箱子，上面刻着奇怪的符文。你小心翼翼地打开箱子——里面有一件轻型锁子甲和一瓶药水！这些装备将帮助你继续前行。',
                type: 'normal',
                items: [
                    { id: 'chainmail', name: '轻型锁子甲', type: 'armor', description: '精巧的锁子甲，提供额外的防护', effect: { defense: 5 }, emoji: '🛡️' },
                    { id: 'health_potion_2', name: '中型生命药水', type: 'potion', description: '一瓶散发着红光的药水，可恢复50点生命值', effect: { hp: 50 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🏊 带着装备涉水过河', nextScene: 'dungeon_river' },
                    { text: '🕵️ 继续探索河岸，寻找其他出口', nextScene: 'dungeon_boss_path' }
                ]
            },
            dungeon_steal: {
                id: 'dungeon_steal',
                title: '偷取装备',
                description: '你蹑手蹑脚地靠近守卫，轻轻取下挂在墙上的长剑和盾牌。就在你拿到装备的那一刻，守卫突然动了动——但只是翻了个身，继续打呼噜。你松了口气，带着装备悄悄离开守卫室。',
                type: 'normal',
                items: [
                    { id: 'guard_sword', name: '守卫长剑', type: 'weapon', description: '一把保养良好的长剑，比你的拳头好用多了', effect: { attack: 6 }, emoji: '⚔️' },
                    { id: 'guard_shield', name: '守卫盾牌', type: 'armor', description: '一面木制盾牌，能提供基本的防护', effect: { defense: 4 }, emoji: '🛡️' }
                ],
                choices: [
                    { text: '🚪 寻找通往地面的楼梯', nextScene: 'dungeon_upper' },
                    { text: '🔑 回去用钥匙打开其他牢房', nextScene: 'dungeon_free_prisoners' }
                ]
            },
            dungeon_fight_guard: {
                id: 'dungeon_fight_guard',
                title: '与守卫搏斗',
                description: '你趁守卫不备发起攻击！守卫虽然被打了个措手不及，但很快反应过来，拔出武器与你对峙。这是一场生死之战！',
                type: 'battle',
                enemy: { name: '地牢守卫', emoji: '💂', maxHp: 55, currentHp: 55, attack: 12, defense: 7 },
                victoryScene: 'dungeon_after_guard_fight',
                defeatScene: 'dungeon_death'
            },
            dungeon_sneak: {
                id: 'dungeon_sneak',
                title: '悄然离去',
                description: '你拿走桌上的食物和钥匙，悄悄绕过打瞌睡的守卫。穿过守卫室后，你来到一条通往地面的楼梯。但楼梯口被一道铁门锁住了——你手中的钥匙应该能打开它。',
                type: 'normal',
                items: [{ id: 'bread', name: '干粮', type: 'potion', description: '朴素的干粮，可恢复15点生命值', effect: { hp: 15 }, emoji: '🍞' }],
                choices: [
                    { text: '🔑 用钥匙打开铁门', nextScene: 'dungeon_upper' },
                    { text: '🔍 先搜索守卫室的其他房间', nextScene: 'dungeon_armory' }
                ]
            },
            dungeon_armory: {
                id: 'dungeon_armory',
                title: '武器库',
                description: '你发现了一间小型武器库！虽然大部分武器都已经锈蚀不堪，但你找到了一把还算锋利的短剑和一面铁盾。',
                type: 'normal',
                items: [
                    { id: 'short_sword', name: '短剑', type: 'weapon', description: '一把锋利的短剑，地牢守卫的标准装备', effect: { attack: 5 }, emoji: '⚔️' },
                    { id: 'iron_shield', name: '铁盾', type: 'armor', description: '一面沉重的铁盾，坚固但有些笨重', effect: { defense: 3 }, emoji: '🛡️' }
                ],
                choices: [
                    { text: '🔑 回到铁门处，用钥匙打开', nextScene: 'dungeon_upper' }
                ]
            },
            dungeon_after_beast: {
                id: 'dungeon_after_beast',
                title: '魔兽的宝藏',
                description: '你击败了地牢魔兽鼠！在它身后的角落里，你发现了一些被它收集的物品——看来这只魔兽喜欢收集闪亮的东西。你找到了一瓶药水和一些金币。更重要的是，通往上方的楼梯口现在无人看守了。',
                type: 'normal',
                items: [{ id: 'health_potion_3', name: '小型生命药水', type: 'potion', description: '一瓶散发着淡淡红光的药水，可恢复30点生命值', effect: { hp: 30 }, emoji: '🧪' }],
                choices: [
                    { text: '🪜 沿楼梯向上逃跑', nextScene: 'dungeon_upper' },
                    { text: '🔍 继续深入地牢探索', nextScene: 'dungeon_boss_path' }
                ]
            },
            dungeon_after_guard: {
                id: 'dungeon_after_guard',
                title: '守卫的遗物',
                description: '你击败了守卫！从他身上你找到了一串钥匙和一些有用的装备。现在通往地面的路已经没有障碍了。',
                type: 'normal',
                items: [
                    { id: 'guard_sword_2', name: '守卫长剑', type: 'weapon', description: '一把保养良好的长剑', effect: { attack: 6 }, emoji: '⚔️' },
                    { id: 'health_potion_4', name: '小型生命药水', type: 'potion', description: '一瓶散发着淡淡红光的药水，可恢复30点生命值', effect: { hp: 30 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🚪 寻找通往地面的出口', nextScene: 'dungeon_upper' },
                    { text: '🕵️ 探索地牢深处', nextScene: 'dungeon_boss_path' }
                ]
            },
            dungeon_after_guard_fight: {
                id: 'dungeon_after_guard_fight',
                title: '胜利的果实',
                description: '你打败了守卫！守卫室里的装备现在都是你的了。你在桌上找到了守卫的日志，上面记录了地牢的地图。看来除了主楼梯，还有一条秘密通道可以通往地面。',
                type: 'normal',
                items: [
                    { id: 'steel_sword', name: '精钢长剑', type: 'weapon', description: '一把精钢打造的长剑，非常锋利', effect: { attack: 8 }, emoji: '⚔️' },
                    { id: 'steel_shield', name: '精钢盾牌', type: 'armor', description: '一面精钢盾牌，防御力出色', effect: { defense: 6 }, emoji: '🛡️' }
                ],
                choices: [
                    { text: '🪜 走主楼梯离开', nextScene: 'dungeon_upper' },
                    { text: '🚪 走秘密通道', nextScene: 'dungeon_secret_exit' },
                    { text: '⚔️ 深入地牢，挑战地牢之主', nextScene: 'dungeon_boss_path' }
                ]
            },
            dungeon_upper: {
                id: 'dungeon_upper',
                title: '上层大厅',
                description: '你沿楼梯来到地牢上层。这里是一个宽敞的大厅，天花板很高，墙壁上挂着破旧的火把。大厅有三个出口——正面的大门看起来通向外面，左侧的走廊传来嘈杂的声音，右侧则安静得可怕。',
                type: 'normal',
                choices: [
                    { text: '🚪 直接冲向正面大门', nextScene: 'dungeon_freedom' },
                    { text: '👂 向左侧嘈杂的方向探索', nextScene: 'dungeon_boss_path' },
                    { text: '👻 向右侧安静的方向前进', nextScene: 'dungeon_treasure' }
                ]
            },
            dungeon_free_prisoners: {
                id: 'dungeon_free_prisoners',
                title: '解放囚犯',
                description: '你用钥匙打开了其他牢房，释放了几名被关押的囚犯。其中一名老者感激地对你说："年轻人，感谢你的善举。让我告诉你一个秘密——地牢深处有一把传说中的魔法武器，它曾属于一位伟大的骑士。如果你能找到它，将获得强大的力量。"老者给了你一张破旧的地图。',
                type: 'normal',
                items: [{ id: 'health_potion_5', name: '中型生命药水', type: 'potion', description: '老者给你的药水，可恢复50点生命值', effect: { hp: 50 }, emoji: '🧪' }],
                choices: [
                    { text: '🗺️ 按地图寻找传说中的武器', nextScene: 'dungeon_boss_path' },
                    { text: '🚪 和囚犯们一起寻找出口', nextScene: 'dungeon_freedom' }
                ]
            },
            dungeon_boss_path: {
                id: 'dungeon_boss_path',
                title: '地牢深处',
                description: '你深入地牢的最底层。空气变得更加冰冷，墙壁上的火把变成了幽绿色的光芒。你来到了一扇巨大的铁门前，门上刻着骷髅图案。从门后传来沉重的呼吸声——地牢的统治者就在里面。你深吸一口气，推开了铁门......',
                type: 'normal',
                choices: [
                    { text: '⚔️ 正面挑战地牢之主！', nextScene: 'dungeon_boss' },
                    { text: '🎯 寻找偷袭的机会', nextScene: 'dungeon_boss_sneak' }
                ]
            },
            dungeon_boss: {
                id: 'dungeon_boss',
                title: '地牢领主',
                description: '一个穿着黑色铠甲的高大身影站在大厅中央——地牢领主！他手持一把散发着暗红色光芒的巨剑，嘴角浮现出残忍的笑容："又一个不知死活的囚徒......就让我送你上路吧！"',
                type: 'battle',
                enemy: { name: '地牢领主', emoji: '💀', maxHp: 80, currentHp: 80, attack: 14, defense: 10 },
                victoryScene: 'dungeon_boss_victory',
                defeatScene: 'dungeon_death'
            },
            dungeon_boss_sneak: {
                id: 'dungeon_boss_sneak',
                title: '偷袭领主',
                description: '你绕到领主身后，找到了一个有利的位置。趁他转身的瞬间，你发起了突袭！领主被你的偷袭打了个措手不及，但你只有这一次机会......',
                type: 'battle',
                enemy: { name: '地牢领主（受伤）', emoji: '💀', maxHp: 55, currentHp: 55, attack: 12, defense: 8 },
                victoryScene: 'dungeon_boss_victory',
                defeatScene: 'dungeon_death'
            },
            dungeon_boss_victory: {
                id: 'dungeon_boss_victory',
                title: '击败领主',
                description: '地牢领主倒下了！他的铠甲碎裂开来，露出下面虚弱的身躯。随着他的倒下，整个地牢似乎都在颤抖。你在领主的宝座后面找到了一把散发着金色光芒的魔法剑——这就是传说中的骑士之剑！你还发现了一条通往地面的秘密通道。',
                type: 'normal',
                items: [
                    { id: 'holy_sword', name: '骑士圣剑', type: 'weapon', description: '传说中骑士的圣剑，散发着神圣的光芒', effect: { attack: 12 }, emoji: '✨' },
                    { id: 'health_potion_6', name: '大型生命药水', type: 'potion', description: '一瓶散发着金色光芒的药水，可恢复80点生命值', effect: { hp: 80 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🏆 走秘密通道，带着荣耀离开', nextScene: 'dungeon_hero_ending' },
                    { text: '🔓 回去解救所有囚犯', nextScene: 'dungeon_savior_ending' }
                ]
            },
            dungeon_treasure: {
                id: 'dungeon_treasure',
                title: '隐藏的宝库',
                description: '你走进安静的走廊，发现了一间隐藏的宝库！虽然大部分财宝都已经被搜刮一空，但你还是找到了一瓶珍贵的药水和一面精致的银盾。不过，这里似乎没有通往地面的出口。',
                type: 'normal',
                items: [
                    { id: 'silver_shield', name: '银盾', type: 'armor', description: '一面精美的银盾，防御力极佳', effect: { defense: 7 }, emoji: '🛡️' },
                    { id: 'health_potion_7', name: '中型生命药水', type: 'potion', description: '一瓶散发着红光的药水，可恢复50点生命值', effect: { hp: 50 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🔙 返回大厅寻找出口', nextScene: 'dungeon_upper' }
                ]
            },
            dungeon_secret_exit: {
                id: 'dungeon_secret_exit',
                title: '秘密通道',
                description: '你按照守卫日志上的地图，找到了秘密通道。通道蜿蜒曲折，但最终你看到了一束光线。你加速奔跑，冲出了通道——外面是一片月光下的森林！你成功了！',
                type: 'ending',
                ending: 'escape_secret',
                endingTitle: '秘密逃脱',
                endingMessage: '你通过智慧和勇气，利用地牢的秘密通道成功逃脱。月光照亮了你的前路，一个新的冒险正在等待着你。'
            },
            dungeon_freedom: {
                id: 'dungeon_freedom',
                title: '自由之光',
                description: '你推开大门，阳光瞬间洒满了你的全身！你自由了！地牢的恐怖经历终于结束了。你深吸一口新鲜空气，感受着自由的滋味。',
                type: 'ending',
                ending: 'escape_simple',
                endingTitle: '简单自由',
                endingMessage: '你逃离了地牢，重获自由。虽然你只是匆匆离去，但活下来才是最重要的。自由的阳光比任何财宝都珍贵。'
            },
            dungeon_hero_ending: {
                id: 'dungeon_hero_ending',
                title: '英雄归来',
                description: '你手持骑士圣剑，从秘密通道走出地牢。阳光照在圣剑上，折射出璀璨的光芒。你的传说将在这片大陆上流传——击败地牢领主的勇者，手握圣剑的英雄！',
                type: 'ending',
                ending: 'hero',
                endingTitle: '圣剑英雄',
                endingMessage: '你不仅逃离了地牢，还击败了邪恶的领主，获得了传说中的骑士圣剑。你的名字将被写入史诗，成为后人传颂的英雄。这是最辉煌的结局！'
            },
            dungeon_savior_ending: {
                id: 'dungeon_savior_ending',
                title: '解放者',
                description: '你回到地牢，用从领主身上找到的钥匙打开了所有牢房。囚犯们纷纷涌出，对你说不尽的感激。你带领所有人从秘密通道离开了地牢。你不仅拯救了自己，还拯救了所有人。',
                type: 'ending',
                ending: 'savior',
                endingTitle: '地牢解放者',
                endingMessage: '你选择了最艰难的道路——回去拯救每一个人。你的善良和勇气感动了所有人，你不仅击败了邪恶，更用仁慈赢得了人心。这是最温暖的结局。'
            },
            dungeon_death: {
                id: 'dungeon_death',
                title: '永远沉睡',
                description: '你的力量耗尽了......黑暗的地牢成为了你最后的归宿。也许有一天，会有另一位勇者来到这里，在某个角落发现你留下的痕迹......',
                type: 'ending',
                ending: 'death',
                endingTitle: '地牢亡魂',
                endingMessage: '你没能逃出地牢。黑暗吞噬了你，你的故事在这里画上了句号。但不要灰心——每一次失败都是下一次冒险的起点。'
            }
        }
    },

    dragon: {
        id: 'dragon',
        name: '巨龙宝藏',
        startScene: 'dragon_start',
        scenes: {
            dragon_start: {
                id: 'dragon_start',
                title: '龙脊山脉脚下',
                description: '你站在龙脊山脉的脚下，仰望着被乌云笼罩的山峰。传说在山顶的龙巢中，守护着无尽的财宝和一把龙鳞铸就的神秘武器。许多冒险者来过这里，但没有人活着回去。山脚下有一个小村庄，你可以在那里补给。一条蜿蜒的山路通向山顶，山腰处还有一个幽深的洞穴入口。',
                type: 'normal',
                choices: [
                    { text: '🏘️ 先去村庄打听情报', nextScene: 'dragon_village' },
                    { text: '🏔️ 直接沿山路上山', nextScene: 'dragon_path' },
                    { text: '🕳️ 探索山腰的洞穴', nextScene: 'dragon_cave' }
                ]
            },
            dragon_village: {
                id: 'dragon_village',
                title: '山脚村庄',
                description: '村庄虽小，但人们都很热情。村长告诉你，巨龙每隔几天就会从山顶飞下来觅食，下一次出现大概就在明天。他还提到山腰的洞穴里住着一位隐居的炼金术士，也许能帮你。村中的铁匠愿意以优惠价卖给你一件装备，而药剂师则赠送了你一瓶药水。',
                type: 'normal',
                items: [{ id: 'health_potion_d1', name: '抗火药水', type: 'potion', description: '特制的抗火药水，可恢复40点生命值', effect: { hp: 40 }, emoji: '🧪' }],
                choices: [
                    { text: '⚒️ 向铁匠购买装备', nextScene: 'dragon_blacksmith' },
                    { text: '🕳️ 去找炼金术士', nextScene: 'dragon_alchemist' },
                    { text: '🏔️ 立刻上山', nextScene: 'dragon_path' }
                ]
            },
            dragon_blacksmith: {
                id: 'dragon_blacksmith',
                title: '铁匠铺',
                description: '铁匠是一位沉默寡言的矮人。他给你展示了几件武器和护甲，声称这些是专门为屠龙者打造的。虽然价格不菲，但质量确实上乘。铁匠还悄悄告诉你，巨龙的腹部是弱点，那里没有龙鳞保护。',
                type: 'normal',
                items: [
                    { id: 'dragon_slayer_sword', name: '屠龙剑', type: 'weapon', description: '矮人铁匠精心锻造的屠龙剑，对龙类有特殊效果', effect: { attack: 10 }, emoji: '⚔️' },
                    { id: 'dragon_hide_armor', name: '龙皮甲', type: 'armor', description: '用龙皮制成的轻甲，兼具灵活和防护', effect: { defense: 6 }, emoji: '🛡️' }
                ],
                choices: [
                    { text: '🏔️ 带着装备上山', nextScene: 'dragon_path' },
                    { text: '🕳️ 先去找炼金术士', nextScene: 'dragon_alchemist' }
                ]
            },
            dragon_alchemist: {
                id: 'dragon_alchemist',
                title: '炼金术士',
                description: '洞穴深处住着一位古怪的炼金术士。他周围摆满了各种瓶瓶罐罐，空气中弥漫着奇异的气味。他告诉你，巨龙有一个致命弱点——它的心脏处有一块逆鳞，那里是龙唯一无法防御的地方。他还给了你一瓶特制的强效药水和一把附魔匕首。',
                type: 'normal',
                items: [
                    { id: 'enchanted_dagger', name: '附魔匕首', type: 'weapon', description: '炼金术士附魔的匕首，可穿透魔法防御', effect: { attack: 7 }, emoji: '🗡️' },
                    { id: 'greater_health_potion', name: '强效生命药水', type: 'potion', description: '炼金术士特制的药水，可恢复70点生命值', effect: { hp: 70 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🏔️ 带着新知识上山', nextScene: 'dragon_path' }
                ]
            },
            dragon_path: {
                id: 'dragon_path',
                title: '蜿蜒山路',
                description: '山路崎岖而危险。你攀爬了数小时，终于来到了半山腰。这里分成了两条路——左边是一条经过龙墓的古老小径，据说那里有龙族的守护灵；右边则是一条更直接但更危险的路径，你必须面对一只守山的双头蛇。',
                type: 'normal',
                choices: [
                    { text: '🪦 走龙墓小径', nextScene: 'dragon_grave' },
                    { text: '🐍 正面击败双头蛇', nextScene: 'dragon_snake' }
                ]
            },
            dragon_cave: {
                id: 'dragon_cave',
                title: '山腰洞穴',
                description: '你走进了山腰的洞穴。洞穴比你想象的要深得多，火把的光芒照亮了岩壁上的古老壁画——这些壁画描述的是人类与龙族和平共处的远古时代。在洞穴深处，你发现了一个被遗忘的祭坛，上面放着一把古老的武器和一瓶药水。',
                type: 'normal',
                items: [
                    { id: 'ancient_spear', name: '远古龙枪', type: 'weapon', description: '远古时代用来与龙交流的仪式长枪', effect: { attack: 8 }, emoji: '🔱' },
                    { id: 'health_potion_d2', name: '远古药水', type: 'potion', description: '远古时代流传下来的药水，可恢复60点生命值', effect: { hp: 60 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🏔️ 离开洞穴继续上山', nextScene: 'dragon_path' },
                    { text: '📜 仔细研究壁画', nextScene: 'dragon_alchemist' }
                ]
            },
            dragon_grave: {
                id: 'dragon_grave',
                title: '龙族墓地',
                description: '你来到了龙族墓地。巨大的龙骨散落在四周，空气中弥漫着一种古老而庄严的气息。突然，一个半透明的龙魂出现在你面前。它用低沉的声音说："凡人，你来此是为了财宝还是荣耀？如果你能回答我的问题，我将赐予你祝福。"',
                type: 'normal',
                choices: [
                    { text: '💰 坦白说是为了财宝', nextScene: 'dragon_honest_treasure' },
                    { text: '🌟 说是为了证明自己的勇气', nextScene: 'dragon_honest_courage' },
                    { text: '🕊️ 说是为了与龙族和解', nextScene: 'dragon_peace' }
                ]
            },
            dragon_snake: {
                id: 'dragon_snake',
                title: '双头蛇守卫',
                description: '一只巨大的双头蛇拦住了你的去路！它的两个头分别喷吐着冰和火的气息，身体盘踞在岩石上，发出嘶嘶的威胁声。你必须击败它才能继续前进！',
                type: 'battle',
                enemy: { name: '双头蛇', emoji: '🐍', maxHp: 60, currentHp: 60, attack: 12, defense: 6 },
                victoryScene: 'dragon_after_snake',
                defeatScene: 'dragon_death'
            },
            dragon_honest_treasure: {
                id: 'dragon_honest_treasure',
                title: '龙魂的考验',
                description: '龙魂似乎对你的诚实感到满意。"诚实是美德。但贪财者往往走不远。"龙魂的祝福降临在你身上——你的防御力提升了。它还给了你一瓶龙血药水。',
                type: 'normal',
                items: [
                    { id: 'dragon_blood_potion', name: '龙血药水', type: 'potion', description: '含有龙血的药水，可恢复80点生命值', effect: { hp: 80 }, emoji: '🧪' },
                    { id: 'spirit_shield', name: '龙魂之盾', type: 'armor', description: '龙魂祝福的虚幻之盾，防御力强大', effect: { defense: 8 }, emoji: '🛡️' }
                ],
                choices: [
                    { text: '🏔️ 继续向山顶进发', nextScene: 'dragon_peak' }
                ]
            },
            dragon_honest_courage: {
                id: 'dragon_honest_courage',
                title: '龙魂的认可',
                description: '龙魂的眼中闪过一丝赞许。"勇气......这是龙族最尊重的品质。"龙魂的力量涌入你的身体——你的攻击力提升了！它还给了你一把龙牙匕首。',
                type: 'normal',
                items: [
                    { id: 'dragon_fang', name: '龙牙匕首', type: 'weapon', description: '用真正的龙牙制成的匕首，攻击力惊人', effect: { attack: 11 }, emoji: '🗡️' },
                    { id: 'health_potion_d3', name: '中型生命药水', type: 'potion', description: '一瓶散发着红光的药水，可恢复50点生命值', effect: { hp: 50 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🏔️ 带着龙魂的认可继续前进', nextScene: 'dragon_peak' }
                ]
            },
            dragon_peace: {
                id: 'dragon_peace',
                title: '龙族的秘密',
                description: '龙魂沉默了良久，然后缓缓说道："千年以来，你是第一个提到和解的人。"它告诉你一个秘密——巨龙并非邪恶的守财奴，而是在守护一个封印。如果你能以和平的方式接近巨龙，就能解开这个千年之谜。龙魂给了你一枚龙族徽章作为信物。',
                type: 'normal',
                items: [
                    { id: 'dragon_badge', name: '龙族徽章', type: 'armor', description: '龙族认可的信物，龙族不会主动攻击佩戴者', effect: { defense: 10 }, emoji: '🏅' },
                    { id: 'health_potion_d4', name: '龙息药水', type: 'potion', description: '龙魂赐予的药水，可恢复100点生命值', effect: { hp: 100 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🏔️ 佩戴徽章向山顶进发', nextScene: 'dragon_peak_peace' }
                ]
            },
            dragon_after_snake: {
                id: 'dragon_after_snake',
                title: '蛇穴之宝',
                description: '你击败了双头蛇！在它的巢穴中，你发现了一些之前冒险者留下的装备和一瓶药水。这些正是你接下来挑战巨龙所需要的！',
                type: 'normal',
                items: [
                    { id: 'adventurer_sword', name: '冒险者之剑', type: 'weapon', description: '前一位冒险者留下的好剑', effect: { attack: 7 }, emoji: '⚔️' },
                    { id: 'health_potion_d5', name: '中型生命药水', type: 'potion', description: '一瓶散发着红光的药水，可恢复50点生命值', effect: { hp: 50 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🏔️ 继续向山顶进发', nextScene: 'dragon_peak' }
                ]
            },
            dragon_peak: {
                id: 'dragon_peak',
                title: '龙巢之前',
                description: '你终于来到了山顶！在你面前是一个巨大的洞穴入口——龙巢。灼热的空气从洞穴中涌出，地面上有烧焦的痕迹。你能感觉到大地在微微颤抖——巨龙就在里面。你必须做出最终的选择。',
                type: 'normal',
                choices: [
                    { text: '⚔️ 直接冲入龙巢，正面挑战巨龙！', nextScene: 'dragon_boss' },
                    { text: '🎯 寻找弱点，准备偷袭', nextScene: 'dragon_boss_sneak' }
                ]
            },
            dragon_peak_peace: {
                id: 'dragon_peak_peace',
                title: '龙巢前的对话',
                description: '你佩戴着龙族徽章来到山顶。巨龙感应到了徽章的气息，它从巢穴中探出了头——但你惊讶地发现，它并没有攻击你。"你带着龙族的信物......千年来第一个。"巨龙的声音在你脑海中回响，"我有话要对你说。"',
                type: 'normal',
                choices: [
                    { text: '🤝 与巨龙对话', nextScene: 'dragon_peace_ending' },
                    { text: '⚔️ 仍然选择战斗（你无法抑制对财宝的渴望）', nextScene: 'dragon_boss' }
                ]
            },
            dragon_boss: {
                id: 'dragon_boss',
                title: '巨龙之战',
                description: '巨龙咆哮着从巢穴中冲出！它浑身覆盖着暗红色的鳞片，口中喷吐着灼热的火焰。这是一场生死之战——你与传说中巨龙的对决！',
                type: 'battle',
                enemy: { name: '远古火龙', emoji: '🐉', maxHp: 120, currentHp: 120, attack: 18, defense: 12 },
                victoryScene: 'dragon_victory',
                defeatScene: 'dragon_death'
            },
            dragon_boss_sneak: {
                id: 'dragon_boss_sneak',
                title: '偷袭巨龙',
                description: '你找到了一个有利的位置，趁着巨龙打盹的瞬间发起偷袭！你的武器瞄准了巨龙的腹部——那里没有龙鳞保护。巨龙被痛醒了，愤怒地咆哮着！',
                type: 'battle',
                enemy: { name: '远古火龙（受伤）', emoji: '🐉', maxHp: 85, currentHp: 85, attack: 16, defense: 9 },
                victoryScene: 'dragon_victory',
                defeatScene: 'dragon_death'
            },
            dragon_victory: {
                id: 'dragon_victory',
                title: '屠龙者',
                description: '巨龙轰然倒下！它的身体砸在山崖上引发了地震。你站在倒下的巨龙身旁，看着它眼中的光芒渐渐消失。在龙巢深处，你看到了堆积如山的金银财宝，以及一把用龙鳞铸造的传奇武器。你成功了——你成为了新的屠龙者！',
                type: 'ending',
                ending: 'dragon_slayer',
                endingTitle: '屠龙传说',
                endingMessage: '你击败了远古火龙，成为了传说中的屠龙者！龙鳞铸造的武器将成为你的传家之宝，而你的故事将被吟游诗人传唱千年。但也许......还有另一种方式？'
            },
            dragon_peace_ending: {
                id: 'dragon_peace_ending',
                title: '龙之契约',
                description: '巨龙告诉你，千年前人类与龙族曾订下契约，共同守护一个封印。但人类背叛了龙族，抢走了财宝，从此龙族与人类决裂。巨龙守护的不是财宝，而是封印——如果封印被打破，更可怕的灾祸将降临。"你愿意重新订立契约吗？"巨龙问道。你毫不犹豫地点了点头。巨龙的眼中闪过了久违的温暖。它将龙鳞铸成的武器赠予你，作为新契约的象征。',
                type: 'ending',
                ending: 'dragon_peace',
                endingTitle: '龙族之友',
                endingMessage: '你没有选择杀戮，而是选择了理解与和解。你重新订立了人类与龙族的契约，成为了千年来第一位龙族之友。这是最美好的结局——因为真正的力量不在于征服，而在于理解。'
            },
            dragon_death: {
                id: 'dragon_death',
                title: '龙息之下',
                description: '巨龙的火焰将你吞没......你的冒险在这里结束了。龙脊山脉依旧巍峨耸立，等待着下一位勇敢的挑战者。',
                type: 'ending',
                ending: 'death',
                endingTitle: '龙焰之殇',
                endingMessage: '你倒在了巨龙的火焰之下。但你的勇气不会被遗忘——也许下一位冒险者会从你的失败中汲取经验。'
            }
        }
    },

    forest: {
        id: 'forest',
        name: '森林谜团',
        startScene: 'forest_start',
        scenes: {
            forest_start: {
                id: 'forest_start',
                title: '迷雾森林入口',
                description: '浓重的迷雾笼罩着古老的森林。你站在森林的入口处，一块破旧的木牌上写着："入者迷，出者亡。"然而，最近有数名村民进入森林后失踪，作为冒险者的你决定一探究竟。森林中有三条小路——左侧传来潺潺水声，中间的小径上隐约可见脚印，右侧的花丛散发着奇异的花香。',
                type: 'normal',
                choices: [
                    { text: '💧 沿水声方向前进', nextScene: 'forest_stream' },
                    { text: '👣 跟随脚印前进', nextScene: 'forest_trail' },
                    { text: '🌸 走向花丛', nextScene: 'forest_flowers' }
                ]
            },
            forest_stream: {
                id: 'forest_stream',
                title: '精灵溪流',
                description: '你来到一条清澈的小溪旁。溪水在月光下闪闪发光，看起来格外美丽。你注意到溪水中似乎有什么东西在游动——是精灵鱼！它们是森林精灵的伙伴。沿着溪流上游方向，你看到了微弱的光芒——那可能就是精灵的聚居地。',
                type: 'normal',
                choices: [
                    { text: '🏠 沿溪流寻找精灵聚居地', nextScene: 'forest_elves' },
                    { text: '💧 在溪边休息，恢复体力', nextScene: 'forest_rest' }
                ]
            },
            forest_trail: {
                id: 'forest_trail',
                title: '神秘脚印',
                description: '你沿着脚印前进，发现脚印越来越大，最后变成了一种你从未见过的巨大爪印。突然，前方的灌木丛剧烈摇晃——一只森林巨狼跳了出来！它似乎正在巡逻领地，而你闯入了它的地盘。',
                type: 'battle',
                enemy: { name: '森林巨狼', emoji: '🐺', maxHp: 45, currentHp: 45, attack: 10, defense: 5 },
                victoryScene: 'forest_after_wolf',
                defeatScene: 'forest_death'
            },
            forest_flowers: {
                id: 'forest_flowers',
                title: '迷幻花丛',
                description: '你走进花丛，花香令人心旷神怡。但你很快意识到这些花朵散发的花粉有催眠效果！你的眼皮越来越沉重......在意识模糊之前，你注意到花丛深处有一个模糊的身影在向你招手。',
                type: 'normal',
                choices: [
                    { text: '😴 抵挡不住，沉沉睡去', nextScene: 'forest_fairy' },
                    { text: '🔥 用火把驱散花粉', nextScene: 'forest_fairy_alert' }
                ]
            },
            forest_elves: {
                id: 'forest_elves',
                title: '精灵村落',
                description: '你来到了一个隐藏在树冠中的精灵村落。精灵们对你的到来既警惕又好奇。长老告诉你，森林中最近出现了暗影生物，它们是导致村民失踪的元凶。暗影生物来自森林深处的暗影之门。长老给了你一瓶精灵药水和一件精灵斗篷来帮助你。',
                type: 'normal',
                items: [
                    { id: 'elf_cloak', name: '精灵斗篷', type: 'armor', description: '精灵编织的斗篷，轻盈而坚韧', effect: { defense: 5 }, emoji: '🧥' },
                    { id: 'elf_potion', name: '精灵药水', type: 'potion', description: '精灵酿造的药水，可恢复60点生命值', effect: { hp: 60 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🗡️ 请精灵战士协助你', nextScene: 'forest_elf_ally' },
                    { text: '🗺️ 带着精灵的情报独自深入', nextScene: 'forest_deep' }
                ]
            },
            forest_rest: {
                id: 'forest_rest',
                title: '溪边休憩',
                description: '你在溪边休息，清凉的溪水让你恢复了精神。你注意到溪底有一把微微发光的短剑——似乎是被遗弃在这里的。你捞起短剑，发现它工艺精良，是一把精灵武器。',
                type: 'normal',
                items: [
                    { id: 'elf_blade', name: '精灵短剑', type: 'weapon', description: '精灵锻造的短剑，锋利无比', effect: { attack: 7 }, emoji: '⚔️' },
                    { id: 'health_potion_f1', name: '清泉之水', type: 'potion', description: '森林溪流的清泉，可恢复25点生命值', effect: { hp: 25 }, emoji: '💧' }
                ],
                choices: [
                    { text: '🏠 继续寻找精灵聚居地', nextScene: 'forest_elves' },
                    { text: '🌲 深入森林', nextScene: 'forest_deep' }
                ]
            },
            forest_after_wolf: {
                id: 'forest_after_wolf',
                title: '狼穴发现',
                description: '你击败了森林巨狼！在它的巢穴中，你发现了一些令人不安的线索——失踪村民的衣物碎片，以及一块散发着暗紫色光芒的石头。这块石头似乎在指引你向森林深处前进。你还发现了一瓶药水。',
                type: 'normal',
                items: [{ id: 'health_potion_f2', name: '中型生命药水', type: 'potion', description: '一瓶散发着红光的药水，可恢复50点生命值', effect: { hp: 50 }, emoji: '🧪' }],
                choices: [
                    { text: '🔮 跟随暗紫色石头的指引', nextScene: 'forest_deep' },
                    { text: '🐾 沿着其他足迹追踪', nextScene: 'forest_elves' }
                ]
            },
            forest_fairy: {
                id: 'forest_fairy',
                title: '森林仙子',
                description: '你醒来后发现自己躺在一个发光的蘑菇圈中。一个小小的身影在空中飘浮——是森林仙子！她咯咯笑着说："你中了迷幻花的花粉啦！不过没关系，我是好仙子。"她给了你一瓶解药和一些仙尘，可以增加你的攻击力。她还告诉你暗影之门的位置。',
                type: 'normal',
                items: [
                    { id: 'fairy_dust_blade', name: '仙尘附魔', type: 'weapon', description: '仙尘附魔的武器，攻击力提升', effect: { attack: 6 }, emoji: '✨' },
                    { id: 'fairy_potion', name: '仙子药水', type: 'potion', description: '仙子酿造的药水，可恢复45点生命值', effect: { hp: 45 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🔮 前往暗影之门', nextScene: 'forest_deep' },
                    { text: '🧚 请仙子带路', nextScene: 'forest_fairy_guide' }
                ]
            },
            forest_fairy_alert: {
                id: 'forest_fairy_alert',
                title: '惊动仙子',
                description: '你用火把驱散了花粉，花丛中的身影暴露了——是森林仙子！她被你的火把吓到了，正准备逃跑。"等等！我没有恶意！"你赶紧说道。仙子犹豫了一下，最终停了下来。"你是来拯救森林的吗？"她问道。她告诉你关于暗影之门的秘密，并给了你一瓶药水。',
                type: 'normal',
                items: [{ id: 'fairy_potion_2', name: '仙子药水', type: 'potion', description: '仙子酿造的药水，可恢复45点生命值', effect: { hp: 45 }, emoji: '🧪' }],
                choices: [
                    { text: '🔮 前往暗影之门', nextScene: 'forest_deep' },
                    { text: '🧚 请仙子继续帮忙', nextScene: 'forest_fairy_guide' }
                ]
            },
            forest_elf_ally: {
                id: 'forest_elf_ally',
                title: '精灵战友',
                description: '精灵战士艾琳决定加入你的队伍。她是一名经验丰富的游侠，擅长追踪和弓术。"暗影之门在森林的最深处，"她说，"我们必须穿过暗影之林才能到达那里。那里充满了被暗影侵蚀的生物。"艾琳给了你一件精灵护甲和药水。',
                type: 'normal',
                items: [
                    { id: 'elf_armor', name: '精灵护甲', type: 'armor', description: '精灵锻造的轻甲，防御力出色', effect: { defense: 7 }, emoji: '🛡️' },
                    { id: 'elf_potion_2', name: '精灵强效药水', type: 'potion', description: '精灵酿造的强效药水，可恢复70点生命值', effect: { hp: 70 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '⚔️ 与艾琳一起深入暗影之林', nextScene: 'forest_shadow_with_ally' }
                ]
            },
            forest_fairy_guide: {
                id: 'forest_fairy_guide',
                title: '仙子引路',
                description: '仙子带你穿越了森林中最隐蔽的小径，避开了许多危险。在路上，她告诉你暗影之门是有人故意打开的——一个堕落的人类法师在利用暗影之力。到达暗影之林边缘时，仙子给了你最后的祝福，然后不得不离开——暗影之力对她来说太危险了。',
                type: 'normal',
                items: [
                    { id: 'fairy_blessing', name: '仙子祝福', type: 'armor', description: '仙子的祝福护盾，能抵御暗影之力', effect: { defense: 6 }, emoji: '🧚' },
                    { id: 'health_potion_f3', name: '中型生命药水', type: 'potion', description: '一瓶散发着红光的药水，可恢复50点生命值', effect: { hp: 50 }, emoji: '🧪' }
                ],
                choices: [
                    { text: '🖤 独自踏入暗影之林', nextScene: 'forest_shadow' }
                ]
            },
            forest_deep: {
                id: 'forest_deep',
                title: '暗影之林',
                description: '你来到了森林的深处。这里的树木扭曲变形，空气中弥漫着不祥的气息。暗影在地面上流动，像是活物一样。你看到前方有一道暗紫色的大门——暗影之门！门前站着一个身穿黑袍的身影。他似乎在等待着你。',
                type: 'normal',
                choices: [
                    { text: '🗣️ 与黑袍人对话', nextScene: 'forest_dark_mage' },
                    { text: '⚔️ 直接攻击黑袍人', nextScene: 'forest_mage_fight' }
                ]
            },
            forest_shadow: {
                id: 'forest_shadow',
                title: '暗影之林（仙子祝福）',
                description: '仙子的祝福在你周围形成了一层淡淡的光芒，驱散了周围的暗影。你顺利穿过了暗影之林，来到了暗影之门前。一个黑袍人站在门前，他惊讶地看着你身上的仙子祝福。"居然有人能在暗影中安然无恙......"',
                type: 'normal',
                choices: [
                    { text: '🗣️ 与黑袍人对话', nextScene: 'forest_dark_mage' },
                    { text: '⚔️ 趁他惊讶发起攻击', nextScene: 'forest_mage_fight_sneak' }
                ]
            },
            forest_shadow_with_ally: {
                id: 'forest_shadow_with_ally',
                title: '暗影之林（精灵同行）',
                description: '有艾琳同行，暗影之林的威胁减轻了许多。她用精灵箭矢驱散暗影生物，你负责开路。你们顺利来到了暗影之门前的空地。黑袍人看到你们两人，脸上露出了意外的表情。"精灵和人类......联手了吗？"',
                type: 'normal',
                choices: [
                    { text: '🗣️ 要求他关闭暗影之门', nextScene: 'forest_dark_mage' },
                    { text: '⚔️ 趁他分心时攻击', nextScene: 'forest_mage_fight_sneak' }
                ]
            },
            forest_dark_mage: {
                id: 'forest_dark_mage',
                title: '堕落法师',
                description: '黑袍人转过身来——他曾经是王国最有名的法师，艾尔德里克。"你以为我是邪恶的吗？"他苦笑着说，"我打开暗影之门是为了封印更可怕的东西——深渊领主正在试图从异界入侵！我需要暗影之力来加强封印。"他的眼中满是疲惫和痛苦。"但如果封印失败，整个世界都将陷入黑暗。"',
                type: 'normal',
                choices: [
                    { text: '🤝 帮助法师加强封印', nextScene: 'forest_seal_ending' },
                    { text: '⚔️ 不相信他，关闭暗影之门', nextScene: 'forest_close_gate' },
                    { text: '🔍 要求看证据', nextScene: 'forest_evidence' }
                ]
            },
            forest_evidence: {
                id: 'forest_evidence',
                title: '深渊的证据',
                description: '法师带你来到暗影之门前。透过门缝，你看到了一个恐怖的世界——无尽的黑暗中，巨大的眼睛正在注视着这边。深渊领主确实存在！法师说的都是真的。"封印已经摇摇欲坠，"法师说，"我需要更多力量来加固它，但暗影之力正在侵蚀我的理智。"',
                type: 'normal',
                items: [{ id: 'health_potion_f4', name: '法师药水', type: 'potion', description: '法师给你的药水，可恢复60点生命值', effect: { hp: 60 }, emoji: '🧪' }],
                choices: [
                    { text: '🤝 帮助法师加强封印', nextScene: 'forest_seal_ending' },
                    { text: '⚔️ 消灭暗影生物，用另一种方式封印', nextScene: 'forest_purify_ending' }
                ]
            },
            forest_mage_fight: {
                id: 'forest_mage_fight',
                title: '与法师战斗',
                description: '你毫不犹豫地向法师发起攻击！法师被迫自卫，暗影之力在他身边涌动。"愚蠢！"他怒吼道，"你不知道你在做什么！"',
                type: 'battle',
                enemy: { name: '堕落法师艾尔德里克', emoji: '🧙', maxHp: 70, currentHp: 70, attack: 14, defense: 8 },
                victoryScene: 'forest_mage_defeated',
                defeatScene: 'forest_death'
            },
            forest_mage_fight_sneak: {
                id: 'forest_mage_fight_sneak',
                title: '偷袭法师',
                description: '你趁法师不备发起偷袭！暗影之力虽强，但猝不及防的法师还是受到了重创。',
                type: 'battle',
                enemy: { name: '堕落法师（受伤）', emoji: '🧙', maxHp: 50, currentHp: 50, attack: 12, defense: 6 },
                victoryScene: 'forest_mage_defeated',
                defeatScene: 'forest_death'
            },
            forest_mage_defeated: {
                id: 'forest_mage_defeated',
                title: '法师的遗言',
                description: '法师倒下了。但就在他失去意识的瞬间，暗影之门剧烈震动——没有了法师的控制，封印开始崩溃！一只暗影巨兽从门缝中挤了出来！"不......"法师用最后的力气说，"你犯了大错......深渊领主......要来了......"',
                type: 'battle',
                enemy: { name: '暗影巨兽', emoji: '👁️', maxHp: 90, currentHp: 90, attack: 16, defense: 10 },
                victoryScene: 'forest_close_gate_heroic',
                defeatScene: 'forest_death'
            },
            forest_close_gate: {
                id: 'forest_close_gate',
                title: '关闭暗影之门',
                description: '你强行关闭暗影之门，法师试图阻止你，但被你推开。然而，当你试图关上门时，一只暗影巨兽从门缝中冲了出来！你必须击败它才能关闭大门！',
                type: 'battle',
                enemy: { name: '暗影巨兽', emoji: '👁️', maxHp: 75, currentHp: 75, attack: 14, defense: 9 },
                victoryScene: 'forest_close_gate_success',
                defeatScene: 'forest_death'
            },
            forest_seal_ending: {
                id: 'forest_seal_ending',
                title: '永恒封印',
                description: '你和法师一起将力量注入封印。暗影之门上爆发出耀眼的光芒，深渊领主的怒吼声渐渐远去。封印成功了！但法师的身体正在被暗影吞噬——他决定牺牲自己，成为封印的一部分。"谢谢你相信我，"法师微笑着说，"告诉世人，不是所有黑暗都是邪恶的。"随着最后一丝光芒消散，法师和暗影之门一起消失了。失踪的村民也从暗影中走了出来。',
                type: 'ending',
                ending: 'seal',
                endingTitle: '永恒封印',
                endingMessage: '你选择相信一个被世人误解的法师，用信任和勇气拯救了整个世界。法师的牺牲将被永远铭记。森林恢复了平静，失踪的村民们回到了家园。这是最感人的结局。'
            },
            forest_purify_ending: {
                id: 'forest_purify_ending',
                title: '净化之光',
                description: '你选择用光明之力净化暗影！法师将残余的力量借给你，你将所有力量凝聚成一束纯白的光芒，射向暗影之门。暗影巨兽在光芒中哀嚎消散，暗影之门上的裂痕开始愈合。法师的暗影之力也被净化了——他恢复了原来的样子。"谢谢你，"他含泪说道，"我以为自己注定要被黑暗吞噬。"',
                type: 'ending',
                ending: 'purify',
                endingTitle: '净化之光',
                endingMessage: '你不仅封印了深渊，还拯救了一个堕落的灵魂。光与暗并非对立，而是可以相互转化的。你用最光明的结局证明了这一点——真正的英雄不是消灭黑暗，而是照亮黑暗。'
            },
            forest_close_gate_success: {
                id: 'forest_close_gate_success',
                title: '关闭大门',
                description: '你击败了暗影巨兽，用尽全力将暗影之门关闭。门在最后一声震颤中消失了，失踪的村民从森林各处走了出来，茫然但不受伤。你成功了——但你心中始终有一个疑问：法师说的是真的吗？如果是，那么封印已经不存在了......',
                type: 'ending',
                ending: 'close_gate',
                endingTitle: '暂时安宁',
                endingMessage: '你关闭了暗影之门，救出了失踪的村民。但你是否做出了正确的选择？暗影之门消失了，但深渊的威胁也许并未消除。这是最不确定的结局——安宁之下或许隐藏着更大的危机。'
            },
            forest_close_gate_heroic: {
                id: 'forest_close_gate_heroic',
                title: '英雄之战',
                description: '你击败了暗影巨兽！虽然法师已经倒下，但你用尽全力将暗影之门关闭。门消失了，失踪的村民们慢慢从暗影中走出来。你虽然精疲力竭，但你知道自己做了正确的事——至少，暂时是正确的。法师临终的话还在你耳边回响......',
                type: 'ending',
                ending: 'heroic_sacrifice',
                endingTitle: '英雄的代价',
                endingMessage: '你用战斗证明了自己的实力，但也可能犯下了不可挽回的错误。深渊领主的威胁是否真的存在？答案也许永远不会揭晓。但至少现在，村民们安全了。这是最沉重的结局。'
            },
            forest_death: {
                id: 'forest_death',
                title: '迷失暗影',
                description: '暗影吞噬了你......你的意识渐渐模糊，成为了森林中又一个迷失的灵魂。也许有一天，会有另一位冒险者来到这里，将你从黑暗中解救出来......',
                type: 'ending',
                ending: 'death',
                endingTitle: '暗影囚徒',
                endingMessage: '你被暗影之力吞噬，成为了森林中又一个失踪者。但不要放弃——每一个结局都是新故事的开始。'
            }
        }
    }
};
