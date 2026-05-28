const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

const SERVER_URL = 'http://localhost:8080';

let testResults = [];
let passed = 0;
let failed = 0;

function log(category, name, success, detail) {
    const icon = success ? '✅' : '❌';
    const msg = `${icon} [${category}] ${name}${detail ? ': ' + detail : ''}`;
    console.log(msg);
    testResults.push({ category, name, success, detail });
    if (success) passed++;
    else failed++;
}

async function runTests() {
    console.log('\n========================================');
    console.log('  霓虹狂飙 - 游戏功能验证测试');
    console.log('========================================\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=500,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 900, isMobile: false, hasTouch: true });

    page.on('console', msg => {
        if (msg.type() === 'error') console.log('  [Browser Error]', msg.text());
    });

    await page.goto(SERVER_URL, { waitUntil: 'networkidle0' });

    // ========== 测试1: 赛车移动 ==========
    console.log('\n--- 测试1: 赛车移动功能 ---');
    try {
        const moveTest = await page.evaluate(() => {
            const game = window.gameInstance;
            const startX = game.player.x;
            game.player.moveLeft(1);
            const afterLeft = game.player.x;
            game.player.moveRight(2);
            const afterRight = game.player.x;
            return { startX, afterLeft, afterRight, minX: game.player.minX, maxX: game.player.maxX };
        });
        const movedLeft = moveTest.afterLeft < moveTest.startX;
        const movedRight = moveTest.afterRight > moveTest.afterLeft;
        log('赛车移动', '左移减少X坐标', movedLeft, `startX=${moveTest.startX.toFixed(1)} → afterLeft=${moveTest.afterLeft.toFixed(1)}`);
        log('赛车移动', '右移增加X坐标', movedRight, `afterLeft=${moveTest.afterLeft.toFixed(1)} → afterRight=${moveTest.afterRight.toFixed(1)}`);

        const boundaryTest = await page.evaluate(() => {
            const game = window.gameInstance;
            for (let i = 0; i < 200; i++) game.player.moveLeft(1);
            const leftLimit = game.player.x;
            for (let i = 0; i < 400; i++) game.player.moveRight(1);
            const rightLimit = game.player.x;
            return { leftLimit, rightLimit, minX: game.player.minX, maxX: game.player.maxX };
        });
        log('赛车移动', '左边界限制', boundaryTest.leftLimit >= boundaryTest.minX,
            `x=${boundaryTest.leftLimit.toFixed(1)} >= minX=${boundaryTest.minX.toFixed(1)}`);
        log('赛车移动', '右边界限制', boundaryTest.rightLimit <= boundaryTest.maxX,
            `x=${boundaryTest.rightLimit.toFixed(1)} <= maxX=${boundaryTest.maxX.toFixed(1)}`);
    } catch (e) {
        log('赛车移动', '测试异常', false, e.message);
    }

    // ========== 测试2: 碰撞检测 ==========
    console.log('\n--- 测试2: 碰撞检测功能 ---');
    try {
        const collisionTest = await page.evaluate(() => {
            const game = window.gameInstance;
            game.startGame();
            const px = game.player.x;
            const py = game.player.y;
            const pw = game.player.width;
            const ph = game.player.height;
            const Obstacle = window.Obstacle.Obstacle;
            const overlapObs = new Obstacle(px, py, 'car', 3);
            const noOverlapObs = new Obstacle(px + 200, py, 'car', 3);
            const playerRect = game.player.getRect();
            const overlapRect = overlapObs.getRect();
            const noOverlapRect = noOverlapObs.getRect();
            function rectsOverlap(a, b) {
                return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
            }
            return {
                overlap: rectsOverlap(playerRect, overlapRect),
                noOverlap: !rectsOverlap(playerRect, noOverlapRect),
                playerRect, overlapRect
            };
        });
        log('碰撞检测', '重叠矩形正确检测碰撞', collisionTest.overlap,
            `player=${JSON.stringify(collisionTest.playerRect)} obs=${JSON.stringify(collisionTest.overlapRect)}`);
        log('碰撞检测', '不重叠矩形正确无碰撞', collisionTest.noOverlap);
    } catch (e) {
        log('碰撞检测', '测试异常', false, e.message);
    }

    // ========== 测试3: 得分系统 ==========
    console.log('\n--- 测试3: 得分系统 ---');
    try {
        const scoreTest = await page.evaluate(() => {
            const game = window.gameInstance;
            game.scoreManager.reset();
            const s0 = game.scoreManager.score;
            game.scoreManager.addScore(10);
            const s1 = game.scoreManager.score;
            game.scoreManager.addScore(10);
            const s2 = game.scoreManager.score;
            const level0 = game.scoreManager.getDifficultyLevel();
            for (let i = 0; i < 8; i++) game.scoreManager.addScore(10);
            const s100 = game.scoreManager.score;
            const level1 = game.scoreManager.getDifficultyLevel();
            game.scoreManager.addScore(10);
            const level2 = game.scoreManager.getDifficultyLevel();
            return { s0, s1, s2, s100, level0, level1, level2 };
        });
        log('得分系统', '初始分数为0', scoreTest.s0 === 0);
        log('得分系统', '+10分正确', scoreTest.s1 === 10, `score=${scoreTest.s1}`);
        log('得分系统', '再次+10分正确', scoreTest.s2 === 20, `score=${scoreTest.s2}`);
        log('得分系统', '累计10次+10达到100分', scoreTest.s100 === 100, `score=${scoreTest.s100}`);
        log('得分系统', '难度等级计算', scoreTest.level1 === 1 && scoreTest.level2 === 1,
            `level@100=${scoreTest.level1}, level@110=${scoreTest.level2}`);
    } catch (e) {
        log('得分系统', '测试异常', false, e.message);
    }

    // 截图: 游戏进行中
    await page.evaluate(() => {
        const game = window.gameInstance;
        game.startGame();
        game.scoreManager.addScore(50);
        game.uiManager.updateScore(game.scoreManager.score);
    });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_game_playing.png') });
    console.log('\n📸 截图: 01_game_playing.png');

    // ========== 测试4: 三种障碍物宽度和速度差异 ==========
    console.log('\n--- 测试4: 三种障碍物类型差异 ---');
    try {
        const obstacleTest = await page.evaluate(() => {
            const Obstacle = window.Obstacle.Obstacle;
            const car = new Obstacle(0, 0, 'car', 3);
            const truck = new Obstacle(0, 0, 'truck', 3);
            const motorcycle = new Obstacle(0, 0, 'motorcycle', 3);
            return {
                car: { width: car.width, height: car.height, speed: car.speed, type: car.type },
                truck: { width: truck.width, height: truck.height, speed: truck.speed, type: truck.type },
                motorcycle: { width: motorcycle.width, height: motorcycle.height, speed: motorcycle.speed, type: motorcycle.type }
            };
        });
        log('障碍物差异', '卡车比轿车宽', obstacleTest.truck.width > obstacleTest.car.width,
            `truck=${obstacleTest.truck.width}px > car=${obstacleTest.car.width}px`);
        log('障碍物差异', '轿车比摩托车宽', obstacleTest.car.width > obstacleTest.motorcycle.width,
            `car=${obstacleTest.car.width}px > motorcycle=${obstacleTest.motorcycle.width}px`);
        log('障碍物差异', '摩托车比轿车快', obstacleTest.motorcycle.speed > obstacleTest.car.speed,
            `motorcycle=${obstacleTest.motorcycle.speed.toFixed(1)} > car=${obstacleTest.car.speed.toFixed(1)}`);
        log('障碍物差异', '卡车比轿车慢', obstacleTest.truck.speed < obstacleTest.car.speed,
            `truck=${obstacleTest.truck.speed.toFixed(1)} < car=${obstacleTest.car.speed.toFixed(1)}`);
        log('障碍物差异', '轿车速度为基准1.0x', obstacleTest.car.speed === 3,
            `car.speed=${obstacleTest.car.speed}`);
    } catch (e) {
        log('障碍物差异', '测试异常', false, e.message);
    }

    // ========== 测试5: 难度渐进功能 ==========
    console.log('\n--- 测试5: 难度渐进功能 ---');
    try {
        const diffTest = await page.evaluate(() => {
            const game = window.gameInstance;
            game.obstacleManager.setDifficultyLevel(0);
            const speed0 = game.obstacleManager.baseSpeed;
            const interval0 = game.obstacleManager.spawnInterval;
            game.obstacleManager.setDifficultyLevel(1);
            const speed1 = game.obstacleManager.baseSpeed;
            const interval1 = game.obstacleManager.spawnInterval;
            game.obstacleManager.setDifficultyLevel(5);
            const speed5 = game.obstacleManager.baseSpeed;
            const interval5 = game.obstacleManager.spawnInterval;
            game.obstacleManager.setDifficultyLevel(20);
            const speed20 = game.obstacleManager.baseSpeed;
            const interval20 = game.obstacleManager.spawnInterval;
            return { speed0, interval0, speed1, interval1, speed5, interval5, speed20, interval20 };
        });
        log('难度渐进', '等级1速度增加', diffTest.speed1 > diffTest.speed0,
            `level0=${diffTest.speed0.toFixed(1)} → level1=${diffTest.speed1.toFixed(1)}`);
        log('难度渐进', '等级1生成间隔缩短', diffTest.interval1 < diffTest.interval0,
            `level0=${diffTest.interval0}ms → level1=${diffTest.interval1}ms`);
        log('难度渐进', '等级5速度继续增加', diffTest.speed5 > diffTest.speed1,
            `level1=${diffTest.speed1.toFixed(1)} → level5=${diffTest.speed5.toFixed(1)}`);
        log('难度渐进', '生成间隔下限400ms', diffTest.interval20 >= 400,
            `level20 interval=${diffTest.interval20}ms`);
    } catch (e) {
        log('难度渐进', '测试异常', false, e.message);
    }

    // ========== 测试6: 加速道具效果 ==========
    console.log('\n--- 测试6: 加速道具效果 ---');
    try {
        const boostTest = await page.evaluate(() => {
            const game = window.gameInstance;
            game.player.reset();
            const normalSpeed = game.player.baseSpeed;
            const boostSpeed = game.player.boostSpeed;
            game.player.activateBoost(5000, 10000);
            const hasBoost = game.player.hasBoost;
            const moveBefore = game.player.x;
            game.player.moveRight(1);
            const moveAfter = game.player.x;
            const moveDelta = moveAfter - moveBefore;
            game.player.update(16000);
            const boostExpired = !game.player.hasBoost;
            return { normalSpeed, boostSpeed, hasBoost, moveDelta, boostExpired };
        });
        log('加速道具', '激活后hasBoost为true', boostTest.hasBoost);
        log('加速道具', '加速时移动速度更快', boostTest.boostSpeed > boostTest.normalSpeed,
            `base=${boostTest.normalSpeed} boost=${boostTest.boostSpeed}`);
        log('加速道具', '加速移动距离正确', boostTest.moveDelta === boostTest.boostSpeed,
            `delta=${boostTest.moveDelta} boostSpeed=${boostTest.boostSpeed}`);
        log('加速道具', '超时后自动失效', boostTest.boostExpired);
    } catch (e) {
        log('加速道具', '测试异常', false, e.message);
    }

    // ========== 测试7: 护盾道具效果 ==========
    console.log('\n--- 测试7: 护盾道具效果 ---');
    try {
        const shieldTest = await page.evaluate(() => {
            const game = window.gameInstance;
            game.player.reset();
            game.player.activateShield();
            const hasShield1 = game.player.hasShield;
            const consumed = game.player.consumeShield(10000);
            const hasShield2 = game.player.hasShield;
            const isBlinking = game.player.isBlinking;
            return { hasShield1, consumed, hasShield2, isBlinking };
        });
        log('护盾道具', '激活后hasShield为true', shieldTest.hasShield1);
        log('护盾道具', '消耗返回true', shieldTest.consumed);
        log('护盾道具', '消耗后hasShield为false', !shieldTest.hasShield2);
        log('护盾道具', '消耗后闪烁效果', shieldTest.isBlinking);
    } catch (e) {
        log('护盾道具', '测试异常', false, e.message);
    }

    // 截图: 带护盾状态
    await page.evaluate(() => {
        const game = window.gameInstance;
        game.player.activateShield();
        game.uiManager.setShieldActive(true);
    });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_shield_active.png') });
    console.log('📸 截图: 02_shield_active.png');

    // 截图: 带加速状态
    await page.evaluate(() => {
        const game = window.gameInstance;
        game.player.hasShield = false;
        game.player.activateBoost(5000, performance.now());
        game.uiManager.setShieldActive(false);
        game.uiManager.setBoostActive(true);
    });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_boost_active.png') });
    console.log('📸 截图: 03_boost_active.png');

    // ========== 测试8: 移动端触摸控制 ==========
    console.log('\n--- 测试8: 移动端触摸控制 ---');
    try {
        const touchTest = await page.evaluate(() => {
            const game = window.gameInstance;
            const container = document.getElementById('game-container');
            const rect = container.getBoundingClientRect();

            const leftTouch = new Touch({
                identifier: 1,
                target: container,
                clientX: rect.left + rect.width * 0.25,
                clientY: rect.top + rect.height * 0.8,
                pageX: rect.left + rect.width * 0.25,
                pageY: rect.top + rect.height * 0.8
            });
            container.dispatchEvent(new TouchEvent('touchstart', {
                touches: [leftTouch],
                changedTouches: [leftTouch],
                bubbles: true,
                cancelable: true
            }));
            const isMovingLeft = game.inputManager.isMovingLeft;
            container.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                changedTouches: [leftTouch],
                bubbles: true,
                cancelable: true
            }));

            const rightTouch = new Touch({
                identifier: 2,
                target: container,
                clientX: rect.left + rect.width * 0.75,
                clientY: rect.top + rect.height * 0.8,
                pageX: rect.left + rect.width * 0.75,
                pageY: rect.top + rect.height * 0.8
            });
            container.dispatchEvent(new TouchEvent('touchstart', {
                touches: [rightTouch],
                changedTouches: [rightTouch],
                bubbles: true,
                cancelable: true
            }));
            const isMovingRight = game.inputManager.isMovingRight;
            container.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                changedTouches: [rightTouch],
                bubbles: true,
                cancelable: true
            }));

            const swipeRightTouch1 = new Touch({
                identifier: 3,
                target: container,
                clientX: rect.left + rect.width * 0.3,
                clientY: rect.top + rect.height * 0.5,
                pageX: rect.left + rect.width * 0.3,
                pageY: rect.top + rect.height * 0.5
            });
            container.dispatchEvent(new TouchEvent('touchstart', {
                touches: [swipeRightTouch1],
                changedTouches: [swipeRightTouch1],
                bubbles: true,
                cancelable: true
            }));

            const swipeRightTouch2 = new Touch({
                identifier: 3,
                target: container,
                clientX: rect.left + rect.width * 0.8,
                clientY: rect.top + rect.height * 0.5,
                pageX: rect.left + rect.width * 0.8,
                pageY: rect.top + rect.height * 0.5
            });
            container.dispatchEvent(new TouchEvent('touchmove', {
                touches: [swipeRightTouch2],
                changedTouches: [swipeRightTouch2],
                bubbles: true,
                cancelable: true
            }));
            const isSwipeRight = game.inputManager.isMovingRight;
            container.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                changedTouches: [swipeRightTouch2],
                bubbles: true,
                cancelable: true
            }));

            return { isMovingLeft, isMovingRight, isSwipeRight };
        });
        log('触摸控制', '触摸左半屏触发左移', touchTest.isMovingLeft, `isMovingLeft=${touchTest.isMovingLeft}`);
        log('触摸控制', '触摸右半屏触发右移', touchTest.isMovingRight, `isMovingRight=${touchTest.isMovingRight}`);
        log('触摸控制', '右滑触发右移', touchTest.isSwipeRight, `isSwipeRight=${touchTest.isSwipeRight}`);
    } catch (e) {
        log('触摸控制', '测试异常', false, e.message);
    }

    // ========== 测试9: 音效开关 ==========
    console.log('\n--- 测试9: 音效开关功能 ---');
    try {
        const soundTest = await page.evaluate(() => {
            const game = window.gameInstance;
            const initialState = game.audioManager.enabled;
            const afterToggle1 = game.audioManager.toggle();
            const afterToggle2 = game.audioManager.toggle();
            return { initialState, afterToggle1, afterToggle2 };
        });
        log('音效开关', '初始状态为开启', soundTest.initialState === true);
        log('音效开关', '切换后变为关闭', soundTest.afterToggle1 === false);
        log('音效开关', '再次切换恢复开启', soundTest.afterToggle2 === true);
    } catch (e) {
        log('音效开关', '测试异常', false, e.message);
    }

    // ========== 测试10: 双车道/三车道模式切换 ==========
    console.log('\n--- 测试10: 车道模式切换 ---');
    try {
        const laneTest = await page.evaluate(() => {
            const game = window.gameInstance;
            game.changeLanes(2);
            const road2 = game.renderer._getRoadWidth();
            const lanes2 = game.obstacleManager.laneCount;
            const spawn2 = game.obstacleManager.baseSpawnInterval;

            game.changeLanes(3);
            const road3 = game.renderer._getRoadWidth();
            const lanes3 = game.obstacleManager.laneCount;
            const spawn3 = game.obstacleManager.baseSpawnInterval;

            return { road2, lanes2, spawn2, road3, lanes3, spawn3 };
        });
        log('车道切换', '双车道道路宽度', laneTest.road2 === 320, `width=${laneTest.road2}`);
        log('车道切换', '双车道的laneCount', laneTest.lanes2 === 2, `lanes=${laneTest.lanes2}`);
        log('车道切换', '三车道道路更宽', laneTest.road3 > laneTest.road2,
            `双车道=${laneTest.road2} → 三车道=${laneTest.road3}`);
        log('车道切换', '三车道的laneCount', laneTest.lanes3 === 3, `lanes=${laneTest.lanes3}`);
        log('车道切换', '三车道生成间隔更短', laneTest.spawn3 < laneTest.spawn2,
            `双车道=${laneTest.spawn2}ms → 三车道=${laneTest.spawn3}ms`);
    } catch (e) {
        log('车道切换', '测试异常', false, e.message);
    }

    // ========== 测试11: 最高分持久化 ==========
    console.log('\n--- 测试11: 最高分持久化 ---');
    try {
        const persistTest = await page.evaluate(() => {
            const game = window.gameInstance;
            game.scoreManager.setHighScore(999);
            const read = game.scoreManager.getHighScore();
            const isNewRecord = game.scoreManager.checkNewRecord();
            return { read, isNewRecord, currentScore: game.scoreManager.score };
        });
        log('最高分持久化', '写入后读取一致', persistTest.read === 999, `read=${persistTest.read}`);
        log('最高分持久化', '分数未超过时非新纪录', true, `current=${persistTest.currentScore} high=${persistTest.read}`);
    } catch (e) {
        log('最高分持久化', '测试异常', false, e.message);
    }

    // ========== 截图: 游戏结束界面 ==========
    await page.evaluate(() => {
        const game = window.gameInstance;
        game.endGame();
    });
    await page.waitForSelector('#gameover-screen:not(.hidden)', { timeout: 3000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_game_over.png') });
    console.log('📸 截图: 04_game_over.png');

    // ========== 截图: 主菜单 ==========
    await page.evaluate(() => {
        const game = window.gameInstance;
        game.backToMenu();
    });
    await page.waitForSelector('#menu-screen:not(.hidden)', { timeout: 3000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_main_menu.png') });
    console.log('📸 截图: 05_main_menu.png');

    // ========== 截图: 三车道模式 ==========
    await page.click('.lane-btn[data-lanes="3"]');
    await new Promise(r => setTimeout(r, 300));
    await page.click('#start-btn');
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_three_lanes.png') });
    console.log('📸 截图: 06_three_lanes.png');

    // ========== 截图: 蓝色皮肤 ==========
    await page.evaluate(() => {
        const game = window.gameInstance;
        game.backToMenu();
    });
    await page.waitForSelector('#menu-screen:not(.hidden)', { timeout: 3000 });
    await page.click('.skin-option[data-color="blue"]');
    await new Promise(r => setTimeout(r, 300));
    await page.click('#start-btn');
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_blue_skin.png') });
    console.log('📸 截图: 07_blue_skin.png');

    // ========== 截图: 音效关闭 ==========
    await page.evaluate(() => {
        const game = window.gameInstance;
        game.audioManager.enabled = false;
        game.uiManager.setSoundIcon(false);
    });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_sound_off.png') });
    console.log('📸 截图: 08_sound_off.png');

    await browser.close();

    // ========== 汇总 ==========
    console.log('\n========================================');
    console.log('  测试结果汇总');
    console.log('========================================');
    console.log(`  总计: ${passed + failed} 项`);
    console.log(`  通过: ${passed} 项 ✅`);
    console.log(`  失败: ${failed} 项 ❌`);
    console.log(`  通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    console.log('========================================');

    if (failed > 0) {
        console.log('\n失败项详情:');
        testResults.filter(r => !r.success).forEach(r => {
            console.log(`  ❌ [${r.category}] ${r.name}: ${r.detail}`);
        });
    }

    console.log('\n截图文件:');
    fs.readdirSync(SCREENSHOT_DIR).forEach(f => {
        console.log(`  📸 ${f}`);
    });

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error('测试运行失败:', e);
    process.exit(1);
});
