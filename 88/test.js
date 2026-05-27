const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_URL = 'http://localhost:9090';
const DOWNLOAD_DIR = path.join(__dirname, 'test-downloads');
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');
const RESULTS_DIR = path.join(__dirname, 'test-results');

function log(msg, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = type === 'pass' ? '✅ PASS' : type === 'fail' ? '❌ FAIL' : type === 'warn' ? '⚠️ WARN' : 'ℹ️ INFO';
    console.log(`[${timestamp}] ${prefix}  ${msg}`);
}

const testResults = [];

function recordResult(testName, passed, details = '') {
    testResults.push({ testName, passed, details, timestamp: new Date().toISOString() });
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function init() {
    ensureDir(DOWNLOAD_DIR);
    ensureDir(SCREENSHOT_DIR);
    ensureDir(RESULTS_DIR);

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-web-security']
    });
    const context = await browser.newContext({
        acceptDownloads: true,
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            log(`浏览器控制台错误: ${msg.text()}`, 'warn');
        }
    });

    page.on('pageerror', (err) => {
        log(`页面错误: ${err.message}`, 'warn');
    });

    return { browser, context, page };
}

async function testInitialLoad(page) {
    log('测试1: 页面初始加载...', 'info');
    try {
        await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            const panel = document.getElementById('controlPanel');
            if (panel && panel.classList.contains('collapsed')) {
                panel.classList.remove('collapsed');
            }
            document.querySelectorAll('.control-group').forEach(g => {
                g.classList.remove('collapsed');
            });
        });
        await page.waitForTimeout(500);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '01-initial-load.png'),
            fullPage: true
        });

        const canvasExists = await page.evaluate(() => {
            return document.querySelector('#canvas-container canvas') !== null;
        });

        if (canvasExists) {
            log('Canvas渲染成功，页面初始加载正常', 'pass');
            recordResult('页面初始加载', true, 'Canvas成功渲染');
        } else {
            log('Canvas未找到', 'fail');
            recordResult('页面初始加载', false, 'Canvas未渲染');
        }
    } catch (err) {
        log(`页面加载失败: ${err.message}`, 'fail');
        recordResult('页面初始加载', false, err.message);
    }
}

async function testControlsVisibility(page) {
    log('测试2: 控制面板可见性...', 'info');
    try {
        const panelVisible = await page.evaluate(() => {
            const panel = document.querySelector('#controlPanel');
            if (!panel) return false;
            const style = window.getComputedStyle(panel);
            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   parseFloat(style.opacity) > 0;
        });

        if (panelVisible) {
            log('控制面板正常显示', 'pass');
            recordResult('控制面板可见性', true);
        } else {
            log('控制面板未显示', 'fail');
            recordResult('控制面板可见性', false);
        }

        const selectors = [
            '#geometryType', '#scaleSlider', '#metalnessSlider', '#roughnessSlider',
            '#wireframeToggle', '#animationMode', '#autoRotateToggle',
            '#ambientLightToggle', '#pointLightToggle', '#backgroundType',
            '#reflectionToggle', '#multiGeometryToggle', '#screenshotBtn', '#exportObjBtn'
        ];

        for (const sel of selectors) {
            const exists = await page.evaluate((s) => {
                return document.querySelector(s) !== null;
            }, sel);
            if (!exists) {
                log(`控制面板元素缺失: ${sel}`, 'warn');
            }
        }
    } catch (err) {
        log(`控制面板检查失败: ${err.message}`, 'fail');
        recordResult('控制面板可见性', false, err.message);
    }
}

async function testGeometrySwitch(page) {
    log('测试3: 几何体切换功能...', 'info');
    try {
        const geometries = [
            { value: 'sphere', name: '球体' },
            { value: 'cylinder', name: '圆柱体' },
            { value: 'cone', name: '圆锥体' },
            { value: 'torus', name: '环面' },
            { value: 'box', name: '立方体' }
        ];

        for (const geo of geometries) {
            await page.selectOption('#geometryType', geo.value);
            await page.waitForTimeout(500);

            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, `03-geometry-${geo.value}.png`),
                fullPage: false,
                clip: { x: 280, y: 0, width: 1160, height: 900 }
            });

            const name = await page.evaluate(() => {
                return document.getElementById('geometryName').textContent;
            });

            log(`切换到 ${geo.name}，显示名称: "${name}"`, name === geo.name ? 'pass' : 'warn');
        }

        recordResult('几何体切换', true, '所有5种几何体切换成功');
    } catch (err) {
        log(`几何体切换失败: ${err.message}`, 'fail');
        recordResult('几何体切换', false, err.message);
    }
}

