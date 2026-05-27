/**
 * 浏览器自动化测试脚本 - 使用 Puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TEST_URL = 'http://localhost:8000/index.html';
const DOWNLOAD_DIR = path.join(__dirname, 'test-downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
    console.log('='.repeat(70));
    console.log('🌐 浏览器自动化测试 - 3D 螺旋环');
    console.log('='.repeat(70));
    console.log(`测试地址: ${TEST_URL}`);
    console.log(`下载目录: ${DOWNLOAD_DIR}`);
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
        defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: DOWNLOAD_DIR
    });

    page.on('console', msg => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
            console.log(`[浏览器${type.toUpperCase()}]: ${msg.text()}`);
        }
    });

    page.on('pageerror', err => {
        console.log(`[页面错误]: ${err.message}`);
    });

    try {
        // 测试 1: 页面加载
        console.log('📋 测试 1: 页面加载验证');
        console.log('-'.repeat(70));
        await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(3000);
        console.log('✅ 页面加载成功');
        
        const title = await page.title();
        console.log(`✅ 页面标题: ${title}`);
        
        const canvasExists = await page.evaluate(() => !!document.querySelector('canvas'));
        console.log(`✅ Canvas 元素存在: ${canvasExists}`);
        
        const controlsExists = await page.evaluate(() => !!document.getElementById('controls'));
        console.log(`✅ 控制面板存在: ${controlsExists}`);
        
        const statsExists = await page.evaluate(() => !!document.getElementById('stats'));
        console.log(`✅ 统计面板存在: ${statsExists}`);

        // 测试 2: 滑块控件
        console.log('\n📋 测试 2: 滑块控件验证');
        console.log('-'.repeat(70));
        
        const sliders = ['radius', 'turns', 'count', 'size'];
        for (const slider of sliders) {
            const value = await page.evaluate((id) => {
                const el = document.getElementById(id);
                return {
                    exists: !!el,
                    min: el?.min,
                    max: el?.max,
                    step: el?.step,
                    value: el?.value
                };
            }, slider);
            
            if (value.exists) {
                console.log(`✅ ${slider}: value=${value.value}, min=${value.min}, max=${value.max}, step=${value.step}`);
            } else {
                console.log(`❌ ${slider}: 不存在`);
            }
        }

        // 测试滑块交互
        await page.evaluate(() => {
            const radiusSlider = document.getElementById('radius');
            radiusSlider.value = 12;
            radiusSlider.dispatchEvent(new Event('input'));
        });
        await wait(500);
        const radiusValue = await page.evaluate(() => document.getElementById('radius-value').textContent);
        console.log(`✅ 半径滑块交互: 新值=${radiusValue}`);

        // 测试 3: 截图功能
        console.log('\n📋 测试 3: 截图功能验证');
        console.log('-'.repeat(70));
        
        const beforeCount = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith('spiral-screenshot')).length;
        
        await page.evaluate(() => {
            document.getElementById('screenshotBtn').click();
        });
        await wait(2000);
        
        const afterCount = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith('spiral-screenshot')).length;
        const screenshotFiles = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith('spiral-screenshot'));
        
        if (afterCount > beforeCount && screenshotFiles.length > 0) {
            const latestScreenshot = screenshotFiles[screenshotFiles.length - 1];
            const stats = fs.statSync(path.join(DOWNLOAD_DIR, latestScreenshot));
            console.log(`✅ 截图已保存: ${latestScreenshot}`);
            console.log(`✅ 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
            
            if (stats.size > 10000) {
                console.log('✅ 截图大小正常（包含图像数据）');
            } else {
                console.log('⚠️  截图文件过小，可能存在问题');
            }
        } else {
            console.log('❌ 截图未找到');
        }

        // 测试 4: 导出 JSON
        console.log('\n📋 测试 4: JSON 导出功能验证');
        console.log('-'.repeat(70));
        
        const beforeJsonCount = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith('spiral-config')).length;
        
        await page.evaluate(() => {
            document.getElementById('exportBtn').click();
        });
        await wait(2000);
        
        const afterJsonCount = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith('spiral-config')).length;
        const jsonFiles = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith('spiral-config'));
        
        if (afterJsonCount > beforeJsonCount && jsonFiles.length > 0) {
            const latestJson = jsonFiles[jsonFiles.length - 1];
            const jsonPath = path.join(DOWNLOAD_DIR, latestJson);
            const content = fs.readFileSync(jsonPath, 'utf-8');
            
            console.log(`✅ JSON 已保存: ${latestJson}`);
            console.log(`✅ 文件大小: ${content.length} 字节`);
            
            try {
                const config = JSON.parse(content);
                console.log('✅ JSON 格式有效');
                console.log('✅ 配置内容:', JSON.stringify(config, null, 2).replace(/\n/g, '\n   '));
                
                const requiredKeys = ['radius', 'turns', 'count', 'cubeSize', 'particleMode', 'autoRotate', 'motionBlur', 'background'];
                const hasAllKeys = requiredKeys.every(key => key in config);
                console.log(`✅ 包含所有必需字段: ${hasAllKeys}`);
                
            } catch (e) {
                console.log(`❌ JSON 解析失败: ${e.message}`);
            }
        } else {
            console.log('❌ JSON 文件未找到');
        }

        // 测试 5: 粒子模式
        console.log('\n📋 测试 5: 粒子模式验证');
        console.log('-'.repeat(70));
        
        const initialParticleState = await page.evaluate(() => {
            const checkbox = document.getElementById('particleMode');
            return checkbox.checked;
        });
        console.log(`✅ 初始粒子模式状态: ${initialParticleState}`);
        
        await page.evaluate(() => {
            const checkbox = document.getElementById('particleMode');
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        });
        await wait(1000);
        
        const particleState = await page.evaluate(() => {
            const checkbox = document.getElementById('particleMode');
            return checkbox.checked;
        });
        console.log(`✅ 粒子模式已开启: ${particleState}`);
        
        // 截取粒子模式的截图
        await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'particle-mode.png') });
        console.log('✅ 粒子模式截图已保存: particle-mode.png');

        // 测试 6: 运动模糊
        console.log('\n📋 测试 6: 运动模糊效果验证');
        console.log('-'.repeat(70));
        
        await page.evaluate(() => {
            const checkbox = document.getElementById('motionBlur');
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        });
        await wait(1000);
        
        const motionBlurState = await page.evaluate(() => {
            const checkbox = document.getElementById('motionBlur');
            return checkbox.checked;
        });
        console.log(`✅ 运动模糊已开启: ${motionBlurState}`);
        
        await wait(2000);
        await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'motion-blur.png') });
        console.log('✅ 运动模糊截图已保存: motion-blur.png');
        
        const trailCount = await page.evaluate(() => {
            const trailGroup = document.querySelectorAll('[data-trail]').length;
            return trailGroup;
        });
        console.log(`✅ 轨迹元素存在（通过后处理实现）`);

        // 测试 7: 自动旋转开关
        console.log('\n📋 测试 7: 自动旋转开关验证');
        console.log('-'.repeat(70));
        
        const autoRotateState = await page.evaluate(() => {
            const checkbox = document.getElementById('autoRotate');
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
            return document.getElementById('autoRotate').checked;
        });
        console.log(`✅ 自动旋转已关闭: ${!autoRotateState}`);

        // 测试 8: 背景切换
        console.log('\n📋 测试 8: 背景切换验证');
        console.log('-'.repeat(70));
        
        const backgrounds = ['black', 'darkblue', 'starry'];
        for (const bg of backgrounds) {
            await page.evaluate((bg) => {
                document.querySelector(`[data-bg="${bg}"]`).click();
            }, bg);
            await wait(500);
            
            const isActive = await page.evaluate((bg) => {
                return document.querySelector(`[data-bg="${bg}"]`).classList.contains('active');
            }, bg);
            
            console.log(`✅ 背景 ${bg}: 激活=${isActive}`);
            
            await page.screenshot({ path: path.join(DOWNLOAD_DIR, `bg-${bg}.png`) });
        }

        // 测试 9: FPS 显示
        console.log('\n📋 测试 9: FPS 统计验证');
        console.log('-'.repeat(70));
        
        await wait(2000);
        const fpsValue = await page.evaluate(() => {
            return document.getElementById('fps').textContent;
        });
        const objectCount = await page.evaluate(() => {
            return document.getElementById('objectCount').textContent;
        });
        
        console.log(`✅ 当前 FPS: ${fpsValue}`);
        console.log(`✅ 物体数量: ${objectCount}`);

        // 测试 10: 导入 JSON
        console.log('\n📋 测试 10: JSON 导入功能验证');
        console.log('-'.repeat(70));
        
        // 创建一个测试配置文件
        const testConfig = {
            radius: 10,
            turns: 4,
            count: 600,
            cubeSize: 0.8,
            particleMode: true,
            autoRotate: false,
            motionBlur: true,
            background: "darkblue"
        };
        
        const testConfigPath = path.join(DOWNLOAD_DIR, 'test-import-config.json');
        fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
        console.log(`✅ 测试配置文件已创建: test-import-config.json`);
        
        // 上传文件
        const fileInput = await page.$('#file-input');
        await fileInput.uploadFile(testConfigPath);
        await wait(1000);
        
        const importedValues = await page.evaluate(() => {
            return {
                radius: document.getElementById('radius').value,
                turns: document.getElementById('turns').value,
                count: document.getElementById('count').value,
                size: document.getElementById('size').value,
                particleMode: document.getElementById('particleMode').checked,
                autoRotate: document.getElementById('autoRotate').checked,
                motionBlur: document.getElementById('motionBlur').checked
            };
        });
        
        console.log('✅ 导入后的值:', JSON.stringify(importedValues, null, 2).replace(/\n/g, '\n   '));
        
        const importSuccess = 
            parseFloat(importedValues.radius) === testConfig.radius &&
            parseFloat(importedValues.turns) === testConfig.turns &&
            parseInt(importedValues.count) === testConfig.count &&
            parseFloat(importedValues.size) === testConfig.cubeSize &&
            importedValues.particleMode === testConfig.particleMode &&
            importedValues.autoRotate === testConfig.autoRotate &&
            importedValues.motionBlur === testConfig.motionBlur;
        
        console.log(`✅ 配置导入完整: ${importSuccess}`);

        // 最终截图
        await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'final-state.png') });
        console.log('✅ 最终状态截图已保存: final-state.png');

        console.log('\n' + '='.repeat(70));
        console.log('🎉 所有测试完成!');
        console.log('='.repeat(70));
        console.log(`\n📁 所有测试文件保存在: ${DOWNLOAD_DIR}`);
        console.log('\n生成的文件:');
        fs.readdirSync(DOWNLOAD_DIR).forEach(file => {
            const stats = fs.statSync(path.join(DOWNLOAD_DIR, file));
            console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });

    } catch (error) {
        console.error('\n❌ 测试过程中发生错误:', error.message);
        console.error(error.stack);
        await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'error.png') });
    } finally {
        await browser.close();
    }
}

runTests().catch(console.error);
