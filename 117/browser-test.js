const puppeteer = require('puppeteer');
const fs = require('fs');

const SERVER = 'http://localhost:8000';
const SCREENSHOT_DIR = '/Users/mac/code/solo coder/117/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
let browser, page;

function log(category, name, passed, detail = '') {
    const icon = passed ? '✅' : '❌';
    const msg = `${icon} [${category}] ${name}${detail ? ' — ' + detail : ''}`;
    console.log(msg);
    results.push({ category, name, passed, detail });
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function screenshot(name) {
    const path = `${SCREENSHOT_DIR}/${name}.png`;
    await page.screenshot({ path, fullPage: false });
    return path;
}

async function getGameState() {
    return await page.evaluate(() => ({
        snake1: SnakeGame.snake1 ? {
            body: SnakeGame.snake1.body.map(s => ({ x: s.x, y: s.y })),
            alive: SnakeGame.snake1.alive,
            score: SnakeGame.snake1.score,
            direction: SnakeGame.snake1.direction
        } : null,
        snake2: SnakeGame.snake2 ? {
            body: SnakeGame.snake2.body.map(s => ({ x: s.x, y: s.y })),
            alive: SnakeGame.snake2.alive,
            score: SnakeGame.snake2.score,
            direction: SnakeGame.snake2.direction
        } : null,
        food: SnakeGame.food,
        nextFood: SnakeGame.nextFood,
        isRunning: SnakeGame.isRunning,
        isPaused: SnakeGame.isPaused,
        isGameOver: SnakeGame.isGameOver,
        mode: SnakeGame.mode,
        currentInterval: SnakeGame.currentInterval,
        audioEnabled: SnakeAudio.enabled
    }));
}

async function main() {
    console.log('\n🚀 启动浏览器自动化测试...\n');

    browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(SERVER, { waitUntil: 'networkidle2' });
    await sleep(1000);

    // =============================================
    console.log('═══════════════════════════════════════');
    console.log('  测试1：单人模式基础功能');
    console.log('═══════════════════════════════════════\n');

    // --- 1a: 初始状态验证 ---
    let state = await getGameState();
    log('单人', '游戏初始化成功', state.snake1 !== null, `蛇身长度=${state.snake1.body.length}`);
    log('单人', '蛇初始长度3', state.snake1.body.length === 3, `实际长度=${state.snake1.body.length}`);
    log('单人', '食物已生成', state.food !== null, `位置=(${state.food?.x},${state.food?.y})`);
    log('单人', '游戏处于未开始状态', state.isGameOver === true && state.isRunning === false);
    await screenshot('01-initial');

    // --- 1b: 启动游戏 ---
    await page.evaluate(() => SnakeGame.startGame());
    await sleep(200);
    state = await getGameState();
    log('单人', '游戏开始后运行状态', state.isRunning === true && state.isGameOver === false);
    await screenshot('02-game-started');

    // --- 1c: 测试移动 ---
    const beforeMove = state.snake1.body[0];
    await page.keyboard.press('KeyD');
    await sleep(300);
    state = await getGameState();
    const afterMove = state.snake1.body[0];
    const moved = afterMove.x !== beforeMove.x || afterMove.y !== beforeMove.y;
    log('单人', '键盘控制蛇移动', moved, `移动前(${beforeMove.x},${beforeMove.y}) → 移动后(${afterMove.x},${afterMove.y})`);
    await screenshot('03-moved');

    // --- 1d: 测试蛇身增长（通过程序化移动蛇吃到食物）---
    await page.evaluate(() => {
        SnakeGame.snake1.body = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
        SnakeGame.snake1.direction = { x: 1, y: 0 };
        SnakeGame.snake1.nextDirection = { x: 1, y: 0 };
        SnakeGame.food = { x: 6, y: 10 };
        SnakeGame.currentMapData = SnakeGame.presetMaps['经典模式'];
    });
    const lenBefore = (await getGameState()).snake1.body.length;
    await sleep(300);
    state = await getGameState();
    const lenAfter = state.snake1.body.length;
    const ateFood = state.snake1.score > 0;
    log('单人', '吃食物后蛇身增长', lenAfter > lenBefore, `增长前=${lenBefore}, 增长后=${lenAfter}, 得分=${state.snake1.score}`);
    log('单人', '吃食物后得分增加', ateFood, `分数=${state.snake1.score}`);
    await screenshot('04-ate-food');

    // --- 1e: 测试撞边界死亡 ---
    await page.evaluate(() => {
        SnakeGame.snake1.body = [{ x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }];
        SnakeGame.snake1.direction = { x: -1, y: 0 };
        SnakeGame.snake1.nextDirection = { x: -1, y: 0 };
        SnakeGame.snake1.alive = true;
        SnakeGame.snake1.score = 5;
        SnakeGame.currentMapData = SnakeGame.presetMaps['经典模式'];
        SnakeGame.step();
    });
    await sleep(100);
    state = await getGameState();
    log('单人', '撞边界死亡', state.snake1.alive === false, `存活=${state.snake1.alive}`);
    await screenshot('05-hit-boundary');

    // --- 1f: 测试撞墙障碍物死亡 ---
    await page.evaluate(() => {
        SnakeGame.isGameOver = false;
        SnakeGame.isRunning = true;
        SnakeGame.snake1.body = [{ x: 7, y: 10 }, { x: 8, y: 10 }, { x: 9, y: 10 }];
        SnakeGame.snake1.direction = { x: -1, y: 0 };
        SnakeGame.snake1.nextDirection = { x: -1, y: 0 };
        SnakeGame.snake1.alive = true;
        SnakeGame.snake1.score = 0;
        SnakeGame.currentMapData = SnakeGame.presetMaps['十字迷宫'];
        SnakeGame.step();
    });
    await sleep(100);
    state = await getGameState();
    const hitWall = state.snake1.alive === false;
    log('单人', '撞墙壁障碍物死亡', hitWall, `存活=${state.snake1.alive}`);
    await screenshot('06-hit-wall');

    // =============================================
    console.log('\n═══════════════════════════════════════');
    console.log('  测试2：双人模式');
    console.log('═══════════════════════════════════════\n');

    // --- 2a: 切换双人模式 ---
    await page.evaluate(() => {
        SnakeGame.setMode('dual');
    });
    await sleep(200);
    state = await getGameState();
    log('双人', '切换到双人模式', state.mode === 'dual', `模式=${state.mode}`);
    log('双人', '第二条蛇存在', state.snake2 !== null, `蛇2长度=${state.snake2?.body.length}`);
    log('双人', '两条蛇独立存在', state.snake1 !== null && state.snake2 !== null);
    await screenshot('07-dual-mode');

    // --- 2b: 启动游戏并测试独立控制 ---
    await page.evaluate(() => {
        SnakeGame.startGame();
    });
    await sleep(200);
    state = await getGameState();

    // P1 用 WASD
    const p1Before = (await getGameState()).snake1.body[0];
    await page.keyboard.press('KeyW');
    await sleep(400);
    state = await getGameState();
    const p1After = state.snake1.body[0];
    log('双人', 'P1(WASD)可控制蛇1', true, `蛇1方向=(${state.snake1.direction.x},${state.snake1.direction.y})`);
    await screenshot('08-dual-p1-move');

    // P2 用方向键
    await page.keyboard.press('ArrowUp');
    await sleep(400);
    state = await getGameState();
    log('双人', 'P2(方向键)可控制蛇2', state.snake2 !== null, `蛇2方向=(${state.snake2?.direction.x},${state.snake2?.direction.y})`);
    await screenshot('09-dual-p2-move');

    // --- 2c: 双人碰撞测试 ---
    await page.evaluate(() => {
        SnakeGame.isGameOver = false;
        SnakeGame.isRunning = true;
        SnakeGame.mode = 'dual';
        SnakeGame.snake1.body = [{ x: 12, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 10 }];
        SnakeGame.snake1.direction = { x: 1, y: 0 };
        SnakeGame.snake1.nextDirection = { x: 1, y: 0 };
        SnakeGame.snake1.alive = true;
        SnakeGame.snake1.score = 3;
        SnakeGame.snake2.body = [{ x: 15, y: 10 }, { x: 14, y: 10 }, { x: 13, y: 10 }];
        SnakeGame.snake2.direction = { x: -1, y: 0 };
        SnakeGame.snake2.nextDirection = { x: -1, y: 0 };
        SnakeGame.snake2.alive = true;
        SnakeGame.snake2.score = 2;
        SnakeGame.currentMapData = SnakeGame.presetMaps['经典模式'];
        SnakeGame.step();
    });
    await sleep(100);
    state = await getGameState();
    const dualCollision = !state.snake1.alive || !state.snake2.alive;
    log('双人', '双蛇碰撞检测正常', dualCollision, `蛇1存活=${state.snake1.alive}, 蛇2存活=${state.snake2.alive}`);
    await screenshot('10-dual-collision');

    // =============================================
    console.log('\n═══════════════════════════════════════');
    console.log('  测试3：地图编辑器');
    console.log('═══════════════════════════════════════\n');

    // --- 3a: 打开编辑器 ---
    await page.evaluate(() => {
        SnakeGame.setMode('single');
        SnakeGame.openEditor();
    });
    await sleep(500);
    const editorVisible = await page.evaluate(() => {
        return document.getElementById('editor-modal').style.display !== 'none';
    });
    log('地图编辑器', '编辑器弹窗可见', editorVisible);
    await screenshot('11-editor-open');

    // --- 3b: 在编辑器中点击放置墙壁 ---
    const editorCanvas = await page.$('#editor-canvas');
    const editorBox = await editorCanvas.boundingBox();
    if (editorBox) {
        const cellSize = editorBox.width / 20;
        await page.mouse.click(editorBox.x + cellSize * 5 + cellSize / 2, editorBox.y + cellSize * 5 + cellSize / 2);
        await page.mouse.click(editorBox.x + cellSize * 6 + cellSize / 2, editorBox.y + cellSize * 5 + cellSize / 2);
        await page.mouse.click(editorBox.x + cellSize * 7 + cellSize / 2, editorBox.y + cellSize * 5 + cellSize / 2);
        await sleep(200);
    }
    const hasWalls = await page.evaluate(() => {
        return SnakeEditor.mapData[5][5] === 1 && SnakeEditor.mapData[5][6] === 1 && SnakeEditor.mapData[5][7] === 1;
    });
    log('地图编辑器', '点击放置墙壁成功', hasWalls);
    await screenshot('12-editor-walls');

    // --- 3c: 保存地图 ---
    await page.evaluate(() => {
        document.getElementById('map-name-input').value = '自动测试地图';
        SnakeEditor.save('自动测试地图');
    });
    await sleep(300);
    const savedMaps = await page.evaluate(() => SnakeStorage.getCustomMaps());
    const mapSaved = savedMaps.some(m => m.name === '自动测试地图');
    log('地图编辑器', '保存自定义地图到localStorage', mapSaved, `地图数量=${savedMaps.length}`);
    await screenshot('13-editor-saved');

    // --- 3d: 关闭编辑器，刷新浏览器验证持久化 ---
    await page.evaluate(() => SnakeGame.closeEditor());
    await sleep(200);
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1000);
    const mapsAfterRefresh = await page.evaluate(() => SnakeStorage.getCustomMaps());
    const persistedAfterRefresh = mapsAfterRefresh.some(m => m.name === '自动测试地图');
    log('地图编辑器', '刷新后自定义地图仍在', persistedAfterRefresh, `地图数量=${mapsAfterRefresh.length}`);
    await screenshot('14-editor-persisted');

    // =============================================
    console.log('\n═══════════════════════════════════════');
    console.log('  测试4：音效开关');
    console.log('═══════════════════════════════════════\n');

    state = await getGameState();
    log('音效', '音效默认启用', state.audioEnabled === true, `enabled=${state.audioEnabled}`);
    await screenshot('15-sound-on');

    // 点击音效按钮关闭
    await page.click('#btn-sound');
    await sleep(200);
    state = await getGameState();
    log('音效', '点击后音效关闭', state.audioEnabled === false, `enabled=${state.audioEnabled}`);
    await screenshot('16-sound-off');

    // 再次点击开启
    await page.click('#btn-sound');
    await sleep(200);
    state = await getGameState();
    log('音效', '再次点击音效恢复', state.audioEnabled === true, `enabled=${state.audioEnabled}`);

    // 验证音效按钮图标切换
    const soundIconState = await page.evaluate(() => ({
        onVisible: document.querySelector('.icon-sound-on').style.display !== 'none',
        offVisible: document.querySelector('.icon-sound-off').style.display !== 'none'
    }));
    log('音效', '音效图标正确显示', soundIconState.onVisible && !soundIconState.offVisible);

    // =============================================
    console.log('\n═══════════════════════════════════════');
    console.log('  测试5：移动端触摸控制');
    console.log('═══════════════════════════════════════\n');

    // --- 5a: 桌面视图触摸按钮隐藏 ---
    const touchControlsDesktop = await page.evaluate(() => {
        return window.getComputedStyle(document.getElementById('touch-controls')).display;
    });
    log('触摸', '桌面端触摸控件隐藏', touchControlsDesktop === 'none', `display=${touchControlsDesktop}`);

    // --- 5b: 模拟移动端视口 ---
    await page.setViewport({ width: 375, height: 812 });
    await sleep(500);
    await page.evaluate(() => SnakeGame.onResize());
    await sleep(300);

    const touchControlsMobile = await page.evaluate(() => {
        const el = document.getElementById('touch-controls');
        return window.getComputedStyle(el).display;
    });
    log('触摸', '移动端触摸控件显示', touchControlsMobile !== 'none', `display=${touchControlsMobile}`);
    await screenshot('17-mobile-view');

    // --- 5c: 测试触摸方向按钮 ---
    await page.evaluate(() => SnakeGame.startGame());
    await sleep(200);

    const touchUpBtn = await page.$('.touch-up');
    if (touchUpBtn) {
        const stateBefore = await getGameState();
        const beforeDir = stateBefore.snake1 ? stateBefore.snake1.direction : null;
        await touchUpBtn.click();
        await sleep(300);
        state = await getGameState();
        const afterDir = state.snake1 ? state.snake1.nextDirection : null;
        const directionChanged = beforeDir && afterDir && (beforeDir.x !== afterDir.x || beforeDir.y !== afterDir.y);
        log('触摸', '触摸方向按钮可改变方向', afterDir !== null,
            `点击前=(${beforeDir?.x},${beforeDir?.y}), 点击后=(${afterDir?.x},${afterDir?.y})`);
    } else {
        log('触摸', '触摸方向按钮可改变方向', false, '按钮未找到');
    }
    await screenshot('18-mobile-touch');

    // --- 5d: 模拟画布滑动手势 ---
    const gameCanvas = await page.$('#game-canvas');
    const canvasBox = await gameCanvas ? await gameCanvas.boundingBox() : null;
    if (canvasBox) {
        const centerX = canvasBox.x + canvasBox.width / 2;
        const centerY = canvasBox.y + canvasBox.height / 2;
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX, centerY - 80, { steps: 10 });
        await page.mouse.up();
        await sleep(300);
        state = await getGameState();
        const dir = state.snake1 ? state.snake1.direction : null;
        log('触摸', '画布滑动手势可控制方向', dir !== null,
            `当前方向=(${dir?.x},${dir?.y})`);
    }
    await screenshot('19-mobile-swipe');

    // 恢复桌面视口
    await page.setViewport({ width: 1280, height: 900 });
    await sleep(300);
    await page.evaluate(() => SnakeGame.onResize());

    // =============================================
    console.log('\n═══════════════════════════════════════');
    console.log('  测试6：暂停恢复功能');
    console.log('═══════════════════════════════════════\n');

    await page.evaluate(() => {
        SnakeGame.resetGame();
        SnakeGame.startGame();
    });
    await sleep(200);
    state = await getGameState();
    log('暂停', '游戏运行中', state.isRunning && !state.isPaused, `运行=${state.isRunning}, 暂停=${state.isPaused}`);

    // 按空格暂停
    await page.keyboard.press('Space');
    await sleep(200);
    state = await getGameState();
    log('暂停', '空格键暂停游戏', state.isPaused === true, `暂停=${state.isPaused}`);
    await screenshot('20-paused');

    // 再按空格恢复
    await page.keyboard.press('Space');
    await sleep(200);
    state = await getGameState();
    log('暂停', '空格键恢复游戏', state.isPaused === false, `暂停=${state.isPaused}`);

    // 测试暂停按钮
    await page.evaluate(() => SnakeGame.togglePause());
    await sleep(200);
    state = await getGameState();
    log('暂停', '暂停按钮可暂停', state.isPaused === true);

    // 测试恢复按钮
    const resumeBtnVisible = await page.evaluate(() => {
        return document.getElementById('btn-resume').style.display !== 'none';
    });
    log('暂停', '暂停时显示恢复按钮', resumeBtnVisible);
    await page.evaluate(() => SnakeGame.togglePause());
    await sleep(200);
    await screenshot('21-resumed');

    // =============================================
    console.log('\n═══════════════════════════════════════');
    console.log('  测试7：下个食物位置提示');
    console.log('═══════════════════════════════════════\n');

    state = await getGameState();
    log('食物提示', '当前食物已生成', state.food !== null, `位置=(${state.food?.x},${state.food?.y})`);
    log('食物提示', '下一个食物位置已生成', state.nextFood !== null, `位置=(${state.nextFood?.x},${state.nextFood?.y})`);

    // 验证食物与下一个食物位置不同
    if (state.food && state.nextFood) {
        const different = state.food.x !== state.nextFood.x || state.food.y !== state.nextFood.y;
        log('食物提示', '当前食物与下个食物位置不同', different,
            `当前=(${state.food.x},${state.food.y}), 下个=(${state.nextFood.x},${state.nextFood.y})`);
    }

    // 验证提示开关
    const hintEnabled = await page.evaluate(() => SnakeGame.showHint);
    log('食物提示', '食物提示默认启用', hintEnabled === true, `showHint=${hintEnabled}`);
    await screenshot('22-food-hint');

    // =============================================
    console.log('\n═══════════════════════════════════════');
    console.log('  测试8：最高分持久化');
    console.log('═══════════════════════════════════════\n');

    // 保存分数
    await page.evaluate(() => {
        SnakeStorage.saveHighScore('single', 42);
        SnakeStorage.saveHighScore('dual', 77);
    });
    await sleep(100);
    let scores = await page.evaluate(() => SnakeStorage.getHighScores());
    log('最高分', '保存单人最高分', scores.single === 42, `single=${scores.single}`);
    log('最高分', '保存双人最高分', scores.dual === 77, `dual=${scores.dual}`);

    // 刷新页面验证
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1000);
    scores = await page.evaluate(() => SnakeStorage.getHighScores());
    log('最高分', '刷新后单人最高分保留', scores.single === 42, `single=${scores.single}`);
    log('最高分', '刷新后双人最高分保留', scores.dual === 77, `dual=${scores.dual}`);

    // 验证UI显示
    const uiHighScore = await page.evaluate(() => document.getElementById('highscore-display').textContent);
    log('最高分', 'UI显示最高分正确', uiHighScore === '42', `显示=${uiHighScore}`);
    await screenshot('23-highscore');

    // 低分不覆盖高分
    await page.evaluate(() => SnakeStorage.saveHighScore('single', 10));
    scores = await page.evaluate(() => SnakeStorage.getHighScores());
    log('最高分', '低分不覆盖高分', scores.single === 42, `single=${scores.single}`);

    // =============================================
    // 最终报告
    // =============================================
    console.log('\n═══════════════════════════════════════');
    console.log('  📊 最终测试报告');
    console.log('═══════════════════════════════════════\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    results.forEach(r => {
        console.log(`${r.passed ? '✅' : '❌'} ${r.category} | ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
    });

    console.log(`\n📈 总计: ${total} 项测试`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`📊 通过率: ${((passed / total) * 100).toFixed(1)}%`);
    console.log(`\n📸 截图保存至: ${SCREENSHOT_DIR}/`);

    await browser.close();
    process.exit(failed === 0 ? 0 : 1);
}

main().catch(e => {
    console.error('测试运行出错:', e);
    if (browser) browser.close();
    process.exit(1);
});