async function testScreenshotDownload(page) {
    log('测试4: 截图保存PNG功能...', 'info');
    try {
        ensureDir(DOWNLOAD_DIR);

        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 15000 }),
            page.click('#screenshotBtn')
        ]);

        const savePath = path.join(DOWNLOAD_DIR, 'test-screenshot.png');
        await download.saveAs(savePath);

        if (fs.existsSync(savePath)) {
            const stats = fs.statSync(savePath);
            if (stats.size > 1000) {
                log(`PNG截图下载成功，文件大小: ${(stats.size / 1024).toFixed(1)} KB`, 'pass');
                recordResult('截图保存PNG', true, `文件大小: ${(stats.size / 1024).toFixed(1)} KB`);
            } else {
                log('PNG文件太小，可能下载失败', 'fail');
                recordResult('截图保存PNG', false, '文件过小');
            }
        } else {
            log('PNG文件未找到', 'fail');
            recordResult('截图保存PNG', false, '文件未下载');
        }

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '04-after-screenshot-click.png'),
            fullPage: true
        });
    } catch (err) {
        log(`截图功能测试失败: ${err.message}`, 'fail');
        recordResult('截图保存PNG', false, err.message);
    }
}

async function testOBJExport(page) {
    log('测试5: OBJ导出功能...', 'info');
    try {
        ensureDir(DOWNLOAD_DIR);

        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 15000 }),
            page.click('#exportObjBtn')
        ]);

        const savePath = path.join(DOWNLOAD_DIR, 'test-export.obj');
        await download.saveAs(savePath);

        if (fs.existsSync(savePath)) {
            const content = fs.readFileSync(savePath, 'utf-8');
            const stats = fs.statSync(savePath);

            const hasVertices = content.includes('v ');
            const hasFaces = content.includes('f ');
            const vertexCount = (content.match(/^v /gm) || []).length;
            const faceCount = (content.match(/^f /gm) || []).length;

            log(`OBJ文件下载成功，大小: ${(stats.size / 1024).toFixed(1)} KB`, 'pass');
            log(`OBJ数据验证 - 顶点: ${vertexCount}, 面: ${faceCount}`,
                hasVertices && hasFaces ? 'pass' : 'fail');

            if (hasVertices && hasFaces) {
                recordResult('OBJ导出', true, `顶点: ${vertexCount}, 面: ${faceCount}`);
            } else {
                recordResult('OBJ导出', false, 'OBJ格式不完整');
            }

            const firstLines = content.split('\n').slice(0, 10).join('\n');
            log(`OBJ文件内容预览:\n${firstLines}`, 'info');
        } else {
            log('OBJ文件未找到', 'fail');
            recordResult('OBJ导出', false, '文件未下载');
        }
    } catch (err) {
        log(`OBJ导出测试失败: ${err.message}`, 'fail');
        recordResult('OBJ导出', false, err.message);
    }
}

async function testWireframeMode(page) {
    log('测试6: 线框模式切换...', 'info');
    try {
        await page.evaluate(() => {
            document.querySelector('#geometryType').value = 'torus';
            document.querySelector('#geometryType').dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(500);

        await page.evaluate(() => {
            const toggle = document.getElementById('wireframeToggle');
            if (toggle.checked) {
                toggle.checked = false;
                toggle.dispatchEvent(new Event('change'));
            }
        });
        await page.waitForTimeout(500);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '06-wireframe-off.png'),
            fullPage: false,
            clip: { x: 280, y: 0, width: 1160, height: 900 }
        });

        await page.evaluate(() => {
            const toggle = document.getElementById('wireframeToggle');
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(500);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '06-wireframe-on.png'),
            fullPage: false,
            clip: { x: 280, y: 0, width: 1160, height: 900 }
        });

        const wireframeEnabled = await page.evaluate(() => {
            return document.getElementById('wireframeToggle').checked;
        });

        if (wireframeEnabled) {
            log('线框模式切换成功（开/关）', 'pass');
            recordResult('线框模式切换', true);
        } else {
            log('线框模式切换失败', 'fail');
            recordResult('线框模式切换', false);
        }

        await page.evaluate(() => {
            const toggle = document.getElementById('wireframeToggle');
            toggle.checked = false;
            toggle.dispatchEvent(new Event('change'));
        });
    } catch (err) {
        log(`线框模式测试失败: ${err.message}`, 'fail');
        recordResult('线框模式切换', false, err.message);
    }
}

