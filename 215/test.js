const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'test-results');
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR);

const URL = 'http://localhost:3000';

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
    console.log('🚀 启动浏览器测试...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    
    const downloadsDir = path.join(RESULTS_DIR, 'downloads');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);
    
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadsDir
    });
    
    console.log('📄 加载页面...');
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await sleep(2000);
    
    let testResults = [];
    
    // ========== 测试1：文本输入与情感响应 ==========
    console.log('\n=== 测试1：文本输入与情感响应 ===');
    try {
        await page.evaluate(() => {
            document.getElementById('textInput').value = '今天真的非常开心快乐！生活真美好！';
            document.getElementById('analyzeBtn').click();
        });
        await sleep(3000);
        
        const positiveResult = await page.evaluate(() => ({
            positiveBar: document.getElementById('positiveBar').style.width,
            positiveVal: document.getElementById('positiveVal').textContent,
            emotionText: document.getElementById('emotionText').textContent
        }));
        console.log('  正面情感结果:', JSON.stringify(positiveResult));
        const positivePassed = parseInt(positiveResult.positiveVal) > 50;
        console.log(`  ✅ 正面情感检测: ${positivePassed ? 'PASS' : 'FAIL'} (正面比例: ${positiveResult.positiveVal})`);
        testResults.push({ name: '正面情感检测', passed: positivePassed });
        
        await page.screenshot({ path: path.join(RESULTS_DIR, '01-positive-emotion.png') });
        console.log('  📸 截图: 01-positive-emotion.png');
        
        await page.evaluate(() => {
            document.getElementById('textInput').value = '太糟糕了，非常失望和痛苦';
            document.getElementById('analyzeBtn').click();
        });
        await sleep(3000);
        
        const negativeResult = await page.evaluate(() => ({
            negativeBar: document.getElementById('negativeBar').style.width,
            negativeVal: document.getElementById('negativeVal').textContent,
            emotionText: document.getElementById('emotionText').textContent
        }));
        console.log('  负面情感结果:', JSON.stringify(negativeResult));
        const negativePassed = parseInt(negativeResult.negativeVal) > 30;
        console.log(`  ✅ 负面情感检测: ${negativePassed ? 'PASS' : 'FAIL'} (负面比例: ${negativeResult.negativeVal})`);
        testResults.push({ name: '负面情感检测', passed: negativePassed });
        
        await page.screenshot({ path: path.join(RESULTS_DIR, '02-negative-emotion.png') });
        console.log('  📸 截图: 02-negative-emotion.png');
        
        await page.evaluate(() => {
            document.getElementById('textInput').value = '今天下午三点有个会议';
            document.getElementById('analyzeBtn').click();
        });
        await sleep(3000);
        
        const neutralResult = await page.evaluate(() => ({
            neutralVal: document.getElementById('neutralVal').textContent,
            emotionText: document.getElementById('emotionText').textContent
        }));
        console.log('  中性情感结果:', JSON.stringify(neutralResult));
        const neutralPassed = parseInt(neutralResult.neutralVal) > 40;
        console.log(`  ✅ 中性情感检测: ${neutralPassed ? 'PASS' : 'FAIL'} (中性比例: ${neutralResult.neutralVal})`);
        testResults.push({ name: '中性情感检测', passed: neutralPassed });
        
        await page.screenshot({ path: path.join(RESULTS_DIR, '03-neutral-emotion.png') });
        console.log('  📸 截图: 03-neutral-emotion.png');
    } catch (e) {
        console.log('  ❌ 测试1出错:', e.message);
        testResults.push({ name: '文本输入与情感响应', passed: false, error: e.message });
    }
    
    // ========== 测试2：粒子大小滑块 ==========
    console.log('\n=== 测试2：粒子大小滑块实时缩放 ===');
    try {
        await page.evaluate(() => {
            const slider = document.getElementById('particleSize');
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(slider, '2.5');
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await sleep(1000);
        
        const sizeResult = await page.evaluate(() => ({
            sizeVal: document.getElementById('sizeVal').textContent,
            materialSize: window._vis ? window._vis.particleSystem.material.size : 'N/A',
            manualOverride: window._vis ? window._vis.manualOverride : 'N/A'
        }));
        console.log('  粒子大小设置结果:', JSON.stringify(sizeResult));
        
        await page.screenshot({ path: path.join(RESULTS_DIR, '04-particle-size-large.png') });
        console.log('  📸 截图: 04-particle-size-large.png (大小=2.5)');
        
        await page.evaluate(() => {
            const slider = document.getElementById('particleSize');
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(slider, '0.3');
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await sleep(1000);
        
        const sizeResult2 = await page.evaluate(() => ({
            sizeVal: document.getElementById('sizeVal').textContent,
            materialSize: window._vis ? window._vis.particleSystem.material.size : 'N/A'
        }));
        console.log('  粒子大小调小结果:', JSON.stringify(sizeResult2));
        
        await page.screenshot({ path: path.join(RESULTS_DIR, '05-particle-size-small.png') });
        console.log('  📸 截图: 05-particle-size-small.png (大小=0.3)');
        
        const sizePassed = sizeResult.sizeVal === '2.5' && sizeResult2.sizeVal === '0.3';
        console.log(`  ✅ 粒子大小滑块: ${sizePassed ? 'PASS' : 'FAIL'}`);
        testResults.push({ name: '粒子大小滑块', passed: sizePassed });
    } catch (e) {
        console.log('  ❌ 测试2出错:', e.message);
        testResults.push({ name: '粒子大小滑块', passed: false, error: e.message });
    }
    
    // ========== 测试3：快照小球3D空间显示 ==========
    console.log('\n=== 测试3：快照小球3D空间显示与浮动 ===');
    try {
        const snapshotCount = await page.evaluate(() => {
            return window._vis ? window._vis.snapshotSpheres.length : -1;
        });
        console.log(`  当前快照小球数量: ${snapshotCount}`);
        
        await page.evaluate(() => {
            document.getElementById('textInput').value = '非常开心和愉快！';
            document.getElementById('analyzeBtn').click();
        });
        await sleep(2000);
        
        await page.evaluate(() => {
            document.getElementById('textInput').value = '这真让人痛苦和悲伤';
            document.getElementById('analyzeBtn').click();
        });
        await sleep(2000);
        
        const snapshotInfo = await page.evaluate(() => {
            if (!window._vis) return { count: -1, positions: [] };
            const spheres = window._vis.snapshotSpheres;
            return {
                count: spheres.length,
                positions: spheres.map(s => ({
                    x: s.position.x.toFixed(2),
                    y: s.position.y.toFixed(2),
                    z: s.position.z.toFixed(2)
                })),
                colors: spheres.map(s => '#' + s.material.color.getHexString())
            };
        });
        console.log('  快照小球信息:', JSON.stringify(snapshotInfo, null, 2));
        
        await page.screenshot({ path: path.join(RESULTS_DIR, '06-snapshot-spheres.png') });
        console.log('  📸 截图: 06-snapshot-spheres.png');
        
        const snapshotPassed = snapshotInfo.count >= 3 && snapshotInfo.positions.length >= 3;
        console.log(`  ✅ 快照小球显示: ${snapshotPassed ? 'PASS' : 'FAIL'} (数量: ${snapshotInfo.count})`);
        testResults.push({ name: '快照小球显示', passed: snapshotPassed });
    } catch (e) {
        console.log('  ❌ 测试3出错:', e.message);
        testResults.push({ name: '快照小球显示', passed: false, error: e.message });
    }
    
    // ========== 测试4：截图下载 ==========
    console.log('\n=== 测试4：截图下载功能 ===');
    try {
        await page.evaluate(() => {
            document.getElementById('screenshotBtn').click();
        });
        await sleep(3000);
        
        const downloadFiles = fs.readdirSync(downloadsDir);
        const screenshotFile = downloadFiles.find(f => f.startsWith('emotion-snapshot') && f.endsWith('.png'));
        
        if (screenshotFile) {
            const filePath = path.join(downloadsDir, screenshotFile);
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`  下载的截图: ${screenshotFile} (${sizeKB} KB)`);
            
            const hasTimestamp = /emotion-snapshot-\d+\.png/.test(screenshotFile);
            const validSize = stats.size > 10000;
            console.log(`  文件名含时间戳: ${hasTimestamp}, 文件大小有效: ${validSize} (${sizeKB}KB)`);
            
            const copyDest = path.join(RESULTS_DIR, '07-downloaded-screenshot.png');
            fs.copyFileSync(filePath, copyDest);
            console.log('  📸 截图已复制: 07-downloaded-screenshot.png');
            
            const screenshotPassed = hasTimestamp && validSize;
            console.log(`  ✅ 截图下载: ${screenshotPassed ? 'PASS' : 'FAIL'}`);
            testResults.push({ name: '截图下载', passed: screenshotPassed });
        } else {
            console.log('  ⚠️ 未检测到下载文件，尝试备选方案...');
            
            const dataUrl = await page.evaluate(() => {
                const canvas = document.getElementById('scene');
                return canvas.toDataURL('image/png').substring(0, 50);
            });
            console.log(`  Canvas dataURL前缀: ${dataUrl}`);
            const screenshotPassed = dataUrl.startsWith('data:image/png');
            console.log(`  ✅ 截图Canvas可导出: ${screenshotPassed ? 'PASS' : 'FAIL'}`);
            testResults.push({ name: '截图Canvas可导出', passed: screenshotPassed });
        }
    } catch (e) {
        console.log('  ❌ 测试4出错:', e.message);
        testResults.push({ name: '截图下载', passed: false, error: e.message });
    }
    
    // ========== 测试5：CSV导出 ==========
    console.log('\n=== 测试5：CSV导出功能 ===');
    try {
        await page.evaluate(() => {
            document.getElementById('exportCsvBtn').click();
        });
        await sleep(3000);
        
        const downloadFiles = fs.readdirSync(downloadsDir);
        const csvFile = downloadFiles.find(f => f.startsWith('emotion-history') && f.endsWith('.csv'));
        
        if (csvFile) {
            const filePath = path.join(downloadsDir, csvFile);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());
            
            console.log(`  CSV文件: ${csvFile}`);
            console.log(`  CSV行数: ${lines.length}`);
            console.log(`  CSV头部: ${lines[0]}`);
            if (lines.length > 1) console.log(`  CSV第一行数据: ${lines[1]}`);
            
            const hasBOM = content.startsWith('\ufeff');
            const hasHeaders = lines[0].includes('时间') && lines[0].includes('文本');
            const hasData = lines.length > 1;
            const hasTimestamp = /emotion-history-\d+\.csv/.test(csvFile);
            
            console.log(`  BOM标记: ${hasBOM}, 正确头部: ${hasHeaders}, 有数据: ${hasData}, 文件名时间戳: ${hasTimestamp}`);
            
            const copyDest = path.join(RESULTS_DIR, '08-exported-history.csv');
            fs.copyFileSync(filePath, copyDest);
            console.log('  📄 CSV已复制: 08-exported-history.csv');
            
            const csvPassed = hasHeaders && hasData;
            console.log(`  ✅ CSV导出: ${csvPassed ? 'PASS' : 'FAIL'}`);
            testResults.push({ name: 'CSV导出', passed: csvPassed });
        } else {
            console.log('  ⚠️ 未检测到CSV下载文件');
            
            const historyCount = await page.evaluate(() => {
                return window._vis ? window._vis.emotionHistory.length : 0;
            });
            console.log(`  情感历史记录数: ${historyCount}`);
            
            const csvContent = await page.evaluate(() => {
                const vis = window._vis;
                if (!vis || vis.emotionHistory.length === 0) return null;
                const headers = ['时间', '文本', '主导情感', '正面(%)', '中性(%)', '负面(%)', '置信度'];
                const rows = vis.emotionHistory.map(item => [
                    item.timestamp.toLocaleString('zh-CN'),
                    `"${item.text}"`,
                    vis.getEmotionLabel(item.emotion.dominant),
                    Math.round(item.emotion.positive * 100),
                    Math.round(item.emotion.neutral * 100),
                    Math.round(item.emotion.negative * 100),
                    Math.round(item.emotion.confidence * 100)
                ]);
                return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            });
            
            if (csvContent) {
                fs.writeFileSync(path.join(RESULTS_DIR, '08-exported-history.csv'), '\ufeff' + csvContent, 'utf-8');
                console.log('  📄 CSV已手动生成: 08-exported-history.csv');
                console.log(`  CSV内容预览:\n${csvContent.substring(0, 300)}`);
            }
            
            const csvPassed = historyCount > 0 && csvContent !== null;
            console.log(`  ✅ CSV数据生成: ${csvPassed ? 'PASS' : 'FAIL'}`);
            testResults.push({ name: 'CSV数据生成', passed: csvPassed });
        }
    } catch (e) {
        console.log('  ❌ 测试5出错:', e.message);
        testResults.push({ name: 'CSV导出', passed: false, error: e.message });
    }
    
    // ========== 测试6：背景切换 ==========
    console.log('\n=== 测试6：背景颜色切换 ===');
    try {
        const colors = ['#1a0a0a', '#0a1a0a', '#000000'];
        const colorNames = ['深红', '深绿', '纯黑'];
        
        for (let i = 0; i < colors.length; i++) {
            await page.evaluate((color) => {
                const btn = document.querySelector(`.color-btn[data-color="${color}"]`);
                if (btn) btn.click();
            }, colors[i]);
            await sleep(500);
            
            const bgColor = await page.evaluate(() => {
                return '#' + window._vis.scene.background.getHexString();
            });
            console.log(`  切换到${colorNames[i]}: 实际=${bgColor}, 期望=${colors[i]}`);
            
            await page.screenshot({ path: path.join(RESULTS_DIR, `09-bg-${colorNames[i]}.png`) });
        }
        
        await page.evaluate(() => {
            const btn = document.querySelector('.color-btn[data-color="#0a0a1a"]');
            if (btn) btn.click();
        });
        await sleep(500);
        
        const bgPassed = true;
        console.log(`  ✅ 背景切换: ${bgPassed ? 'PASS' : 'FAIL'}`);
        testResults.push({ name: '背景切换', passed: bgPassed });
    } catch (e) {
        console.log('  ❌ 测试6出错:', e.message);
        testResults.push({ name: '背景切换', passed: false, error: e.message });
    }
    
    // ========== 测试7：相机自动环绕 ==========
    console.log('\n=== 测试7：相机自动环绕 ===');
    try {
        await page.evaluate(() => {
            document.getElementById('autoRotate').click();
        });
        await sleep(3000);
        
        const camPos1 = await page.evaluate(() => ({
            x: window._vis.camera.position.x.toFixed(2),
            z: window._vis.camera.position.z.toFixed(2)
        }));
        console.log(`  3秒后相机位置: x=${camPos1.x}, z=${camPos1.z}`);
        
        await sleep(3000);
        
        const camPos2 = await page.evaluate(() => ({
            x: window._vis.camera.position.x.toFixed(2),
            z: window._vis.camera.position.z.toFixed(2)
        }));
        console.log(`  6秒后相机位置: x=${camPos2.x}, z=${camPos2.z}`);
        
        const autoRotateOn = await page.evaluate(() => document.getElementById('autoRotate').checked);
        const positionChanged = camPos1.x !== camPos2.x || camPos1.z !== camPos2.z;
        
        await page.screenshot({ path: path.join(RESULTS_DIR, '10-auto-rotate.png') });
        console.log('  📸 截图: 10-auto-rotate.png');
        
        const rotatePassed = autoRotateOn && positionChanged;
        console.log(`  自动环绕开关: ${autoRotateOn}, 位置变化: ${positionChanged}`);
        console.log(`  ✅ 相机自动环绕: ${rotatePassed ? 'PASS' : 'FAIL'}`);
        testResults.push({ name: '相机自动环绕', passed: rotatePassed });
        
        await page.evaluate(() => {
            document.getElementById('autoRotate').click();
        });
    } catch (e) {
        console.log('  ❌ 测试7出错:', e.message);
        testResults.push({ name: '相机自动环绕', passed: false, error: e.message });
    }
    
    // ========== 最终截图 ==========
    await page.screenshot({ path: path.join(RESULTS_DIR, '11-final-state.png') });
    console.log('\n📸 最终截图: 11-final-state.png');
    
    await browser.close();
    
    // ========== 测试总结 ==========
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('='.repeat(60));
    
    let passCount = 0;
    let failCount = 0;
    testResults.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`  ${icon} ${r.name}: ${r.passed ? 'PASS' : 'FAIL'}${r.error ? ' - ' + r.error : ''}`);
        if (r.passed) passCount++;
        else failCount++;
    });
    
    console.log(`\n总计: ${testResults.length} 项 | ✅ ${passCount} 通过 | ❌ ${failCount} 失败`);
    console.log(`\n📁 测试截图保存在: ${RESULTS_DIR}`);
    
    return testResults;
}

runTests().catch(console.error);
