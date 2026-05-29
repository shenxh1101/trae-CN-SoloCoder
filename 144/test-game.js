const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];

function log(testName, passed, details) {
    results.push({ testName, passed, details });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testName}: ${details}`);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function getGameState(page) {
    return await page.evaluate(() => ({
        score: gameState.score,
        combo: gameState.combo,
        highScore: gameState.highScore,
        timeLeft: gameState.timeLeft,
        speedMultiplier: gameState.speedMultiplier,
        doubleScore: gameState.doubleScore,
        slowMode: gameState.slowMode,
        monkeyWidth: gameState.monkeyWidth,
        lastMilestone: gameState.lastMilestone,
        isPlaying: gameState.isPlaying,
        isPaused: gameState.isPaused
    }));
}

async function getUIValues(page) {
    return {
        scoreText: await page.textContent('#score'),
        highScoreText: await page.textContent('#highScore'),
        timeLeftText: await page.textContent('#timeLeft'),
        comboText: await page.textContent('#combo'),
        speedText: await page.textContent('#speedMultiplier')
    };
}

async function screenshot(page, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`📸 截图已保存: ${name}.png`);
    return filePath;
}

async function catchFruitDirect(page, fruitIndex) {
    return await page.evaluate((idx) => {
        const fruits = [
            { emoji: '🍌', name: 'banana', points: 10 },
            { emoji: '🍎', name: 'apple', points: 10 },
            { emoji: '🍊', name: 'orange', points: 10 },
            { emoji: '🍉', name: 'watermelon', points: 10 }
        ];
        const fruit = fruits[idx !== undefined ? idx : 0];
        const item = { ...fruit, type: 'fruit' };
        handleCatch(item);
        return gameState.score;
    }, fruitIndex);
}

async function catchBombDirect(page) {
    return await page.evaluate(() => {
        const item = { emoji: '💣', name: 'bomb', points: -20, type: 'bomb' };
        handleCatch(item);
        return { score: gameState.score, combo: gameState.combo };
    });
}

async function catchPowerupDirect(page, powerupName) {
    return await page.evaluate((name) => {
        const powerup = POWERUPS.find(p => p.name === name);
        const item = { ...powerup, type: 'powerup' };
        handleCatch(item);
        return {
            doubleScore: gameState.doubleScore,
            slowMode: gameState.slowMode,
            monkeyWidth: gameState.monkeyWidth,
            badgeExists: document.getElementById(`powerup-${name}`) !== null
        };
    }, powerupName);
}

async function resetAndStart(page) {
    await page.evaluate(() => { resetGame(); });
    await sleep(200);
    await page.click('#startBtn');
    await sleep(300);
    await page.evaluate(() => {
        gameState.score = 0;
        gameState.combo = 0;
        gameState.lastMilestone = 0;
        gameState.speedMultiplier = 1;
        gameState.doubleScore = false;
        gameState.slowMode = false;
        gameState.monkeyWidth = 80;
        fallingItems = [];
        Object.keys(powerupTimers).forEach(name => {
            if (powerupTimers[name]) {
                clearTimeout(powerupTimers[name]);
                powerupTimers[name] = null;
            }
        });
        document.getElementById('powerupIndicator').innerHTML = '';
        updateUI();
    });
    await sleep(100);
}

async function main() {
    console.log('\n🚀 启动猴子接香蕉游戏自动化测试\n');
    console.log('='.repeat(60));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 800, height: 900 } });
    const page = await context.newPage();

    await page.goto('http://localhost:8000/');
    await sleep(1000);

    await screenshot(page, '00-initial');

    // ============================================================
    // 测试1: 碰撞检测 - 水果和炸弹
    // ============================================================
    console.log('\n📦 测试1: 碰撞检测（水果+炸弹）');
    console.log('-'.repeat(40));

    await resetAndStart(page);

    const state0 = await getGameState(page);
    log('游戏启动', state0.isPlaying === true && state0.score === 0, `isPlaying=${state0.isPlaying}, score=${state0.score}`);

    // Catch 5 different fruits directly
    const fruitNames = ['🍌', '🍎', '🍊', '🍉', '🍌'];
    let prevScore = 0;
    for (let i = 0; i < 5; i++) {
        const newScore = await catchFruitDirect(page, i % 4);
        const state = await getGameState(page);
        console.log(`  接住${fruitNames[i]}: score=${state.score}, combo=${state.combo}, gained=${state.score - prevScore}`);
        prevScore = state.score;
    }

    const state1 = await getGameState(page);
    await screenshot(page, '01-after-5-fruits');

    const expectedScore5Fruits = 10 + 10 + 15 + 15 + 15;
    log('接住5个水果', state1.score === expectedScore5Fruits && state1.combo === 5,
        `score=${state1.score} (预期${expectedScore5Fruits}), combo=${state1.combo} (预期5)`);

    // Catch 2 bombs
    const bomb1 = await catchBombDirect(page);
    const bomb2 = await catchBombDirect(page);
    const state2 = await getGameState(page);
    await screenshot(page, '02-after-2-bombs');

    const expectedAfterBombs = expectedScore5Fruits - 40;
    log('接住2个炸弹', state2.combo === 0 && state2.score === expectedAfterBombs,
        `score=${state2.score} (预期${expectedAfterBombs}), combo=${state2.combo}`);

    // Verify score doesn't go negative with bombs
    await page.evaluate(() => { gameState.score = 10; updateUI(); });
    await sleep(50);
    await catchBombDirect(page);
    const state3 = await getGameState(page);
    log('炸弹不使分数变负', state3.score === 0, `score=${state3.score} (10-20=max(0,-10)=0)`);

    // Test collision detection function directly with positioned items
    const collisionTest = await page.evaluate(() => {
        const origX = monkey.x;
        const origY = monkey.y;
        const origW = monkey.width;

        monkey.x = 200;
        monkey.y = 300;

        const tests = [];

        const item1 = { x: 200, y: 300, width: 40, height: 40 };
        tests.push({ name: '完全重叠', result: checkCollision(item1) });

        const item2 = { x: 270, y: 300, width: 40, height: 40 };
        tests.push({ name: '右侧边缘接触', result: checkCollision(item2) });

        const item3 = { x: 160, y: 300, width: 40, height: 40 };
        tests.push({ name: '左侧边缘接触', result: checkCollision(item3) });

        const item4 = { x: 400, y: 300, width: 40, height: 40 };
        tests.push({ name: '远离右侧(应不碰撞)', result: checkCollision(item4) });

        const item5 = { x: 200, y: 100, width: 40, height: 40 };
        tests.push({ name: '上方远离(应不碰撞)', result: checkCollision(item5) });

        const item6 = { x: 200, y: monkey.y + monkey.height - 10, width: 40, height: 40 };
        tests.push({ name: '底部边缘接触', result: checkCollision(item6) });

        monkey.x = origX;
        monkey.y = origY;

        return tests;
    });

    console.log('\n  AABB碰撞检测详细测试:');
    collisionTest.forEach(t => {
        console.log(`    ${t.name}: ${t.result ? '✓碰撞' : '✗不碰撞'}`);
    });

    const collisionAllCorrect = 
        collisionTest[0].result === true &&
        collisionTest[1].result === true &&
        collisionTest[2].result === true &&
        collisionTest[3].result === false &&
        collisionTest[4].result === false &&
        collisionTest[5].result === true;

    log('AABB碰撞检测算法', collisionAllCorrect, `${collisionTest.map(t => `${t.name}=${t.result}`).join(', ')}`);

    // ============================================================
    // 测试2: 三种道具触发和持续时间
    // ============================================================
    console.log('\n📦 测试2: 三种道具触发和持续时间');
    console.log('-'.repeat(40));

    await resetAndStart(page);

    // Test Double Score
    const dsResult = await catchPowerupDirect(page, 'doubleScore');
    const dsState = await getGameState(page);
    await screenshot(page, '03-double-score-active');
    log('双倍得分激活', dsState.doubleScore === true && dsResult.badgeExists,
        `doubleScore=${dsState.doubleScore}, badge=${dsResult.badgeExists}`);

    // Catch fruit with double score
    await catchFruitDirect(page, 0);
    const dsFruitState = await getGameState(page);
    const dsFruitExpected = 10 * 2;
    log('双倍得分下接水果', dsFruitState.score === dsFruitExpected,
        `score=${dsFruitState.score} (预期${dsFruitExpected}=10×2)`);

    // Wait for expiry (8 seconds) - pause game to avoid natural drops
    console.log('  等待双倍得分过期(8秒)...');
    await page.evaluate(() => {
        fallingItems = [];
        gameState.isPaused = true;
    });
    await sleep(8500);
    const dsExpired = await getGameState(page);
    const dsBadgeGone = await page.evaluate(() => document.getElementById('powerup-doubleScore') === null);
    log('双倍得分过期', dsExpired.doubleScore === false && dsBadgeGone,
        `doubleScore=${dsExpired.doubleScore}, badgeGone=${dsBadgeGone}`);

    // Catch fruit after expiry - should be normal
    await page.evaluate(() => { fallingItems = []; gameState.isPaused = false; });
    await catchFruitDirect(page, 0);
    const dsAfterState = await getGameState(page);
    const dsAfterExpected = dsFruitExpected + 10;
    log('过期后接水果恢复正常', dsAfterState.score === dsAfterExpected,
        `score=${dsAfterState.score} (预期${dsAfterExpected})`);

    // Test Slow Down
    await catchPowerupDirect(page, 'slowDown');
    const sdState = await getGameState(page);
    await screenshot(page, '04-slow-down-active');
    log('减速道具激活', sdState.slowMode === true,
        `slowMode=${sdState.slowMode}`);

    const speedWithSlow = await page.evaluate(() => {
        const item = { baseSpeed: 3 };
        const speedMod = gameState.slowMode ? 0.5 : 1;
        return item.baseSpeed * gameState.speedMultiplier * speedMod;
    });
    log('减速效果生效', speedWithSlow === 1.5,
        `实际速度=${speedWithSlow} (3×1.0×0.5=1.5)`);

    console.log('  等待减速道具过期(6秒)...');
    await sleep(6500);
    const sdExpired = await getGameState(page);
    log('减速道具过期', sdExpired.slowMode === false,
        `slowMode=${sdExpired.slowMode}`);

    // Test Wide Catch
    await catchPowerupDirect(page, 'wideCatch');
    const wcState = await getGameState(page);
    await screenshot(page, '05-wide-catch-active');
    log('扩大范围激活', wcState.monkeyWidth === 140,
        `monkeyWidth=${wcState.monkeyWidth} (预期140)`);

    // Verify collision range is wider
    const wideCatchTest = await page.evaluate(() => {
        monkey.x = 200;
        monkey.y = 300;
        const farItem = { x: 290, y: 300, width: 40, height: 40 };
        const normalRange = 80;
        const wideRange = 140;
        const normalLeft = monkey.x + (monkey.width - normalRange) / 2;
        const normalRight = normalLeft + normalRange;
        const wideLeft = monkey.x + (monkey.width - wideRange) / 2;
        const wideRight = wideLeft + wideRange;
        const itemCenterX = farItem.x + farItem.width / 2;
        return {
            inNormalRange: itemCenterX >= normalLeft && itemCenterX <= normalRight,
            inWideRange: itemCenterX >= wideLeft && itemCenterX <= wideRight,
            collisionResult: checkCollision(farItem)
        };
    });
    log('扩大范围碰撞检测', !wideCatchTest.inNormalRange && wideCatchTest.inWideRange && wideCatchTest.collisionResult,
        `normalRange=${wideCatchTest.inNormalRange}, wideRange=${wideCatchTest.inWideRange}, collision=${wideCatchTest.collisionResult}`);

    console.log('  等待扩大范围道具过期(7秒)...');
    await sleep(7500);
    const wcExpired = await getGameState(page);
    log('扩大范围过期', wcExpired.monkeyWidth === 80,
        `monkeyWidth=${wcExpired.monkeyWidth}`);

    // Test powerup re-activation (timer reset)
    await catchPowerupDirect(page, 'doubleScore');
    await sleep(2000);
    await catchPowerupDirect(page, 'doubleScore');
    const reactivatedState = await getGameState(page);
    const badgeCount = await page.evaluate(() => {
        return document.querySelectorAll('#powerup-doubleScore').length;
    });
    log('道具重复激活无重复徽章', reactivatedState.doubleScore === true && badgeCount === 1,
        `doubleScore=${reactivatedState.doubleScore}, badgeCount=${badgeCount}`);

    // ============================================================
    // 测试3: 连续接住6个水果验证连击
    // ============================================================
    console.log('\n📦 测试3: 连击加分系统');
    console.log('-'.repeat(40));

    await resetAndStart(page);

    const comboResults = [];
    let expectedTotal = 0;
    const expectedGains = [10, 10, 15, 15, 15, 20];

    for (let i = 0; i < 6; i++) {
        const prevScore = await page.evaluate(() => gameState.score);
        await catchFruitDirect(page, 0);
        const state = await getGameState(page);
        const gained = state.score - prevScore;
        expectedTotal += expectedGains[i];
        comboResults.push({ combo: state.combo, score: state.score, gained });
        console.log(`  第${i + 1}个水果: combo=${state.combo}, score=${state.score}, gained=${gained} (预期${expectedGains[i]})`);
    }

    await screenshot(page, '06-combo-test');

    const comboAllCorrect = comboResults.every((r, i) => 
        r.combo === i + 1 && r.gained === expectedGains[i]
    );

    const finalComboState = await getGameState(page);
    log('连击加分系统', comboAllCorrect && finalComboState.score === expectedTotal,
        `score=${finalComboState.score} (预期${expectedTotal}), combo=${finalComboState.combo}`);

    // Verify bomb resets combo
    await catchBombDirect(page);
    const afterBombCombo = await getGameState(page);
    log('炸弹重置连击', afterBombCombo.combo === 0,
        `combo=${afterBombCombo.combo}`);

    // ============================================================
    // 测试4: 90分→100+ 和 190分→200+ 速度变化
    // ============================================================
    console.log('\n📦 测试4: 难度递增（速度倍率变化）');
    console.log('-'.repeat(40));

    await resetAndStart(page);

    // Set score to 90 and catch fruit
    await page.evaluate(() => { gameState.score = 90; gameState.lastMilestone = 0; updateUI(); });
    await sleep(100);
    const before100 = await getGameState(page);
    console.log(`  90分: speed=${before100.speedMultiplier}`);

    await catchFruitDirect(page, 0);
    const after100 = await getGameState(page);
    await screenshot(page, '07-speed-at-100');
    log('100分速度变1.1x', after100.speedMultiplier === 1.1 && after100.lastMilestone === 1,
        `speed=${after100.speedMultiplier}, milestone=${after100.lastMilestone}`);

    // Set score to 190 and catch fruit
    await page.evaluate(() => { gameState.score = 190; gameState.lastMilestone = 1; updateUI(); });
    await sleep(100);
    const before200 = await getGameState(page);
    console.log(`  190分: speed=${before200.speedMultiplier}`);

    await catchFruitDirect(page, 0);
    const after200 = await getGameState(page);
    await screenshot(page, '08-speed-at-200');
    log('200分速度变1.2x', after200.speedMultiplier === 1.2 && after200.lastMilestone === 2,
        `speed=${after200.speedMultiplier}, milestone=${after200.lastMilestone}`);

    // Set score to 390 and catch fruit to test 300+
    await page.evaluate(() => { gameState.score = 390; gameState.lastMilestone = 3; updateUI(); });
    await sleep(100);
    await catchFruitDirect(page, 0);
    const after400 = await getGameState(page);
    log('400分速度变1.4x', after400.speedMultiplier === 1.4 && after400.lastMilestone === 4,
        `speed=${after400.speedMultiplier}, milestone=${after400.lastMilestone}`);

    // ============================================================
    // 测试5: 100分里程碑屏幕闪烁
    // ============================================================
    console.log('\n📦 测试5: 100分里程碑闪烁特效');
    console.log('-'.repeat(40));

    await resetAndStart(page);

    // Catch fruits until score crosses 100
    while (true) {
        const state = await getGameState(page);
        if (state.score >= 100) break;
        await catchFruitDirect(page, 0);
    }

    const milestoneState = await getGameState(page);
    await screenshot(page, '09-milestone-reached');
    log('100分里程碑触发', milestoneState.lastMilestone >= 1 && milestoneState.speedMultiplier > 1,
        `score=${milestoneState.score}, milestone=${milestoneState.lastMilestone}, speed=${milestoneState.speedMultiplier}`);

    // Trigger flash and capture it
    const flashResult = await page.evaluate(() => {
        return new Promise((resolve) => {
            triggerMilestoneFlash();
            setTimeout(() => {
                const flash = document.getElementById('milestoneFlash');
                const isActive = flash.classList.contains('active');
                const computedStyle = window.getComputedStyle(flash);
                resolve({
                    classActive: isActive,
                    opacity: computedStyle.opacity
                });
            }, 100);
        });
    });
    await screenshot(page, '10-flash-captured');
    log('闪烁CSS动画触发', flashResult.classActive,
        `classActive=${flashResult.classActive}, opacity=${flashResult.opacity}`);

    // Test multi-milestone skip
    await resetAndStart(page);
    await page.evaluate(() => {
        gameState.score = 0;
        gameState.lastMilestone = 0;
        gameState.doubleScore = true;
        updateUI();
    });
    await sleep(100);

    // Catch fruit with double score to jump multiple milestones
    let prevMilestone = 0;
    let milestoneFlashCount = 0;
    for (let i = 0; i < 12; i++) {
        await catchFruitDirect(page, 0);
        const state = await getGameState(page);
        if (state.lastMilestone > prevMilestone) {
            milestoneFlashCount += (state.lastMilestone - prevMilestone);
            prevMilestone = state.lastMilestone;
        }
    }

    const multiState = await getGameState(page);
    await screenshot(page, '11-multi-milestone');
    log('跨阶里程碑闪烁', milestoneFlashCount >= 2,
        `milestones=${milestoneFlashCount}, score=${multiState.score}, lastMilestone=${multiState.lastMilestone}`);

    // ============================================================
    // UI同步验证
    // ============================================================
    console.log('\n📦 额外验证: UI与游戏状态同步');
    console.log('-'.repeat(40));

    const uiValues = await getUIValues(page);
    const gsFinal = await getGameState(page);

    log('得分UI同步', uiValues.scoreText == gsFinal.score,
        `UI=${uiValues.scoreText}, GS=${gsFinal.score}`);
    log('连击UI同步', uiValues.comboText == gsFinal.combo,
        `UI=${uiValues.comboText}, GS=${gsFinal.combo}`);
    log('速度UI同步', uiValues.speedText === gsFinal.speedMultiplier.toFixed(1) + 'x',
        `UI=${uiValues.speedText}, GS=${gsFinal.speedMultiplier.toFixed(1) + 'x'}`);

    // ============================================================
    // 汇总
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const failed = results.filter(r => !r.passed);

    results.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`${icon} ${r.testName}: ${r.details}`);
    });

    console.log(`\n总计: ${passed}/${total} 通过`);
    if (failed.length > 0) {
        console.log('\n❌ 失败项:');
        failed.forEach(r => console.log(`  - ${r.testName}: ${r.details}`));
    }

    await browser.close();

    console.log(`\n📸 截图保存在: ${SCREENSHOT_DIR}`);
    console.log(`\n${passed === total ? '🎉 所有测试通过！' : '⚠️ 部分测试未通过，请检查上方详情。'}`);

    process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('测试运行出错:', err);
    process.exit(1);
});