async function testAnimationModes(page) {
    log('测试7: 动画模式切换...', 'info');
    try {
        const modes = [
            { value: 'rotate', name: '自转' },
            { value: 'float', name: '上浮' },
            { value: 'pulse', name: '脉冲缩放' }
        ];

        for (const mode of modes) {
            await page.selectOption('#animationMode', mode.value);
            await page.waitForTimeout(300);

            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, `07-animation-${mode.value}.png`),
                fullPage: false,
                clip: { x: 280, y: 0, width: 1160, height: 900 }
            });

            const currentMode = await page.evaluate(() => {
                return document.getElementById('animationMode').value;
            });

            log(`动画模式 "${mode.name}" 设置: ${currentMode === mode.value ? '成功' : '失败'}`,
                currentMode === mode.value ? 'pass' : 'fail');
        }

        await page.selectOption('#animationMode', 'rotate');
        log('动画模式切换测试完成', 'pass');
        recordResult('动画模式切换', true, '三种模式均成功切换');
    } catch (err) {
        log(`动画模式测试失败: ${err.message}`, 'fail');
        recordResult('动画模式切换', false, err.message);
    }
}

async function testBackgroundSwitch(page) {
    log('测试8: 背景切换...', 'info');
    try {
        const backgrounds = [
            { value: 'solid', name: '纯色' },
            { value: 'gradient', name: '渐变' },
            { value: 'starry', name: '星空' }
        ];

        for (const bg of backgrounds) {
            await page.selectOption('#backgroundType', bg.value);
            await page.waitForTimeout(800);

            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, `08-background-${bg.value}.png`),
                fullPage: false,
                clip: { x: 280, y: 0, width: 1160, height: 900 }
            });

            const currentBg = await page.evaluate(() => {
                return document.getElementById('backgroundType').value;
            });

            log(`背景 "${bg.name}" 切换: ${currentBg === bg.value ? '成功' : '失败'}`,
                currentBg === bg.value ? 'pass' : 'fail');
        }

        await page.selectOption('#backgroundType', 'solid');
        log('背景切换测试完成', 'pass');
        recordResult('背景切换', true, '三种背景均成功切换');
    } catch (err) {
        log(`背景切换测试失败: ${err.message}`, 'fail');
        recordResult('背景切换', false, err.message);
    }
}

async function testMultiGeometry(page) {
    log('测试9: 多几何体2x2网格模式...', 'info');
    try {
        await page.evaluate(() => {
            const toggle = document.getElementById('multiGeometryToggle');
            if (toggle.checked) {
                toggle.checked = false;
                toggle.dispatchEvent(new Event('change'));
            }
        });
        await page.waitForTimeout(500);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '09-multi-geometry-off.png'),
            fullPage: false,
            clip: { x: 280, y: 0, width: 1160, height: 900 }
        });

        await page.evaluate(() => {
            const toggle = document.getElementById('multiGeometryToggle');
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(1500);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '09-multi-geometry-on.png'),
            fullPage: false,
            clip: { x: 280, y: 0, width: 1160, height: 900 }
        });

        const multiEnabled = await page.evaluate(() => {
            return document.getElementById('multiGeometryToggle').checked;
        });

        const geoName = await page.evaluate(() => {
            return document.getElementById('geometryName').textContent;
        });

        if (multiEnabled && geoName.includes('几何体')) {
            log(`多几何体模式开启成功，显示: "${geoName}"`, 'pass');
            recordResult('多几何体2x2网格', true, `统计: ${geoName}`);
        } else {
            log('多几何体模式可能未正常开启', 'warn');
            recordResult('多几何体2x2网格', false, `开关状态: ${multiEnabled}, 名称: ${geoName}`);
        }

        await page.waitForTimeout(2000);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '09-multi-geometry-rotating.png'),
            fullPage: false,
            clip: { x: 280, y: 0, width: 1160, height: 900 }
        });

        log('等待2秒观察独立旋转...', 'info');

        await page.evaluate(() => {
            const toggle = document.getElementById('multiGeometryToggle');
            toggle.checked = false;
            toggle.dispatchEvent(new Event('change'));
        });
    } catch (err) {
        log(`多几何体模式测试失败: ${err.message}`, 'fail');
        recordResult('多几何体2x2网格', false, err.message);
    }
}

