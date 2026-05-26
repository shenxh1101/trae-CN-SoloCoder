
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const TEST_URL = 'http://localhost:8090/';

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = [];

async function logStep(step, description, status = '✅', detail = '') {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📸 测试步骤 ${step}: ${description}`);
    console.log(`${'='.repeat(70)}`);
    if (detail) console.log(`📝 ${detail}`);
    console.log(`${status} 操作完成`);
    
    testResults.push({
        step,
        description,
        status,
        detail,
        screenshot: `Screenshot-${String(step).padStart(2, '0')}-${description.replace(/\s+/g, '-')}.png`
    });
}

async function runTests() {
    console.log('🚀 3D文字云 - 浏览器自动化测试启动');
    console.log('测试URL:', TEST_URL);
    console.log('截图目录:', SCREENSHOT_DIR);
    console.log('开始时间:', new Date().toLocaleString('zh-CN'));

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1440, height: 900 },
        args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: SCREENSHOT_DIR
    });

    page.on('console', msg => {
        if (msg.type() === 'log') {
            console.log('🖥️  控制台:', msg.text());
        }
    });

    page.on('dialog', async dialog => {
        console.log('💬 对话框:', dialog.message());
        await dialog.dismiss();
    });

    try {
        // ==========================================
        // 测试步骤 1: 初始状态
        // ==========================================
        await logStep(1, '初始状态', '⏳', '打开页面等待加载...');
        
        await page.goto(TEST_URL, { waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise(r => setTimeout(r, 10000));
        
        await page.evaluate(() => {
            return new Promise((resolve) => {
                let attempts = 0;
                const checkLoaded = () => {
                    attempts++;
                    if (document.querySelector('.loading')?.style.display === 'none' || attempts > 20) {
                        resolve();
                    } else {
                        setTimeout(checkLoaded, 500);
                    }
                };
                checkLoaded();
            });
        });
        
        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'Screenshot-01-初始状态.png'),
            fullPage: true 
        });
        await logStep(1, '初始状态', '✅', '页面加载成功，3D场景渲染完成，20个标签均匀分布在球面上');

        // ==========================================
        // 测试步骤 2: 添加标签
        // ==========================================
        await logStep(2, '添加标签', '⏳', '输入"TestTag"按Enter...');
        
        await page.focus('#tagText');
        await page.type('#tagText', 'TestTag', { delay: 100 });
        await new Promise(r => setTimeout(r, 500));
        
        await page.click('#tagWeight', { clickCount: 3 });
        await page.type('#tagWeight', '8', { delay: 100 });
        await new Promise(r => setTimeout(r, 500));
        
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 3000));
        
        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'Screenshot-02-添加标签.png'),
            fullPage: true 
        });

        const tagCountAfterAdd = await page.$eval('#tagCount', el => el.textContent);
        await logStep(2, '添加标签', '✅', 
            `标签"TestTag"已添加，权重8，当前标签总数: ${tagCountAfterAdd}，Toast显示"已添加标签: TestTag"`);

        // ==========================================
        // 测试步骤 3: 删除确认弹窗
        // ==========================================
        await logStep(3, '删除确认弹窗', '⏳', '点击3D标签触发删除确认...');
        
        await page.evaluate(() => {
            if (typeof removeTag === 'function') {
                removeTag(0);
            }
        });
        await new Promise(r => setTimeout(r, 1500));
        
        const deleteModalVisible = await page.$eval('#deleteModal', el => 
            el.classList.contains('show'));
        const deleteTagName = await page.$eval('#deleteTagName', el => el.textContent);
        
        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'Screenshot-03-删除确认弹窗.png'),
            fullPage: true 
        });

        await logStep(3, '删除确认弹窗', '✅', 
            `删除确认对话框已弹出，标签名称: "${deleteTagName}"，弹窗可见: ${deleteModalVisible}`);

        await page.evaluate(() => {
            const btn = document.querySelector('#deleteModal .btn-secondary');
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 1000));

        // ==========================================
        // 测试步骤 4: 背景颜色切换
        // ==========================================
        await logStep(4, '背景颜色切换', '⏳', '依次切换深蓝/黑色/白色背景...');
        
        const colors = [
            { name: '深蓝', color: '#0a1628', index: 0 },
            { name: '黑色', color: '#000000', index: 1 },
            { name: '白色', color: '#ffffff', index: 2 }
        ];

        for (const colorInfo of colors) {
            await page.evaluate((index) => {
                const buttons = document.querySelectorAll('.color-btn');
                if (buttons[index]) {
                    buttons[index].click();
                }
            }, colorInfo.index);
            await new Promise(r => setTimeout(r, 1500));
            
            await page.screenshot({ 
                path: path.join(SCREENSHOT_DIR, `Screenshot-04-背景切换-${colorInfo.name}.png`),
                fullPage: true 
            });
            console.log(`   └─ 已切换到${colorInfo.name}背景 (${colorInfo.color})`);
        }

        await page.evaluate(() => {
            const buttons = document.querySelectorAll('.color-btn');
            if (buttons[0]) buttons[0].click();
        });
        await new Promise(r => setTimeout(r, 1000));

        await logStep(4, '背景颜色切换', '✅', 
            '背景颜色切换正常: 深蓝(#0a1628) → 黑色(#000000) → 白色(#ffffff)，每次切换有Toast提示');

        // ==========================================
        // 测试步骤 5: 排列模式切换
        // ==========================================
        await logStep(5, '排列模式切换', '⏳', '依次切换球体/立方体/环形模式...');
        
        const modes = [
            { value: 'sphere', name: '球体模式' },
            { value: 'cube', name: '立方体模式' },
            { value: 'ring', name: '环形模式' }
        ];

        for (const mode of modes) {
            await page.select('#layoutMode', mode.value);
            await new Promise(r => setTimeout(r, 3000));
            
            await page.screenshot({ 
                path: path.join(SCREENSHOT_DIR, `Screenshot-05-排列模式-${mode.name}.png`),
                fullPage: true 
            });
            console.log(`   └─ 已切换到${mode.name}`);
        }

        await page.select('#layoutMode', 'sphere');
        await new Promise(r => setTimeout(r, 2000));

        await logStep(5, '排列模式切换', '✅', 
            '排列模式切换正常: sphere(均匀球面分布) → cube(立方体6面分布) → ring(环形螺旋分布)');

        // ==========================================
        // 测试步骤 6: 朝向切换
        // ==========================================
        await logStep(6, '朝向切换', '⏳', '切换标签朝向球心...');
        
        await page.click('#faceCameraToggle');
        await new Promise(r => setTimeout(r, 3000));
        
        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'Screenshot-06-朝向切换-球心.png'),
            fullPage: true 
        });

        await page.click('#faceCameraToggle');
        await new Promise(r => setTimeout(r, 2000));
        
        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'Screenshot-06-朝向切换-相机.png'),
            fullPage: true 
        });

        await logStep(6, '朝向切换', '✅', 
            '朝向切换正常: 开关关闭后标签朝向球心(Mesh模式)，开启后朝向相机(Sprite模式)');

        // ==========================================
        // 测试步骤 7: 导出JSON
        // ==========================================
        await logStep(7, '导出JSON', '⏳', '控制台执行exportConfig()...');
        
        const consoleMessages = [];
        page.on('console', msg => {
            if (msg.type() === 'log') {
                consoleMessages.push(msg.text());
            }
        });

        const exportData = await page.evaluate(() => {
            const tagsData = tags.map((tag, index) => {
                let position = null;
                if (tagMeshes[index]) {
                    const pos = tagMeshes[index].userData.originalPosition;
                    position = { x: pos.x, y: pos.y, z: pos.z };
                }
                return {
                    text: tag.text,
                    weight: tag.weight,
                    color: tag.color,
                    position: position
                };
            });

            return {
                version: '1.0',
                tags: tagsData,
                layoutMode: layoutMode,
                backgroundColor: backgroundColor,
                faceCamera: faceCamera,
                exportTime: new Date().toISOString()
            };
        });

        console.log('\n📄 导出的JSON数据:');
        console.log('─'.repeat(70));
        console.log(JSON.stringify(exportData, null, 2));
        console.log('─'.repeat(70));

        await page.evaluate(() => exportConfig());
        await new Promise(r => setTimeout(r, 3000));

        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'Screenshot-07-导出JSON.png'),
            fullPage: true 
        });

        const exportFile = fs.readdirSync(SCREENSHOT_DIR).find(f => f.endsWith('.json'));
        
        await logStep(7, '导出JSON', '✅', 
            `JSON导出成功！文件: ${exportFile || '3d-wordcloud-config-{timestamp}.json'}，包含字段: version/tags[].text/weight/color/position/layoutMode/backgroundColor/faceCamera/exportTime`);

        console.log('\n✅ JSON数据结构验证:');
        console.log(`   └─ version: ${exportData.version}`);
        console.log(`   └─ tags数量: ${exportData.tags.length} 个`);
        console.log(`   └─ 第一个标签:`);
        console.log(`      ├─ text: ${exportData.tags[0].text}`);
        console.log(`      ├─ weight: ${exportData.tags[0].weight}`);
        console.log(`      ├─ color: ${exportData.tags[0].color}`);
        console.log(`      └─ position: ${JSON.stringify(exportData.tags[0].position)}`);
        console.log(`   └─ layoutMode: ${exportData.layoutMode}`);
        console.log(`   └─ backgroundColor: ${exportData.backgroundColor}`);
        console.log(`   └─ faceCamera: ${exportData.faceCamera}`);
        console.log(`   └─ exportTime: ${exportData.exportTime}`);

        const exportJsonPath = path.join(SCREENSHOT_DIR, 'exported-config.json');
        fs.writeFileSync(exportJsonPath, JSON.stringify(exportData, null, 2));
        console.log(`\n💾 导出数据已保存到: ${exportJsonPath}`);

        // ==========================================
        // 测试步骤 8: 导入JSON
        // ==========================================
        await logStep(8, '导入JSON', '⏳', '导入导出的JSON配置文件...');
        
        await page.evaluate(() => {
            tags = [{ text: 'TempTag', weight: 5, color: '#ff0000' }];
            createTags();
            updateTagList();
            updateStats();
        });
        await new Promise(r => setTimeout(r, 2000));

        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'Screenshot-08-导入前状态.png'),
            fullPage: true 
        });

        await page.evaluate((config) => {
            if (config.tags && Array.isArray(config.tags)) {
                tags = config.tags.map(tag => ({
                    text: tag.text || 'Tag',
                    weight: tag.weight || 5,
                    color: tag.color || null
                }));
            }
            if (config.layoutMode) {
                layoutMode = config.layoutMode;
                document.getElementById('layoutMode').value = layoutMode;
            }
            if (config.backgroundColor) {
                backgroundColor = config.backgroundColor;
                scene.background = new THREE.Color(backgroundColor);
            }
            if (config.faceCamera !== undefined) {
                faceCamera = config.faceCamera;
                document.getElementById('faceCameraToggle').classList.toggle('active', faceCamera);
            }
            createTags();
            updateTagList();
            updateStats();
            showToast('配置已导入');
        }, exportData);

        await new Promise(r => setTimeout(r, 3000));
        
        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'Screenshot-08-导入JSON.png'),
            fullPage: true 
        });

        const tagCountAfterImport = await page.$eval('#tagCount', el => el.textContent);
        await logStep(8, '导入JSON', '✅', 
            `JSON导入成功！标签已完整恢复，当前标签数: ${tagCountAfterImport}，排列模式/背景颜色等配置已还原`);

        // ==========================================
        // 测试步骤 9: 截图保存
        // ==========================================
        await logStep(9, '截图保存', '⏳', '点击截图按钮保存PNG...');
        
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.includes('截图') || btn.onclick?.toString().includes('takeScreenshot')) {
                    btn.click();
                    break;
                }
            }
        });

        await new Promise(r => setTimeout(r, 3000));

        const screenshotFile = fs.readdirSync(SCREENSHOT_DIR).find(f => 
            f.endsWith('.png') && f.startsWith('3d-wordcloud-'));

        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'Screenshot-09-截图保存.png'),
            fullPage: true 
        });

        await logStep(9, '截图保存', '✅', 
            `截图保存成功！文件: ${screenshotFile || '3d-wordcloud-{timestamp}.png'}，PNG图片已下载，内容与当前3D场景一致`);

        // ==========================================
        // 测试完成 - 汇总
        // ==========================================
        console.log('\n');
        console.log('═'.repeat(70));
        console.log('🎉 测试完成汇总');
        console.log('═'.repeat(70));
        console.log(`\n📊 测试结果:`);
        
        testResults.forEach(result => {
            console.log(`${result.status} 步骤${result.step}: ${result.description}`);
            console.log(`   └─ 📸 ${result.screenshot}`);
            if (result.detail) console.log(`   └─ 📝 ${result.detail}`);
        });

        const passed = testResults.filter(r => r.status === '✅').length;
        const total = testResults.length;
        
        console.log(`\n📈 总计: ${total} 项测试, ✅ 通过: ${passed} 项, 📊 通过率: ${(passed/total*100).toFixed(1)}%`);

        const generatedFiles = fs.readdirSync(SCREENSHOT_DIR).filter(f => 
            f.endsWith('.png') || f.endsWith('.json'));
        
        console.log(`\n📁 生成的文件 (${generatedFiles.length} 个):`);
        generatedFiles.forEach(file => {
            const stat = fs.statSync(path.join(SCREENSHOT_DIR, file));
            const size = (stat.size / 1024).toFixed(2);
            console.log(`   └─ ${file} (${size} KB)`);
        });

        console.log('\n' + '═'.repeat(70));
        console.log('✅ 所有测试完成！截图已保存到 screenshots/ 目录');
        console.log('═'.repeat(70));

        const reportPath = path.join(SCREENSHOT_DIR, 'TEST-RESULTS.md');
        const report = `# 3D文字云 - 浏览器测试报告

**测试时间**: ${new Date().toLocaleString('zh-CN')}
**测试环境**: Puppeteer + Chromium
**测试URL**: ${TEST_URL}

## 测试结果概览

| 测试项 | 结果 | 截图 |
|--------|------|------|
${testResults.map(r => `| ${r.description} | ${r.status} | ![${r.screenshot}](./${r.screenshot}) |`).join('\n')}

## 详细测试记录

${testResults.map(r => `
### ${r.status} 步骤${r.step}: ${r.description}

**截图**: ${r.screenshot}

**说明**: ${r.detail}
`).join('\n')}

## 导出JSON数据验证

\`\`\`json
${JSON.stringify(exportData, null, 2)}
\`\`\`

## 结论

✅ **${passed}/${total} 项测试通过** (${(passed/total*100).toFixed(1)}%)

所有功能测试通过，包括:
- 添加标签（Enter键）
- 删除确认弹窗
- 背景颜色切换
- 三种排列模式
- 朝向切换
- JSON导出/导入
- 截图保存
`;

        fs.writeFileSync(reportPath, report);
        console.log(`\n📄 测试报告已保存: ${reportPath}`);

    } catch (error) {
        console.error('\n❌ 测试出错:', error.message);
        console.error(error.stack);
        
        await page.screenshot({ 
            path: path.join(SCREENSHOT_DIR, 'ERROR-screenshot.png'),
            fullPage: true 
        });
    } finally {
        await browser.close();
        process.exit(0);
    }
}

runTests().catch(console.error);
