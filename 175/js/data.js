const GAME_DATA = {
  config: {
    difficulties: {
      easy: { rows: 4, cols: 4, pairs: 8, name: '简单' },
      medium: { rows: 6, cols: 6, pairs: 18, name: '中等' },
      hard: { rows: 8, cols: 8, pairs: 32, name: '困难' }
    },
    themes: {
      life: { name: '生活常识', color: '#4CAF50' },
      science: { name: '科学原理', color: '#2196F3' },
      history: { name: '历史事件', color: '#9C27B0' }
    }
  },

  themes: {
    life: {
      pairs: [
        { id: 'p1', cause: { emoji: '🌧️', text: '下雨' }, effect: { emoji: '☂️', text: '打伞' }, explanation: '下雨时打伞可以防止被雨淋湿。' },
        { id: 'p2', cause: { emoji: '🩹', text: '伤口' }, effect: { emoji: '💊', text: '创可贴' }, explanation: '创可贴保护伤口，防止感染。' },
        { id: 'p3', cause: { emoji: '😫', text: '饥饿' }, effect: { emoji: '🍔', text: '吃饭' }, explanation: '吃饭可以补充能量，缓解饥饿。' },
        { id: 'p4', cause: { emoji: '😴', text: '困倦' }, effect: { emoji: '🛏️', text: '睡觉' }, explanation: '睡眠让身体和大脑得到休息。' },
        { id: 'p5', cause: { emoji: '🔥', text: '炎热' }, effect: { emoji: '🌀', text: '风扇' }, explanation: '风扇加速空气流动，使人凉爽。' },
        { id: 'p6', cause: { emoji: '❄️', text: '寒冷' }, effect: { emoji: '🧥', text: '穿厚衣' }, explanation: '厚衣服阻挡热量散失，保暖。' },
        { id: 'p7', cause: { emoji: '🥵', text: '口渴' }, effect: { emoji: '💧', text: '喝水' }, explanation: '水是生命之源，补充水分。' },
        { id: 'p8', cause: { emoji: '🌑', text: '黑暗' }, effect: { emoji: '💡', text: '开灯' }, explanation: '灯光照亮环境，方便活动。' },
        { id: 'p9', cause: { emoji: '🧼', text: '脏了' }, effect: { emoji: '🧴', text: '洗手' }, explanation: '洗手去除细菌，保持卫生。' },
        { id: 'p10', cause: { emoji: '😩', text: '疲劳' }, effect: { emoji: '☕', text: '休息' }, explanation: '休息恢复体力和精力。' },
        { id: 'p11', cause: { emoji: '🔥', text: '着火' }, effect: { emoji: '🧯', text: '灭火器' }, explanation: '灭火器扑灭火灾，防止蔓延。' },
        { id: 'p12', cause: { emoji: '🔧', text: '损坏' }, effect: { emoji: '🛠️', text: '修理' }, explanation: '修理恢复物品正常功能。' },
        { id: 'p13', cause: { emoji: '🤒', text: '生病' }, effect: { emoji: '👨‍⚕️', text: '看医生' }, explanation: '医生诊断病情，给出治疗方案。' },
        { id: 'p14', cause: { emoji: '📦', text: '旧物' }, effect: { emoji: '♻️', text: '回收' }, explanation: '回收利用减少浪费，保护环境。' },
        { id: 'p15', cause: { emoji: '🏃', text: '运动' }, effect: { emoji: '💪', text: '强壮' }, explanation: '规律运动增强体质，提高免疫力。' },
        { id: 'p16', cause: { emoji: '📚', text: '学习' }, effect: { emoji: '🧠', text: '知识' }, explanation: '学习获取知识和技能。' },
        { id: 'p17', cause: { emoji: '🌱', text: '浇水' }, effect: { emoji: '🌳', text: '生长' }, explanation: '植物需要水分才能生长。' },
        { id: 'p18', cause: { emoji: '👨‍🍳', text: '烹饪' }, effect: { emoji: '🍲', text: '美食' }, explanation: '烹饪将食材变成美味食物。' },
        { id: 'p19', cause: { emoji: '🎵', text: '听音乐' }, effect: { emoji: '😊', text: '开心' }, explanation: '音乐调节情绪，使人愉悦。' },
        { id: 'p20', cause: { emoji: '✈️', text: '旅行' }, effect: { emoji: '📸', text: '回忆' }, explanation: '旅行开阔眼界，留下美好回忆。' },
        { id: 'p21', cause: { emoji: '🎁', text: '礼物' }, effect: { emoji: '🎉', text: '惊喜' }, explanation: '收到礼物让人感到惊喜开心。' },
        { id: 'p22', cause: { emoji: '🏋️', text: '锻炼' }, effect: { emoji: '💦', text: '出汗' }, explanation: '运动产生热量，出汗调节体温。' },
        { id: 'p23', cause: { emoji: '📖', text: '读书' }, effect: { emoji: '💡', text: '启发' }, explanation: '阅读启发思维，增长见识。' },
        { id: 'p24', cause: { emoji: '👫', text: '朋友' }, effect: { emoji: '🤝', text: '支持' }, explanation: '朋友在困难时互相帮助。' },
        { id: 'p25', cause: { emoji: '🌅', text: '日出' }, effect: { emoji: '☀️', text: '新一天' }, explanation: '日出标志新一天的开始。' },
        { id: 'p26', cause: { emoji: '💪', text: '努力' }, effect: { emoji: '🏆', text: '成功' }, explanation: '努力付出是成功的基础。' },
        { id: 'p27', cause: { emoji: '❤️', text: '爱' }, effect: { emoji: '🥰', text: '幸福' }, explanation: '爱是幸福的重要源泉。' },
        { id: 'p28', cause: { emoji: '🎯', text: '练习' }, effect: { emoji: '⭐', text: '精通' }, explanation: '熟能生巧，练习成就精通。' },
        { id: 'p29', cause: { emoji: '🌾', text: '播种' }, effect: { emoji: '🌻', text: '收获' }, explanation: '春天播种，秋天收获。' },
        { id: 'p30', cause: { emoji: '❓', text: '疑问' }, effect: { emoji: '✅', text: '答案' }, explanation: '有疑问就寻找答案。' },
        { id: 'p31', cause: { emoji: '💭', text: '梦想' }, effect: { emoji: '🌟', text: '实现' }, explanation: '努力追求，梦想终会实现。' },
        { id: 'p32', cause: { emoji: '❌', text: '错误' }, effect: { emoji: '📈', text: '进步' }, explanation: '从错误中学习，不断进步。' }
      ],
      funFacts: [
        '人一生平均吃掉约35吨食物。',
        '人每天眨眼约14000次。',
        '人的舌头有10000个味蕾。',
        '人每天产生约1升唾液。',
        '大脑消耗身体20%的氧气。',
        '人一生走约12万公里路。',
        '指甲每月长约3毫米。',
        '人每天心跳约10万次。',
        '人有206块骨头。',
        '眼睛能分辨1000万种颜色。'
      ]
    },

    science: {
      pairs: [
        { id: 's1', cause: { emoji: '🔥', text: '加热' }, effect: { emoji: '💨', text: '蒸发' }, explanation: '水加热到100℃沸腾蒸发。' },
        { id: 's2', cause: { emoji: '❄️', text: '降温' }, effect: { emoji: '🧊', text: '结冰' }, explanation: '水在0℃以下凝固成冰。' },
        { id: 's3', cause: { emoji: '☀️', text: '阳光' }, effect: { emoji: '🌱', text: '光合作用' }, explanation: '植物利用阳光产生氧气。' },
        { id: 's4', cause: { emoji: '🌍', text: '重力' }, effect: { emoji: '🍎', text: '下落' }, explanation: '地球引力使物体下落。' },
        { id: 's5', cause: { emoji: '🔄', text: '摩擦' }, effect: { emoji: '🔥', text: '发热' }, explanation: '物体摩擦产生热量。' },
        { id: 's6', cause: { emoji: '⚡', text: '电' }, effect: { emoji: '💡', text: '发光' }, explanation: '电流通过灯丝发光。' },
        { id: 's7', cause: { emoji: '🔊', text: '振动' }, effect: { emoji: '🌊', text: '声波' }, explanation: '声音是空气传播的振动波。' },
        { id: 's8', cause: { emoji: '🧲', text: '磁铁' }, effect: { emoji: '🔩', text: '吸引' }, explanation: '磁铁能吸引铁等金属。' },
        { id: 's9', cause: { emoji: '🔋', text: '电池' }, effect: { emoji: '⚡', text: '电能' }, explanation: '电池将化学能转化为电能。' },
        { id: 's10', cause: { emoji: '💨', text: '气压差' }, effect: { emoji: '🌬️', text: '风' }, explanation: '空气从高压流向低压形成风。' },
        { id: 's11', cause: { emoji: '☁️', text: '云' }, effect: { emoji: '🌧️', text: '雨' }, explanation: '云中水汽凝结降落形成雨。' },
        { id: 's12', cause: { emoji: '🌋', text: '火山' }, effect: { emoji: '🌋', text: '喷发' }, explanation: '岩浆压力导致火山喷发。' },
        { id: 's13', cause: { emoji: '🌍', text: '板块运动' }, effect: { emoji: '📳', text: '地震' }, explanation: '板块运动释放能量引起地震。' },
        { id: 's14', cause: { emoji: '🧬', text: 'DNA' }, effect: { emoji: '👨‍👩‍👧', text: '遗传' }, explanation: 'DNA携带遗传信息。' },
        { id: 's15', cause: { emoji: '🦠', text: '细胞' }, effect: { emoji: '🔄', text: '分裂' }, explanation: '细胞分裂使生物体生长。' },
        { id: 's16', cause: { emoji: '💨', text: '氧气' }, effect: { emoji: '🫁', text: '呼吸' }, explanation: '呼吸需要氧气产生能量。' },
        { id: 's17', cause: { emoji: '💧', text: '水滴' }, effect: { emoji: '🌈', text: '彩虹' }, explanation: '阳光经水滴折射形成彩虹。' },
        { id: 's18', cause: { emoji: '⚡', text: '闪电' }, effect: { emoji: '🔊', text: '雷声' }, explanation: '闪电加热空气产生雷声。' },
        { id: 's19', cause: { emoji: '⚫', text: '黑洞' }, effect: { emoji: '🌌', text: '强引力' }, explanation: '黑洞引力极强，光无法逃逸。' },
        { id: 's20', cause: { emoji: '⚛️', text: '原子' }, effect: { emoji: '💥', text: '核能' }, explanation: '原子核变化释放巨大能量。' },
        { id: 's21', cause: { emoji: '🛰️', text: '卫星' }, effect: { emoji: '🔄', text: '轨道' }, explanation: '卫星按固定轨道运行。' },
        { id: 's22', cause: { emoji: '🔦', text: '激光' }, effect: { emoji: '✨', text: '相干光' }, explanation: '激光是高度集中的光束。' },
        { id: 's23', cause: { emoji: '💉', text: '疫苗' }, effect: { emoji: '🛡️', text: '免疫' }, explanation: '疫苗刺激产生抗体获得免疫。' },
        { id: 's24', cause: { emoji: '☀️', text: '核聚变' }, effect: { emoji: '🔥', text: '太阳能' }, explanation: '太阳氢核聚变产生能量。' },
        { id: 's25', cause: { emoji: '🦇', text: '超声波' }, effect: { emoji: '🎯', text: '回声定位' }, explanation: '蝙蝠利用超声波导航。' },
        { id: 's26', cause: { emoji: '🦠', text: '细菌' }, effect: { emoji: '🤒', text: '疾病' }, explanation: '某些细菌引起疾病。' },
        { id: 's27', cause: { emoji: '💊', text: '抗生素' }, effect: { emoji: '🛡️', text: '杀菌' }, explanation: '抗生素杀死或抑制细菌。' },
        { id: 's28', cause: { emoji: '⚛️', text: '量子' }, effect: { emoji: '🌀', text: '叠加态' }, explanation: '量子可同时处于多种状态。' },
        { id: 's29', cause: { emoji: '🚀', text: '相对论' }, effect: { emoji: '⏰', text: '时间膨胀' }, explanation: '高速运动时时间变慢。' },
        { id: 's30', cause: { emoji: '💎', text: '晶体' }, effect: { emoji: '🔷', text: '规则结构' }, explanation: '晶体原子排列规则。' },
        { id: 's31', cause: { emoji: '⚗️', text: '酶' }, effect: { emoji: '⚡', text: '催化' }, explanation: '酶加速化学反应速率。' },
        { id: 's32', cause: { emoji: '🍃', text: '叶绿素' }, effect: { emoji: '💚', text: '绿色' }, explanation: '叶绿素反射绿光。' }
      ],
      funFacts: [
        '光速每秒约30万公里。',
        '水的分子式是H2O。',
        '地球71%是海洋。',
        '人体约60%是水。',
        '太阳表面温度约5500度。',
        'DNA螺旋直径约2纳米。',
        '人脑有约860亿神经元。',
        '原子99.9999%是空的。',
        '氦气比空气轻。',
        '钻石是最硬的天然物质。'
      ]
    },

    history: {
      pairs: [
        { id: 'h1', cause: { emoji: '⚔️', text: '战争' }, effect: { emoji: '🕊️', text: '和平' }, explanation: '战争带来破坏，和平带来发展。' },
        { id: 'h2', cause: { emoji: '💡', text: '发明' }, effect: { emoji: '📈', text: '进步' }, explanation: '发明推动人类文明进步。' },
        { id: 'h3', cause: { emoji: '🔄', text: '革命' }, effect: { emoji: '🆕', text: '变革' }, explanation: '革命带来社会制度变革。' },
        { id: 'h4', cause: { emoji: '🧭', text: '发现' }, effect: { emoji: '🌍', text: '探索' }, explanation: '新发现推动人类探索未知。' },
        { id: 'h5', cause: { emoji: '🏴‍☠️', text: '殖民' }, effect: { emoji: '🗽', text: '独立' }, explanation: '殖民地斗争获得独立。' },
        { id: 'h6', cause: { emoji: '📜', text: '印刷术' }, effect: { emoji: '📚', text: '知识传播' }, explanation: '印刷术加速知识传播。' },
        { id: 'h7', cause: { emoji: '⚙️', text: '蒸汽机' }, effect: { emoji: '🏭', text: '工业革命' }, explanation: '蒸汽机推动工业革命。' },
        { id: 'h8', cause: { emoji: '🧭', text: '指南针' }, effect: { emoji: '⛵', text: '航海' }, explanation: '指南针帮助航海家探索。' },
        { id: 'h9', cause: { emoji: '💣', text: '火药' }, effect: { emoji: '🔫', text: '战争方式' }, explanation: '火药改变战争方式。' },
        { id: 'h10', cause: { emoji: '📄', text: '纸' }, effect: { emoji: '✍️', text: '书写' }, explanation: '纸方便书写记录。' },
        { id: 'h11', cause: { emoji: '🚂', text: '铁路' }, effect: { emoji: '📦', text: '运输' }, explanation: '铁路提高运输效率。' },
        { id: 'h12', cause: { emoji: '📞', text: '电话' }, effect: { emoji: '💬', text: '通讯' }, explanation: '电话实现远程即时通讯。' },
        { id: 'h13', cause: { emoji: '💻', text: '电脑' }, effect: { emoji: 'ℹ️', text: '信息时代' }, explanation: '计算机开启信息时代。' },
        { id: 'h14', cause: { emoji: '🌐', text: '互联网' }, effect: { emoji: '🔗', text: '连接' }, explanation: '互联网连接整个世界。' },
        { id: 'h15', cause: { emoji: '🌾', text: '农业' }, effect: { emoji: '🏘️', text: '定居' }, explanation: '农业发展使人类定居。' },
        { id: 'h16', cause: { emoji: '✍️', text: '文字' }, effect: { emoji: '🏛️', text: '文明' }, explanation: '文字是文明的重要标志。' },
        { id: 'h17', cause: { emoji: '🗳️', text: '民主' }, effect: { emoji: '🗽', text: '自由' }, explanation: '民主制度保障自由权利。' },
        { id: 'h18', cause: { emoji: '⛓️', text: '奴隶制' }, effect: { emoji: '⚖️', text: '废奴' }, explanation: '废除奴隶制追求平等。' },
        { id: 'h19', cause: { emoji: '💥', text: '二战' }, effect: { emoji: '🌍', text: '联合国' }, explanation: '二战后成立联合国维护和平。' },
        { id: 'h20', cause: { emoji: '🎨', text: '文艺复兴' }, effect: { emoji: '🖼️', text: '艺术繁荣' }, explanation: '文艺复兴带来艺术繁荣。' },
        { id: 'h21', cause: { emoji: '💡', text: '启蒙运动' }, effect: { emoji: '🧠', text: '理性' }, explanation: '启蒙运动宣扬理性科学。' },
        { id: 'h22', cause: { emoji: '🇫🇷', text: '法国大革命' }, effect: { emoji: '🗽', text: '自由平等' }, explanation: '法国大革命传播自由平等思想。' },
        { id: 'h23', cause: { emoji: '🏭', text: '工业化' }, effect: { emoji: '🏙️', text: '城市化' }, explanation: '工业化推动城市化。' },
        { id: 'h24', cause: { emoji: '🧭', text: '探险家' }, effect: { emoji: '🗺️', text: '新航路' }, explanation: '探险家开辟新航路。' },
        { id: 'h25', cause: { emoji: '👑', text: '帝国' }, effect: { emoji: '💔', text: '衰落' }, explanation: '帝国兴衰是历史规律。' },
        { id: 'h26', cause: { emoji: '🔬', text: '科学家' }, effect: { emoji: '💡', text: '发现' }, explanation: '科学家的发现推动进步。' },
        { id: 'h27', cause: { emoji: '🔧', text: '发明家' }, effect: { emoji: '✨', text: '创新' }, explanation: '发明家的创新改变生活。' },
        { id: 'h28', cause: { emoji: '⚔️', text: '战士' }, effect: { emoji: '🗺️', text: '征服' }, explanation: '战士征战扩张领土。' },
        { id: 'h29', cause: { emoji: '🤝', text: '外交' }, effect: { emoji: '🔗', text: '联盟' }, explanation: '外交建立国与国联盟。' },
        { id: 'h30', cause: { emoji: '👑', text: '君主制' }, effect: { emoji: '🗳️', text: '共和制' }, explanation: '许多国家从君主制走向共和。' },
        { id: 'h31', cause: { emoji: '🏛️', text: '传统' }, effect: { emoji: '🆕', text: '现代' }, explanation: '传统向现代演变。' },
        { id: 'h32', cause: { emoji: '📜', text: '历史' }, effect: { emoji: '🔮', text: '未来' }, explanation: '以史为鉴，开创未来。' }
      ],
      funFacts: [
        '埃及金字塔已有4500年历史。',
        '长城全长约21196公里。',
        '罗马帝国持续约1000年。',
        '达芬奇是全才艺术家。',
        '秦始皇统一中国文字。',
        '拿破仑曾统治欧洲大部。',
        '玛雅历法非常精确。',
        '丝绸之路连接东西方。',
        '活字印刷北宋发明。',
        '第一次工业革命始于英国。'
      ]
    }
  }
};