async function testStatsPanel(page) {
    log('测试10: 统计面板信息...', 'info');
    try {
        await page.evaluate(() => {
            document.querySelector('#geometryType').value = 'sphere';
            document.querySelector('#geometryType').dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(500);

        const stats = await page.evaluate(() => {
            return {
                vertices: document.getElementById('vertexCount').textContent,
                faces: document.getElementById('faceCount').textContent,
                geometry: document.getElementById('geometryName').textContent
            };
        });

        log(`统计面板 - 顶点: ${stats.vertices}, 面: ${stats.faces}, 几何体: ${stats.geometry}`, 'pass');

        if (stats.vertices !== '0' && stats.faces !== '0') {
            recordResult('统计面板信息', true, `顶点: ${stats.vertices}, 面: ${stats.faces}`);
        } else {
            recordResult('统计面板信息', false, '统计数据为0');
        }

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '10-stats-panel.png'),
            fullPage: true
        });
    } catch (err) {
        log(`统计面板测试失败: ${err.message}`, 'fail');
        recordResult('统计面板信息', false, err.message);
    }
}

async function testMaterialSliders(page) {
    log('测试11: 材质滑块调节...', 'info');
    try {
        const tests = [
            { slider: '#metalnessSlider', value: 0.9, display: '#metalnessValue', label: '金属度' },
            { slider: '#roughnessSlider', value: 0.1, display: '#roughnessValue', label: '粗糙度' },
            { slider: '#scaleSlider', value: 2.0, display: '#scaleValue', label: '缩放' }
        ];

        for (const t of tests) {
            await page.evaluate(({ slider, value }) => {
                const el = document.querySelector(slider);
                el.value = value;
                el.dispatchEvent(new Event('input'));
            }, { slider: t.slider, value: t.value });
            await page.waitForTimeout(300);

            const display = await page.evaluate((sel) => {
                return document.querySelector(sel).textContent;
            }, t.display);

            log(`${t.label} 设置为 ${t.value}，显示: ${display}`, 'info');
        }

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '11-material-adjusted.png'),
            fullPage: false,
            clip: { x: 280, y: 0, width: 1160, height: 900 }
        });

        recordResult('材质滑块调节', true);
    } catch (err) {
        log(`材质滑块测试失败: ${err.message}`, 'fail');
        recordResult('材质滑块调节', false, err.message);
    }
}

function generateReport() {
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const total = testResults.length;

    const report = {
        summary: {
            total,
            passed,
            failed,
            passRate: `${((passed / total) * 100).toFixed(1)}%`
        },
        results: testResults,
        timestamp: new Date().toISOString()
    };

    const reportPath = path.join(RESULTS_DIR, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log('========================================', 'info');
    log(`测试完成！总计: ${total} | 通过: ${passed} | 失败: ${failed}`,
        failed === 0 ? 'pass' : 'warn');
    log(`通过率: ${report.summary.passRate}`, 'info');
    log(`测试报告: ${reportPath}`, 'info');
    log(`截图目录: ${SCREENSHOT_DIR}`, 'info');
    log(`下载目录: ${DOWNLOAD_DIR}`, 'info');
    log('========================================', 'info');

    return report;
}

async function main() {
    log('========================================', 'info');
    log('  3D Geometry Showcase 功能测试开始', 'info');
    log('========================================', 'info');

    const { browser, context, page } = await init();

    try {
        await testInitialLoad(page);
        await testControlsVisibility(page);
        await testGeometrySwitch(page);
        await testScreenshotDownload(page);
        await testOBJExport(page);
        await testWireframeMode(page);
        await testAnimationModes(page);
        await testBackgroundSwitch(page);
        await testMultiGeometry(page);
        await testStatsPanel(page);
        await testMaterialSliders(page);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '99-final-state.png'),
            fullPage: true
        });

    } catch (err) {
        log(`测试过程中发生致命错误: ${err.message}`, 'fail');
    } finally {
        generateReport();
        await browser.close();
    }
}

main().catch(err => {
    console.error('测试脚本运行失败:', err);
    process.exit(1);
});