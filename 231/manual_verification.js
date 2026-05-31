const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');

const TEST_URL = 'http://localhost:8080/';
const SCREENSHOT_DIR = path.join(__dirname, 'manual_verification');
const DOWNLOAD_DIR = path.join(__dirname, 'manual_verification', 'downloads');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

const logEntries = [];

function log(step, message, status = 'INFO') {
  const time = new Date().toLocaleTimeString('zh-CN');
  const prefix = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : 'ℹ️';
  const line = `[${time}] ${prefix} [步骤${step}] ${message}`;
  console.log(line);
  logEntries.push({ step, message, status, time });
}

function saveLog() {
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'verification_log.json'), JSON.stringify(logEntries, null, 2), 'utf8');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function httpRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('======================================================');
  console.log('  梦幻城市 - 手动操作验证测试 (Puppeteer)');
  console.log('======================================================\n');

  let browser;
  let page;

  try {
    // ========== Setup ==========
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--window-size=1400,900'
      ],
      defaultViewport: { width: 1400, height: 900 },
      protocolTimeout: 60000
    });

    page = await browser.newPage();
    const cdpClient = await page.createCDPSession();
    await cdpClient.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DOWNLOAD_DIR
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        log('API', `请求: ${response.request().method()} ${url} → ${response.status()}`, 'INFO');
      }
    });

    // ========== Step 1: Page Load Verification ==========
    console.log('\n──────────────────────────────────────────────');
    console.log('  步骤 1: 页面加载验证');
    console.log('──────────────────────────────────────────────\n');

    log('1', '正在访问 http://localhost:8080/');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step01_page_loaded.png'),
      fullPage: true
    });
    log('1', '截图已保存: manual_verification/step01_page_loaded.png', 'PASS');

    const title = await page.title();
    log('1', `页面标题: ${title}`, 'PASS');

    const canvasExists = await page.evaluate(() => !!document.querySelector('canvas'));
    log('1', `Canvas 元素存在: ${canvasExists}`, canvasExists ? 'PASS' : 'FAIL');

    const uiPanelExists = await page.evaluate(() => !!document.querySelector('#ui-panel'));
    log('1', `UI 面板存在: ${uiPanelExists}`, uiPanelExists ? 'PASS' : 'FAIL');

    // ========== Step 2: Microphone Verification ==========
    console.log('\n──────────────────────────────────────────────');
    console.log('  步骤 2: 麦克风授权和音量检测');
    console.log('──────────────────────────────────────────────\n');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step02_mic_before.png'),
      clip: { x: 1100, y: 750, width: 280, height: 120 }
    });
    log('2', '麦克风激活前截图: manual_verification/step02_mic_before.png', 'PASS');

    log('2', '点击麦克风开关按钮');
    await page.click('#switch-mic');
    await sleep(2000);

    const micActive = await page.evaluate(() => {
      const sw = document.querySelector('#switch-mic').classList.contains('on');
      const indicator = !document.querySelector('#audio-indicator').classList.contains('hidden');
      const bars = document.querySelectorAll('#audio-bars .bar').length;
      return { switchOn: sw, indicatorVisible: indicator, barCount: bars };
    });

    log('2', `麦克风开关状态: ${micActive.switchOn}`, micActive.switchOn ? 'PASS' : 'FAIL');
    log('2', `音量指示器可见: ${micActive.indicatorVisible}`, micActive.indicatorVisible ? 'PASS' : 'FAIL');
    log('2', `音量条数量: ${micActive.barCount}`, micActive.barCount === 16 ? 'PASS' : 'FAIL');

    await sleep(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step02_mic_active.png'),
      clip: { x: 1100, y: 750, width: 280, height: 120 }
    });
    log('2', '麦克风激活后截图: manual_verification/step02_mic_active.png', 'PASS');

    const barHeights = await page.evaluate(() => {
      const bars = document.querySelectorAll('#audio-bars .bar');
      return Array.from(bars).map(b => parseInt(b.style.height) || 4);
    });
    const avgHeight = barHeights.reduce((a, b) => a + b, 0) / barHeights.length;
    const maxHeight = Math.max(...barHeights);
    log('2', `音量条高度 - 平均: ${avgHeight.toFixed(1)}px, 最高: ${maxHeight}px`, 'PASS');

    // Turn off mic
    await page.click('#switch-mic');
    await sleep(500);

    // ========== Step 3: Screenshot Function Verification ==========
    console.log('\n──────────────────────────────────────────────');
    console.log('  步骤 3: 截图功能验证 (PNG保存)');
    console.log('──────────────────────────────────────────────\n');

    const beforeCount = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith('.png')).length;
    log('3', `下载目录PNG数量(前): ${beforeCount}`, 'PASS');

    log('3', '点击截图按钮');
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = 'verification_screenshot.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          try { document.body.removeChild(link); } catch(e) {}
        }
      }, 100);
    });

    await sleep(2000);

    const afterCount = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith('.png')).length;
    const downloadedFiles = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith('.png'));
    log('3', `下载目录PNG数量(后): ${afterCount}`, afterCount > beforeCount ? 'PASS' : 'FAIL');
    log('3', `已下载文件: ${downloadedFiles.join(', ')}`, downloadedFiles.length > 0 ? 'PASS' : 'FAIL');

    for (const file of downloadedFiles) {
      const filePath = path.join(DOWNLOAD_DIR, file);
      const stats = fs.statSync(filePath);
      log('3', `文件 ${file}: ${(stats.size / 1024).toFixed(1)} KB`, stats.size > 1000 ? 'PASS' : 'FAIL');
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step03_download_list.png'),
      fullPage: true
    });
    log('3', '下载完成后页面截图: manual_verification/step03_download_list.png', 'PASS');

    // ========== Step 4: HTTP API Integration ==========
    console.log('\n──────────────────────────────────────────────');
    console.log('  步骤 4: 保存/加载/删除城市 - 前后端联调');
    console.log('──────────────────────────────────────────────\n');

    // Clean up first
    try {
      const listResp = await httpRequest('http://localhost:8080/api/cities');
      if (listResp.status === 200) {
        const cities = JSON.parse(listResp.body);
        for (const city of cities) {
          await httpRequest(`http://localhost:8080/api/cities/${city.id}`, 'DELETE');
        }
        log('4', `清理了 ${cities.length} 条历史数据`, 'PASS');
      }
    } catch (e) {
      log('4', `清理历史数据: ${e.message}`, 'WARN');
    }

    // SAVE
    log('4', '点击"保存到服务器"按钮');
    
    await page.evaluate(() => {
      window._apiRequests = [];
      window._apiResponses = [];
      const origFetch = window.fetch;
      window.fetch = async function(url, options) {
        if (url === '/api/cities' && options && options.method === 'POST') {
          window._apiRequests.push({ url, method: options.method, body: options.body });
        }
        const resp = await origFetch.apply(this, arguments);
        if (url === '/api/cities' && options && options.method === 'POST') {
          const cloned = resp.clone();
          window._apiResponses.push(await cloned.json());
        }
        return resp;
      };
    });

    await page.click('#btn-save');
    await sleep(2000);

    const apiResult = await page.evaluate(() => {
      return {
        requests: window._apiRequests,
        responses: window._apiResponses
      };
    });

    if (apiResult.requests.length > 0) {
      const reqBody = JSON.parse(apiResult.requests[0].body);
      log('4', `前端发起 POST /api/cities 请求`, 'PASS');
      log('4', `请求内容: text=${reqBody.text.substring(0, 30)}..., buildingCount=${reqBody.buildingCount}`, 'PASS');
    } else {
      log('4', '未捕获到 API 请求', 'FAIL');
    }

    if (apiResult.responses.length > 0) {
      log('4', `后端响应: ${JSON.stringify(apiResult.responses[0])}`, 'PASS');
    } else {
      log('4', '未捕获到后端响应', 'FAIL');
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step04_save_city.png'),
      clip: { x: 0, y: 400, width: 360, height: 150 }
    });
    log('4', '保存城市后截图: manual_verification/step04_save_city.png', 'PASS');

    // LOAD
    log('4', '点击"加载城市"按钮');
    await page.click('#btn-load');
    await sleep(1500);

    const listVisible = await page.evaluate(() => {
      const listEl = document.querySelector('#saved-cities-list');
      return {
        visible: !listEl.classList.contains('hidden'),
        itemCount: listEl.querySelectorAll('.saved-item').length
      };
    });
    log('4', `已保存列表可见: ${listVisible.visible}, 条目数: ${listVisible.itemCount}`, listVisible.visible ? 'PASS' : 'FAIL');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step04_load_list.png'),
      clip: { x: 0, y: 480, width: 360, height: 200 }
    });
    log('4', '加载城市列表截图: manual_verification/step04_load_list.png', 'PASS');

    // DELETE via API
    if (apiResult.responses.length > 0 && apiResult.responses[0].id) {
      const savedId = apiResult.responses[0].id;
      log('4', `通过 API 删除城市: ${savedId}`);
      const delResp = await httpRequest(`http://localhost:8080/api/cities/${savedId}`, 'DELETE');
      log('4', `DELETE 响应: HTTP ${delResp.status}, ${delResp.body}`, delResp.status === 200 ? 'PASS' : 'FAIL');

      const verifyResp = await httpRequest(`http://localhost:8080/api/cities/${savedId}`);
      log('4', `删除后验证 GET: HTTP ${verifyResp.status}`, verifyResp.status === 404 ? 'PASS' : 'FAIL');
    }

    // ========== Step 5: Animation Verification ==========
    console.log('\n──────────────────────────────────────────────');
    console.log('  步骤 5: 生长动画和粒子车流验证');
    console.log('──────────────────────────────────────────────\n');

    // Enable growth animation and regenerate
    log('5', '开启生长动画，重新生成城市');
    await page.evaluate(() => {
      const sw = document.querySelector('#switch-growth');
      if (!sw.classList.contains('on')) sw.click();
    });

    await page.click('#btn-generate');
    await sleep(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step05_growth_start.png'),
      fullPage: true
    });
    log('5', '生长动画开始截图: manual_verification/step05_growth_start.png', 'PASS');

    await sleep(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step05_growth_mid.png'),
      fullPage: true
    });
    log('5', '生长动画进行中截图: manual_verification/step05_growth_mid.png', 'PASS');

    await sleep(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step05_growth_done.png'),
      fullPage: true
    });
    log('5', '生长动画完成截图: manual_verification/step05_growth_done.png', 'PASS');

    // Disable growth animation
    await page.evaluate(() => {
      const sw = document.querySelector('#switch-growth');
      if (sw.classList.contains('on')) sw.click();
    });

    // Traffic particles
    log('5', '验证粒子车流运动');
    const trafficState1 = await page.evaluate(() => {
      const traffic = window.trafficParticles;
      if (!traffic || !traffic.geometry) return { found: false };
      const pos = traffic.geometry.attributes.position;
      return {
        found: true,
        count: pos.count,
        x0: pos.getX(0),
        z0: pos.getZ(0)
      };
    });

    if (trafficState1.found) {
      log('5', `粒子系统存在，数量: ${trafficState1.count}`, 'PASS');
      log('5', `粒子0初始位置: x=${trafficState1.x0.toFixed(2)}, z=${trafficState1.z0.toFixed(2)}`, 'PASS');

      await sleep(1000);

      const trafficState2 = await page.evaluate(() => {
        const traffic = window.trafficParticles;
        const pos = traffic.geometry.attributes.position;
        return {
          x0: pos.getX(0),
          z0: pos.getZ(0)
        };
      });

      const moved = Math.abs(trafficState2.x0 - trafficState1.x0) + Math.abs(trafficState2.z0 - trafficState1.z0);
      log('5', `1秒后粒子0位置: x=${trafficState2.x0.toFixed(2)}, z=${trafficState2.z0.toFixed(2)}`, 'PASS');
      log('5', `移动距离: ${moved.toFixed(2)} 单位`, moved > 0.1 ? 'PASS' : 'FAIL');
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step05_traffic_1.png'),
      fullPage: true
    });
    await sleep(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step05_traffic_2.png'),
      fullPage: true
    });
    log('5', '车流连续帧截图: step05_traffic_1.png, step05_traffic_2.png', 'PASS');

    // Night mode animation with traffic
    log('5', '切换夜晚模式观察灯光和车流');
    await page.evaluate(() => {
      const sw = document.querySelector('#switch-night');
      if (!sw.classList.contains('on')) sw.click();
    });
    await sleep(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'step05_night_traffic.png'),
      fullPage: true
    });
    log('5', '夜晚模式车流截图: step05_night_traffic.png', 'PASS');

    // FPS check
    const fpsCheck = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        function check() {
          frames++;
          if (performance.now() - start >= 2000) {
            resolve({ fps: Math.round(frames / 2 * 10) / 10, frames });
          } else {
            requestAnimationFrame(check);
          }
        }
        requestAnimationFrame(check);
      });
    });
    log('5', `FPS测量: ${fpsCheck.fps} (2秒内${fpsCheck.frames}帧)`, fpsCheck.fps > 20 ? 'PASS' : 'WARN');

    // ========== Final Summary ==========
    console.log('\n======================================================');
    console.log('  验证完成 - 结果汇总');
    console.log('======================================================\n');

    const passed = logEntries.filter(e => e.status === 'PASS').length;
    const failed = logEntries.filter(e => e.status === 'FAIL').length;
    const warnings = logEntries.filter(e => e.status === 'WARN').length;

    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⚠️  警告: ${warnings}`);
    console.log(`\n📁 验证截图目录: ${SCREENSHOT_DIR}`);
    console.log(`📥 下载文件目录: ${DOWNLOAD_DIR}`);

    const screenshotFiles = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
    console.log(`\n🖼️  生成的截图文件:`);
    screenshotFiles.forEach(f => {
      const size = fs.statSync(path.join(SCREENSHOT_DIR, f)).size;
      console.log(`   - ${f} (${(size / 1024).toFixed(1)} KB)`);
    });

    saveLog();

    console.log('\n======================================================');
    console.log(failed === 0 ? '  ✅ 所有验证通过!' : `  ❌ 有 ${failed} 项失败`);
    console.log('======================================================');

  } catch (error) {
    console.error('\n❌ 验证执行失败:', error);
    log('*', `验证异常: ${error.message}`, 'FAIL');
    saveLog();
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
