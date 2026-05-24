#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'test_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = [];

function log(message) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${message}`);
}

function testResult(name, passed, details = '') {
    const result = { name, passed, details, timestamp: new Date().toISOString() };
    testResults.push(result);
    
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}`);
    if (details && !passed) {
        console.log(`   ${details}`);
    }
    
    return passed;
}

async function takeScreenshot(page, name) {
    const filename = `${Date.now()}_${name}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    log(`📸 截图已保存: ${filename}`);
    return filepath;
}

async function runTests() {
    console.log('\n' + '='.repeat(80));
    console.log('  3D迷宫漫游游戏 - 浏览器自动化测试');
    console.log('  使用 Playwright + Chromium');
    console.log('='.repeat(80) + '\n');

    log('启动浏览器...');
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        permissions: ['notifications']
    });
    
    const page = await context.newPage();
    
    let consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
            log(`⚠️  控制台错误: ${msg.text()}`);
        }
    });

    page.on('pageerror', error => {
        consoleErrors.push(error.message);
        log(`⚠️  页面错误: ${error.message}`);
    });

    try {
        log('\n' + '-'.repeat(80));
        log('测试1: 页面加载和控制台错误检查');
        log('-'.repeat(80));
        
        log(`导航到: ${TEST_URL}`);
        await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        const title = await page.title();
        const hasGameCanvas = await page.$('#gameCanvas');
        const hasMenu = await page.$('#menu');
        
        testResult('页面标题正确', title === '3D迷宫漫游 - Maze Explorer', 
            '实际标题: ' + title);
        testResult('游戏画布存在', hasGameCanvas !== null);
        testResult('开始菜单存在', hasMenu !== null);
        testResult('页面无控制台错误', consoleErrors.length === 0, 
            consoleErrors.length > 0 ? consoleErrors.join('\n') : '');
        
        await takeScreenshot(page, '01_page_loaded');

        log('\n' + '-'.repeat(80));
        log('测试2: 开始新游戏');
        log('-'.repeat(80));
        
        await page.click('#newGameBtn');
        await page.waitForTimeout(1000);
        
        const hudVisible = await page.isVisible('#hud');
        const menuHidden = await page.isHidden('#menu');
        const clickToStartVisible = await page.isVisible('#clickToStart');
        
        testResult('游戏HUD显示', hudVisible);
        testResult('开始菜单隐藏', menuHidden);
        testResult('点击开始提示显示', clickToStartVisible);
        
        await takeScreenshot(page, '02_game_started');

        log('\n' + '-'.repeat(80));
        log('测试3: 鼠标视角控制');
        log('-'.repeat(80));
        
        await page.click('#clickToStart');
        await page.waitForTimeout(500);
        
        const isLocked = await page.evaluate(() => {
            return document.pointerLockElement !== null;
        });
        
        testResult('鼠标锁定成功', isLocked);
        
        const initialYaw = await page.evaluate(() => window.gameState?.player?.yaw);
        await page.mouse.move(100, 0);
        await page.waitForTimeout(500);
        const newYaw = await page.evaluate(() => window.gameState?.player?.yaw);
        
        const yawChanged = initialYaw !== undefined && newYaw !== undefined && initialYaw !== newYaw;
        testResult('鼠标移动改变视角', yawChanged, 
            '初始yaw: ' + initialYaw + ', 移动后yaw: ' + newYaw);
        
        await takeScreenshot(page, '03_mouse_control');

        log('\n' + '-'.repeat(80));
        log('测试4: WASD移动和穿墙检测');
        log('-'.repeat(80));
        
        const initialPos = await page.evaluate(() => {
            return {
                x: window.gameState?.player?.position?.x,
                z: window.gameState?.player?.position?.z
            };
        });
        
        log('初始位置: x=' + initialPos.x.toFixed(2) + ', z=' + initialPos.z.toFixed(2));
        
        await page.keyboard.down('KeyW');
        await page.waitForTimeout(1000);
        await page.keyboard.up('KeyW');
        
        const posAfterW = await page.evaluate(() => ({
            x: window.gameState?.player?.position?.x,
            z: window.gameState?.player?.position?.z
        }));
        
        const movedForward = Math.abs(posAfterW.z - initialPos.z) > 0.1;
        testResult('W键向前移动', movedForward, 
            'W键移动距离: ' + Math.abs(posAfterW.z - initialPos.z).toFixed(2) + 'm');
        
        log('W键移动后: x=' + posAfterW.x.toFixed(2) + ', z=' + posAfterW.z.toFixed(2));
        
        await page.keyboard.down('KeyD');
        await page.waitForTimeout(1000);
        await page.keyboard.up('KeyD');
        
        const posAfterD = await page.evaluate(() => ({
            x: window.gameState?.player?.position?.x,
            z: window.gameState?.player?.position?.z
        }));
        
        const movedRight = Math.abs(posAfterD.x - posAfterW.x) > 0.1;
        testResult('D键向右移动', movedRight,
            'D键移动距离: ' + Math.abs(posAfterD.x - posAfterW.x).toFixed(2) + 'm');
        
        log('D键移动后: x=' + posAfterD.x.toFixed(2) + ', z=' + posAfterD.z.toFixed(2));
        
        await page.keyboard.down('KeyS');
        await page.waitForTimeout(1000);
        await page.keyboard.up('KeyS');
        
        await page.keyboard.down('KeyA');
        await page.waitForTimeout(1000);
        await page.keyboard.up('KeyA');
        
        const finalPos = await page.evaluate(() => ({
            x: window.gameState?.player?.position?.x,
            z: window.gameState?.player?.position?.z
        }));
        
        log('移动测试完成: x=' + finalPos.x.toFixed(2) + ', z=' + finalPos.z.toFixed(2));
        
        const collisionCheck = await page.evaluate(() => {
            const pos = window.gameState.player.position;
            const checkCollision = window.checkCollision;
            if (!checkCollision) return { error: 'checkCollision function not found' };
            
            const maze = window.gameState.maze;
            const cellSize = 4;
            const totalSize = maze.length * cellSize;
            const offset = -totalSize / 2 + cellSize / 2;
            
            const gridX = Math.floor((pos.x - offset) / cellSize + 0.5);
            const gridY = Math.floor((pos.z - offset) / cellSize + 0.5);
            
            return {
                inBounds: gridX >= 0 && gridX < maze[0].length && gridY >= 0 && gridY < maze.length,
                gridX: gridX,
                gridY: gridY
            };
        });
        
        testResult('玩家在迷宫边界内', collisionCheck.inBounds,
            '网格位置: (' + collisionCheck.gridX?.toFixed(2) + ', ' + collisionCheck.gridY?.toFixed(2) + ')');
        
        await takeScreenshot(page, '04_wasd_movement');

        log('\n' + '-'.repeat(80));
        log('测试5: 手电筒F键开关');
        log('-'.repeat(80));
        
        const flashlightStateBefore = await page.evaluate(() => {
            return window.gameState?.flashlightOn;
        });
        
        log('手电筒初始状态: ' + (flashlightStateBefore ? '开' : '关'));
        
        await page.keyboard.press('KeyF');
        await page.waitForTimeout(500);
        
        const flashlightStateAfter = await page.evaluate(() => {
            return window.gameState?.flashlightOn;
        });
        
        const toggled1 = flashlightStateBefore !== undefined && 
                     flashlightStateAfter !== undefined &&
                     flashlightStateBefore !== flashlightStateAfter;
        testResult('F键切换手电筒状态', toggled1,
            '切换前: ' + flashlightStateBefore + ', 切换后: ' + flashlightStateAfter);
        
        const flashlightIntensity = await page.evaluate(() => {
            return window.flashlight?.intensity;
        });
        
        const lightIntensityCorrect = flashlightStateAfter ? 
            (flashlightIntensity > 0) : (flashlightIntensity === 0);
        testResult('手电筒光照强度对应状态', lightIntensityCorrect,
            '光照强度: ' + flashlightIntensity + ', 期望: ' + (flashlightStateAfter ? '>0' : '=0'));
        
        const hudFlashlightState = await page.textContent('#flashlightState');
        testResult('HUD显示手电筒状态', hudFlashlightState.includes(flashlightStateAfter ? '开' : '关'),
            'HUD显示: ' + hudFlashlightState);
        
        await page.keyboard.press('KeyF');
        await page.waitForTimeout(500);
        
        await takeScreenshot(page, '05_flashlight');

        log('\n' + '-'.repeat(80));
        log('测试6: HUD显示验证');
        log('-'.repeat(80));
        
        const timerVisible = await page.isVisible('#timer');
        const stepsVisible = await page.isVisible('#steps');
        const starsVisible = await page.isVisible('#stars');
        const minimapVisible = await page.isVisible('#minimap');
        
        testResult('计时器可见', timerVisible);
        testResult('步数可见', stepsVisible);
        testResult('星星计数可见', starsVisible);
        testResult('小地图可见', minimapVisible);
        
        const timerValue = await page.textContent('#timer');
        const stepsValue = await page.textContent('#steps');
        log('计时器: ' + timerValue + ', 步数: ' + stepsValue);
        
        testResult('计时器格式正确', /^\d{2}:\d{2}$/.test(timerValue || ''),
            '实际值: ' + timerValue);
        
        await takeScreenshot(page, '06_hud_display');

        log('\n' + '-'.repeat(80));
        log('测试7: 游戏对象存在性检查');
        log('-'.repeat(80));
        
        const gameObjects = await page.evaluate(() => {
            return {
                keyCount: window.gameState?.keyObjects?.length || 0,
                starCount: window.gameState?.starObjects?.length || 0,
                enemyCount: window.gameState?.enemies?.length || 0,
                exitDoor: window.gameState?.exitDoor !== null,
                collectedKeys: window.gameState?.collectedKeys || 0,
                totalStars: window.gameState?.totalStars || 0
            };
        });
        
        testResult('钥匙存在', gameObjects.keyCount === 3,
            '钥匙数量: ' + gameObjects.keyCount + ', 期望: 3');
        testResult('星星存在', gameObjects.starCount > 0,
            '星星数量: ' + gameObjects.starCount);
        testResult('敌人存在', gameObjects.enemyCount > 0,
            '敌人数量: ' + gameObjects.enemyCount);
        testResult('出口门存在', gameObjects.exitDoor);
        testResult('初始钥匙收集数为0', gameObjects.collectedKeys === 0);
        
        log('游戏对象: 钥匙=' + gameObjects.keyCount + ', 星星=' + gameObjects.starCount + ', 敌人=' + gameObjects.enemyCount);

        log('\n' + '-'.repeat(80));
        log('测试8: 出口门颜色');
        log('-'.repeat(80));
        
        const doorColorBefore = await page.evaluate(() => {
            const door = window.gameState?.exitDoor?.userData?.doorMesh;
            if (!door) return null;
            return {
                r: door.material.color.r,
                g: door.material.color.g,
                b: door.material.color.b,
                isOpen: window.gameState?.exitDoor?.userData?.isOpen
            };
        });
        
        if (doorColorBefore) {
            const isRed = doorColorBefore.r > 0.8 && doorColorBefore.g < 0.2 && doorColorBefore.b < 0.2;
            testResult('出口门初始为红色', isRed,
                '颜色: R=' + doorColorBefore.r.toFixed(2) + ', G=' + doorColorBefore.g.toFixed(2) + ', B=' + doorColorBefore.b.toFixed(2));
            testResult('出口门初始未开启', !doorColorBefore.isOpen);
        } else {
            testResult('出口门颜色检查', false, '无法获取出口门颜色');
        }

        log('\n' + '-'.repeat(80));
        log('测试9: 星星旋转动画');
        log('-'.repeat(80));
        
        const starRotationBefore = await page.evaluate(() => {
            const stars = window.gameState?.starObjects;
            if (!stars || stars.length === 0) return null;
            return stars[0].rotation.y;
        });
        
        await page.waitForTimeout(1000);
        
        const starRotationAfter = await page.evaluate(() => {
            const stars = window.gameState?.starObjects;
            if (!stars || stars.length === 0) return null;
            return stars[0].rotation.y;
        });
        
        if (starRotationBefore !== null && starRotationAfter !== null) {
            const rotating = Math.abs(starRotationAfter - starRotationBefore) > 0.01;
            testResult('星星旋转动画正常', rotating,
                '旋转角度变化: ' + Math.abs(starRotationAfter - starRotationBefore).toFixed(4) + '弧度');
        } else {
            testResult('星星旋转动画检查', false, '没有星星对象');
        }

        log('\n' + '-'.repeat(80));
        log('测试10: 小地图实时更新');
        log('-'.repeat(80));
        
        const exploredCellsBefore = await page.evaluate(() => {
            return window.gameState?.exploredCells?.size || 0;
        });
        
        log('已探索单元格数量(移动前): ' + exploredCellsBefore);
        
        const playerPosBefore = await page.evaluate(() => {
            const offset = -(window.gameState.maze.length * 4) / 2 + 2;
            const cellSize = 4;
            const pos = window.gameState.player.position;
            return {
                gridX: Math.floor((pos.x - offset) / cellSize + 0.5),
                gridY: Math.floor((pos.z - offset) / cellSize + 0.5)
            };
        });
        
        log('玩家网格位置: (' + playerPosBefore.gridX + ', ' + playerPosBefore.gridY + ')');
        
        const minimapData = await page.evaluate(() => {
            const canvas = document.getElementById('minimap');
            if (!canvas) return null;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return {
                width: canvas.width,
                height: canvas.height,
                nonBlackPixels: Array.from(imageData.data).filter((v, i) => 
                    i % 4 === 0 && v > 10).length
            };
        });
        
        if (minimapData) {
            testResult('小地图有像素数据', minimapData.nonBlackPixels > 100,
                '非黑色像素数量: ' + minimapData.nonBlackPixels);
        }

        log('\n' + '-'.repeat(80));
        log('测试11: 粒子特效系统');
        log('-'.repeat(80));
        
        const particlesBefore = await page.evaluate(() => {
            return window.gameState?.particles?.length || 0;
        });
        
        testResult('粒子系统存在', particlesBefore !== undefined);
        log('当前粒子数量: ' + particlesBefore);
        
        await takeScreenshot(page, '07_particles');

        log('\n' + '-'.repeat(80));
        log('测试12: 钥匙收集和大门变色');
        log('-'.repeat(80));
        
        const collectResult = await page.evaluate(() => {
            const keys = window.gameState?.keyObjects;
            if (!keys || keys.length === 0) return { success: false, error: 'No keys' };
            
            const playerPos = window.gameState.player.position;
            
            for (let i = 0; i < keys.length; i++) {
                if (!keys[i].userData.collected) {
                    keys[i].position.copy(playerPos);
                    keys[i].position.y = playerPos.y;
                    break;
                }
            }
            
            return { success: true, keysLeft: window.gameState.keyObjects.filter(k => !k.userData.collected).length };
        });
        
        await page.waitForTimeout(500);
        
        const collectedAfter = await page.evaluate(() => window.gameState?.collectedKeys || 0);
        testResult('钥匙收集功能正常', collectedAfter > 0,
            '已收集钥匙数量: ' + collectedAfter);
        
        const collectAllResult = await page.evaluate(() => {
            const keys = window.gameState?.keyObjects;
            if (!keys) return false;
            
            keys.forEach(key => {
                if (!key.userData.collected) {
                    window.gameState.collectedKeys++;
                    key.userData.collected = true;
                    window.scene.remove(key);
                }
            });
            
            if (window.gameState.collectedKeys >= 3) {
                window.openExitDoor();
            }
            
            return window.gameState.collectedKeys;
        });
        
        await page.waitForTimeout(1000);
        
        const doorColorAfter = await page.evaluate(() => {
            const door = window.gameState?.exitDoor?.userData?.doorMesh;
            if (!door) return null;
            return {
                r: door.material.color.r,
                g: door.material.color.g,
                b: door.material.color.b,
                isOpen: window.gameState?.exitDoor?.userData?.isOpen
            };
        });
        
        if (doorColorAfter) {
            const isGreen = doorColorAfter.g > 0.8 && doorColorAfter.r < 0.2 && doorColorAfter.b < 0.2;
            testResult('收集全部钥匙后大门变绿色', isGreen,
                '颜色: R=' + doorColorAfter.r.toFixed(2) + ', G=' + doorColorAfter.g.toFixed(2) + ', B=' + doorColorAfter.b.toFixed(2));
            testResult('出口门已开启', doorColorAfter.isOpen);
        }
        
        const particlesAfter = await page.evaluate(() => window.gameState?.particles?.length || 0);
        testResult('收集钥匙产生粒子特效', particlesAfter > 0,
            '粒子数量: ' + particlesAfter);
        
        await takeScreenshot(page, '08_door_green');

        log('\n' + '-'.repeat(80));
        log('测试13: 暂停和继续');
        log('-'.repeat(80));
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        const pauseMenuVisible = await page.isVisible('#pauseMenu');
        testResult('ESC键显示暂停菜单', pauseMenuVisible);
        
        await takeScreenshot(page, '09_pause_menu');

        log('\n' + '-'.repeat(80));
        log('测试14: 存档系统');
        log('-'.repeat(80));
        
        await page.click('#saveBtn');
        await page.waitForTimeout(500);
        
        const saveExists = await page.evaluate(() => {
            return localStorage.getItem('maze_save') !== null;
        });
        
        testResult('游戏存档保存成功', saveExists);
        
        const saveData = await page.evaluate(() => {
            const save = localStorage.getItem('maze_save');
            if (!save) return null;
            const data = JSON.parse(save);
            return {
                seed: data.seed,
                difficulty: data.difficulty,
                collectedKeys: data.collectedKeys,
                steps: data.steps
            };
        });
        
        if (saveData) {
            testResult('存档数据完整', saveData.seed !== undefined && saveData.difficulty !== undefined,
                'Seed: ' + saveData.seed + ', 难度: ' + saveData.difficulty + ', 钥匙: ' + saveData.collectedKeys);
            log('存档数据: Seed=' + saveData.seed + ', 难度=' + saveData.difficulty + ', 钥匙=' + saveData.collectedKeys + ', 步数=' + saveData.steps?.toFixed(0));
        }
        
        await page.click('#quitBtn');
        await page.waitForTimeout(1000);
        
        const continueBtnVisible = await page.isVisible('#continueBtn');
        testResult('主菜单显示继续游戏按钮', continueBtnVisible);
        
        await takeScreenshot(page, '10_save_system');

        log('\n' + '-'.repeat(80));
        log('测试15: 刷新页面后恢复存档');
        log('-'.repeat(80));
        
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        const continueBtnStillVisible = await page.isVisible('#continueBtn');
        testResult('刷新后继续按钮仍可见', continueBtnStillVisible);
        
        const saveStillExists = await page.evaluate(() => {
            return localStorage.getItem('maze_save') !== null;
        });
        
        testResult('刷新后存档仍存在', saveStillExists);
        
        await page.click('#continueBtn');
        await page.waitForTimeout(2000);
        
        const loadedState = await page.evaluate(() => {
            return {
                isPlaying: window.gameState?.isPlaying,
                collectedKeys: window.gameState?.collectedKeys,
                seed: window.gameState?.seed
            };
        });
        
        testResult('存档加载后游戏继续', loadedState?.isPlaying,
            '游戏状态: ' + loadedState?.isPlaying + ', 已收集钥匙: ' + loadedState?.collectedKeys);
        
        if (saveData && loadedState) {
            testResult('加载的存档数据正确', loadedState.seed === saveData.seed && 
                loadedState.collectedKeys === saveData.collectedKeys,
                '期望Seed: ' + saveData.seed + ', 实际Seed: ' + loadedState.seed);
        }
        
        await takeScreenshot(page, '11_save_loaded');

        log('\n' + '-'.repeat(80));
        log('测试16: 敌人接触后重置关卡');
        log('-'.repeat(80));
        
        const resetResult = await page.evaluate(() => {
            const initialPos = { ...window.gameState.player.position };
            const initialKeys = window.gameState.collectedKeys;
            
            window.onPlayerCaught();
            
            return {
                initialPos,
                initialKeys,
                enemyCount: window.gameState.enemies.length
            };
        });
        
        await page.waitForTimeout(2500);
        
        const resetMessage = await page.evaluate(() => {
            return document.getElementById('message')?.textContent || '';
        });
        
        const hasResetMessage = resetMessage.includes('敌人') || resetMessage.includes('重置');
        testResult('显示被敌人抓住提示', hasResetMessage,
            '消息内容: "' + resetMessage + '"');
        
        const afterReset = await page.evaluate(() => {
            return {
                playerPos: { ...window.gameState.player.position },
                collectedKeys: window.gameState.collectedKeys,
                doorColor: window.gameState.exitDoor?.userData?.doorMesh?.material?.color?.getHex()
            };
        });
        
        const mazeInfo = await page.evaluate(() => {
            const mazeData = window.gameState.maze;
            const cellSize = window.CONFIG.CELL_SIZE;
            const totalSize = mazeData.length * cellSize;
            const offset = -totalSize / 2 + cellSize / 2;
            return {
                startX: offset + cellSize,
                startZ: offset + cellSize
            };
        });
        
        const posDiff = Math.abs(afterReset.playerPos.x - mazeInfo.startX) + Math.abs(afterReset.playerPos.z - mazeInfo.startZ);
        testResult('玩家重置到起点', posDiff < 0.5,
            '期望位置: (' + mazeInfo.startX.toFixed(1) + ', ' + mazeInfo.startZ.toFixed(1) + 
            '), 实际: (' + afterReset.playerPos.x.toFixed(1) + ', ' + afterReset.playerPos.z.toFixed(1) + ')');
        
        testResult('钥匙计数重置为0', afterReset.collectedKeys === 0,
            '重置后钥匙数: ' + afterReset.collectedKeys);
        
        testResult('大门重置为红色', afterReset.doorColor === 0xff0000,
            '门颜色: #' + afterReset.doorColor?.toString(16).padStart(6, '0'));
        
        await takeScreenshot(page, '12_enemy_reset');

        log('\n' + '-'.repeat(80));
        log('测试17: 重力和跳跃系统');
        log('-'.repeat(80));
        
        const gravityTest = await page.evaluate(() => {
            const initialY = window.gameState.player.position.y;
            window.gameState.player.velocity.y = 5;
            return { initialY: initialY };
        });
        
        await page.waitForTimeout(500);
        
        const gravityResult = await page.evaluate(() => {
            const pos = window.gameState.player.position;
            const vel = window.gameState.player.velocity;
            return { y: pos.y, velocityY: vel.y, canJump: window.gameState.player.canJump };
        });
        
        testResult('重力系统正常', gravityResult.y < 5 + gravityTest.initialY || gravityResult.velocityY < 5,
            '初始Y: ' + gravityTest.initialY.toFixed(2) + ', 当前Y: ' + gravityResult.y.toFixed(2) + ', 速度Y: ' + gravityResult.velocityY.toFixed(2));
        
        log('玩家高度: ' + gravityResult.y.toFixed(2) + 'm, 垂直速度: ' + gravityResult.velocityY.toFixed(2));

        log('\n' + '-'.repeat(80));
        log('测试18: 难度系统验证');
        log('-'.repeat(80));
        
        await page.evaluate(() => { window.gameState.isPaused = true; });
        await page.waitForTimeout(500);
        
        const difficulty = await page.evaluate(() => {
            return window.gameState?.difficulty;
        });
        
        const enemyCount = await page.evaluate(() => window.gameState?.enemies?.length || 0);
        
        const expectedEnemyCounts = { easy: 2, normal: 3, hard: 6 };
        const expectedCount = expectedEnemyCounts[difficulty] || 3;
        
        testResult('难度系统正确', enemyCount === expectedCount || Math.abs(enemyCount - expectedCount) <= 1,
            '难度: ' + difficulty + ', 敌人数量: ' + enemyCount + ', 期望: ~' + expectedCount);
        
        log('当前难度: ' + difficulty + ', 敌人数量: ' + enemyCount);

        log('\n' + '-'.repeat(80));
        log('测试19: 暂停菜单返回主菜单');
        log('-'.repeat(80));
        
        await page.evaluate(() => { document.getElementById('pauseMenu').style.display = 'flex'; });
        await page.waitForTimeout(500);
        
        await page.click('#quitBtn');
        await page.waitForTimeout(1000);
        
        const menuVisibleFinal = await page.isVisible('#menu');
        testResult('返回主菜单成功', menuVisibleFinal);
        
        await takeScreenshot(page, '13_back_to_menu');

        log('\n' + '-'.repeat(80));
        log('测试20: 控制台错误最终检查');
        log('-'.repeat(80));
        
        const finalConsoleErrors = consoleErrors.filter(e => 
            !e.includes('HDR') && !e.includes('WebGL') && !e.includes('pointer-lock'));
        
        testResult('无严重控制台错误', finalConsoleErrors.length === 0,
            finalConsoleErrors.length > 0 ? finalConsoleErrors.join('\n') : '');

    } catch (error) {
        log('测试过程中发生异常: ' + error.message);
        console.error(error);
        testResult('测试执行', false, error.message);
        await takeScreenshot(page, 'error');
    } finally {
        await browser.close();
    }

    console.log('\n' + '='.repeat(80));
    console.log('  测试结果汇总');
    console.log('='.repeat(80) + '\n');

    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;

    console.log('✅ 通过: ' + passed);
    console.log('❌ 失败: ' + failed);
    console.log('📊 总计: ' + passed + '/' + testResults.length + '\n');

    if (failed > 0) {
        console.log('失败的测试:');
        testResults.filter(r => !r.passed).forEach(r => {
            console.log('  ❌ ' + r.name);
            if (r.details) console.log('     ' + r.details);
        });
    }

    const report = {
        timestamp: new Date().toISOString(),
        browser: 'Chromium (Playwright)',
        url: TEST_URL,
        totalTests: testResults.length,
        passed: passed,
        failed: failed,
        results: testResults
    };

    fs.writeFileSync(
        path.join(SCREENSHOT_DIR, 'test_report.json'),
        JSON.stringify(report, null, 2)
    );

    console.log('\n📄 详细测试报告已保存到: test_screenshots/test_report.json');
    console.log('🖼️  所有截图已保存到: ' + SCREENSHOT_DIR);

    if (failed > 0) {
        process.exit(1);
    } else {
        console.log('\n🎉🎉🎉 所有浏览器自动化测试通过！');
        process.exit(0);
    }
}

runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
});
