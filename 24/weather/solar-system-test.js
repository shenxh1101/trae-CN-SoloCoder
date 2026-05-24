const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_URL = 'http://localhost:8080/solar-system.html';
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = [];

function logTestResult(testName, passed, description = '') {
    const result = {
        testName,
        passed,
        description,
        timestamp: new Date().toISOString()
    };
    testResults.push(result);
    console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'}: ${testName}`);
    if (description) {
        console.log(`   ${description}`);
    }
}

async function waitForPageLoad(page) {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('📄 页面加载完成');
}

async function checkConsoleErrors(page) {
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    return errors;
}

async function evaluatePlanetData(page) {
    return await page.evaluate(() => {
        return {
            planets: typeof planets !== 'undefined' ? Object.keys(planets) : null,
            earthMoon: typeof planets !== 'undefined' && planets.earth && planets.earth.moon ? true : false,
            saturnRings: typeof planets !== 'undefined' && planets.saturn ? true : false,
            isSplitView: typeof isSplitView !== 'undefined' ? isSplitView : null,
            timeSpeed: typeof timeSpeed !== 'undefined' ? timeSpeed : null,
            simulationTime: typeof simulationTime !== 'undefined' ? simulationTime.toISOString() : null
        };
    });
}

async function test1_splitView(page) {
    console.log('\n🧪 测试1：对比模式验证');
    
    try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-before-split-view.png'), fullPage: true });
        
        const splitViewBtn = await page.getByText('对比模式');
        await splitViewBtn.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-split-view.png'), fullPage: true });
        
        const data = await evaluatePlanetData(page);
        const hasSplitClass = await page.evaluate(() => 
            document.getElementById('canvas-container').classList.contains('split-view')
        );
        
        const mainCanvasVisible = await page.evaluate(() => {
            const canvas = document.getElementById('main-canvas');
            const rect = canvas.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
        
        const realCanvasVisible = await page.evaluate(() => {
            const canvas = document.getElementById('real-scale-canvas');
            const rect = canvas.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
        
        const hasPlanets = data.planets && data.planets.length > 0;
        const hasMoon = data.earthMoon;
        const hasSaturn = data.saturnRings;
        
        const passed = hasSplitClass && mainCanvasVisible && realCanvasVisible && 
                       hasPlanets && hasMoon && hasSaturn;
        
        logTestResult('对比模式测试', passed, 
            `分屏:${hasSplitClass} 左画布:${mainCanvasVisible} 右画布:${realCanvasVisible} 行星:${hasPlanets} 月球:${hasMoon} 土星:${hasSaturn}`);
        
        return passed;
    } catch (e) {
        logTestResult('对比模式测试', false, `错误: ${e.message}`);
        return false;
    }
}

async function test2_moonOrbit(page) {
    console.log('\n🧪 测试2：月球运动验证');
    
    try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-moon-orbit-start.png'), fullPage: true });
        
        const speedBtn = await page.getByText('100x');
        await speedBtn.click();
        await page.waitForTimeout(500);
        
        const dataBefore = await page.evaluate(() => {
            if (!planets.earth || !planets.earth.moon) return null;
            return {
                angle: planets.earth.moon.currentAngle,
                moonX: planets.earth.moon.mesh.position.x,
                moonZ: planets.earth.moon.mesh.position.z,
                realMoonX: planets.earth.moon.realMesh ? planets.earth.moon.realMesh.position.x : null,
                realMoonZ: planets.earth.moon.realMesh ? planets.earth.moon.realMesh.position.z : null
            };
        });
        
        await page.waitForTimeout(2000);
        
        const dataAfter = await page.evaluate(() => {
            if (!planets.earth || !planets.earth.moon) return null;
            return {
                angle: planets.earth.moon.currentAngle,
                moonX: planets.earth.moon.mesh.position.x,
                moonZ: planets.earth.moon.mesh.position.z,
                realMoonX: planets.earth.moon.realMesh ? planets.earth.moon.realMesh.position.x : null,
                realMoonZ: planets.earth.moon.realMesh ? planets.earth.moon.realMesh.position.z : null
            };
        });
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-moon-orbit-end.png'), fullPage: true });
        
        const speedBtnReset = await page.getByText('1x');
        await speedBtnReset.click();
        await page.waitForTimeout(500);
        
        if (!dataBefore || !dataAfter) {
            logTestResult('月球运动测试', false, '无法获取月球数据');
            return false;
        }
        
        const angleChanged = Math.abs(dataAfter.angle - dataBefore.angle) > 0.01;
        const mainSceneMoved = Math.abs(dataAfter.moonX - dataBefore.moonX) > 0.01 || 
                              Math.abs(dataAfter.moonZ - dataBefore.moonZ) > 0.01;
        const realSceneMoved = dataAfter.realMoonX !== null && 
                              (Math.abs(dataAfter.realMoonX - dataBefore.realMoonX) > 0.01 || 
                               Math.abs(dataAfter.realMoonZ - dataBefore.realMoonZ) > 0.01);
        
        const passed = angleChanged && mainSceneMoved && realSceneMoved;
        
        logTestResult('月球运动测试', passed,
            `角度变化:${angleChanged} 左场景运动:${mainSceneMoved} 右场景运动:${realSceneMoved}`);
        
        return passed;
    } catch (e) {
        logTestResult('月球运动测试', false, `错误: ${e.message}`);
        return false;
    }
}

async function test3_datePicker(page) {
    console.log('\n🧪 测试3：日期选择验证');
    
    try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-date-before.png'), fullPage: true });
        
        const planetPositionsBefore = await page.evaluate(() => {
            const positions = {};
            for (const key of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
                if (planets[key]) {
                    positions[key] = {
                        x: planets[key].mesh.position.x,
                        z: planets[key].mesh.position.z,
                        realX: planets[key].realMesh ? planets[key].realMesh.position.x : null,
                        realZ: planets[key].realMesh ? planets[key].realMesh.position.z : null
                    };
                }
            }
            return positions;
        });
        
        const datePicker = await page.locator('#date-picker');
        await datePicker.fill('2020-01-01');
        await page.evaluate(() => {
            const input = document.getElementById('date-picker');
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(2000);
        
        const planetPositionsAfter = await page.evaluate(() => {
            const positions = {};
            for (const key of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
                if (planets[key]) {
                    positions[key] = {
                        x: planets[key].mesh.position.x,
                        z: planets[key].mesh.position.z,
                        realX: planets[key].realMesh ? planets[key].realMesh.position.x : null,
                        realZ: planets[key].realMesh ? planets[key].realMesh.position.z : null
                    };
                }
            }
            return positions;
        });
        
        const simTime = await page.evaluate(() => simulationTime.toISOString());
        const earthAngle = await page.evaluate(() => 
            planets.earth ? ((planets.earth.currentAngle * 180 / Math.PI) % 360).toFixed(1) : null
        );
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-date-after-2020-01-01.png'), fullPage: true });
        
        let allMoved = true;
        let allRealMoved = true;
        for (const key of Object.keys(planetPositionsBefore)) {
            const before = planetPositionsBefore[key];
            const after = planetPositionsAfter[key];
            
            const moved = Math.abs(after.x - before.x) > 0.01 || Math.abs(after.z - before.z) > 0.01;
            if (!moved) allMoved = false;
            
            if (after.realX !== null) {
                const realMoved = Math.abs(after.realX - before.realX) > 0.01 || 
                                  Math.abs(after.realZ - before.realZ) > 0.01;
                if (!realMoved) allRealMoved = false;
            }
        }
        
        const earthAngleCorrect = earthAngle && Math.abs(parseFloat(earthAngle) - 90) < 25;
        
        const passed = allMoved && allRealMoved && earthAngleCorrect && simTime.includes('2020-01');
        
        logTestResult('日期选择测试', passed,
            `模拟时间:${simTime.substring(0,10)} 地球角度:${earthAngle}° 左场景行星移动:${allMoved} 右场景行星移动:${allRealMoved}`);
        
        return passed;
    } catch (e) {
        logTestResult('日期选择测试', false, `错误: ${e.message}`);
        return false;
    }
}

async function test4_demoMode(page) {
    console.log('\n🧪 测试4：演示模式验证');
    
    try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-demo-start.png'), fullPage: true });
        
        const demoBtn = await page.getByText('开始自动漫游');
        await demoBtn.click();
        await page.waitForTimeout(1000);
        
        const cameraPositions = [];
        for (let i = 0; i < 4; i++) {
            await page.waitForTimeout(2500);
            const pos = await page.evaluate(() => ({
                mainCamera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                realCamera: { x: realCamera.position.x, y: realCamera.position.y, z: realCamera.position.z },
                demoPlanet: planetOrder[demoCurrentPlanet],
                isDemoMode: isDemoMode,
                elapsed: Date.now() - demoStartTime
            }));
            cameraPositions.push(pos);
            console.log(`   漫游第${i+1}次采样: 行星=${pos.demoPlanet}, 已运行=${(pos.elapsed/1000).toFixed(1)}s, 主相机Z=${pos.mainCamera.z.toFixed(1)}`);
        }
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-demo-mid.png'), fullPage: true });
        
        const stopBtn = await page.getByText('停止自动漫游');
        await stopBtn.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-demo-stop.png'), fullPage: true });
        
        const mainCameraMoved = Math.abs(cameraPositions[cameraPositions.length-1].mainCamera.z - cameraPositions[0].mainCamera.z) > 3;
        const realCameraMoved = Math.abs(cameraPositions[cameraPositions.length-1].realCamera.z - cameraPositions[0].realCamera.z) > 3;
        const planetChanged = cameraPositions[0].demoPlanet !== cameraPositions[cameraPositions.length-1].demoPlanet;
        
        const moonVisible = await page.evaluate(() => {
            const moon = planets.earth.moon;
            return moon && moon.mesh.visible !== false && 
                   moon.realMesh && moon.realMesh.visible !== false;
        });
        
        const saturnRingsVisible = await page.evaluate(() => {
            const saturn = planets.saturn;
            return saturn && saturn.mesh.children.length > 0;
        });
        
        const passed = mainCameraMoved && realCameraMoved && planetChanged && 
                       moonVisible && saturnRingsVisible;
        
        logTestResult('演示模式测试', passed,
            `主相机移动:${mainCameraMoved} 实相机移动:${realCameraMoved} 行星切换:${planetChanged} 月球可见:${moonVisible} 土星光环可见:${saturnRingsVisible}`);
        
        return passed;
    } catch (e) {
        logTestResult('演示模式测试', false, `错误: ${e.message}`);
        return false;
    }
}

async function test5_saturnRings(page) {
    console.log('\n🧪 测试5：土星环验证');
    
    try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-saturn-before-zoom.png'), fullPage: true });
        
        const saturnData = await page.evaluate(() => {
            const saturn = planets.saturn;
            if (!saturn) return null;
            
            const mainRingCount = saturn.mesh.children.filter(c => 
                c.type === 'Mesh' || c.type === 'Points'
            ).length;
            
            const realRingCount = saturn.realMesh ? saturn.realMesh.children.filter(c => 
                c.type === 'Mesh' || c.type === 'Points'
            ).length : 0;
            
            return {
                hasRings: mainRingCount > 0,
                mainRingCount,
                realRingCount,
                saturnPosition: { x: saturn.mesh.position.x, z: saturn.mesh.position.z },
                realSaturnPosition: saturn.realMesh ? { x: saturn.realMesh.position.x, z: saturn.realMesh.position.z } : null
            };
        });
        
        await page.evaluate(() => {
            const saturn = planets.saturn;
            if (saturn) {
                const targetPos = new THREE.Vector3();
                saturn.mesh.getWorldPosition(targetPos);
                const direction = new THREE.Vector3()
                    .subVectors(camera.position, targetPos)
                    .normalize();
                const newPosition = targetPos.clone().add(direction.multiplyScalar(15));
                camera.position.copy(newPosition);
                controls.target.copy(targetPos);
                controls.update();
                
                realCamera.position.copy(camera.position);
                realCamera.lookAt(controls.target);
            }
        });
        
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-saturn-after-zoom.png'), fullPage: true });
        
        const saturnDataAfterZoom = await page.evaluate(() => {
            const saturn = planets.saturn;
            if (!saturn) return null;
            
            return {
                cameraDistance: camera.position.distanceTo(saturn.mesh.position),
                realCameraDistance: realCamera.position.distanceTo(saturn.realMesh.position)
            };
        });
        
        const passed = saturnData && saturnData.hasRings && 
                       saturnData.mainRingCount >= 2 && 
                       saturnData.realRingCount >= 2 &&
                       saturnDataAfterZoom && saturnDataAfterZoom.cameraDistance < 30;
        
        logTestResult('土星环测试', passed,
            `左场景环数量:${saturnData?.mainRingCount} 右场景环数量:${saturnData?.realRingCount} 放大后距离:${saturnDataAfterZoom?.cameraDistance.toFixed(1)}`);
        
        return passed;
    } catch (e) {
        logTestResult('土星环测试', false, `错误: ${e.message}`);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 开始执行太阳系模拟器自动化测试\n');
    console.log(`📸 截图保存目录: ${SCREENSHOT_DIR}\n`);
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--window-size=1920,1080']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    const consoleErrors = checkConsoleErrors(page);
    
    try {
        await waitForPageLoad(page);
        
        const initialErrors = consoleErrors;
        if (initialErrors.length > 0) {
            console.log(`⚠️  控制台错误: ${initialErrors.join(', ')}`);
        }
        
        const result1 = await test1_splitView(page);
        const result2 = await test2_moonOrbit(page);
        const result3 = await test3_datePicker(page);
        const result4 = await test4_demoMode(page);
        const result5 = await test5_saturnRings(page);
        
        const totalPassed = testResults.filter(r => r.passed).length;
        const totalTests = testResults.length;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 测试结果汇总');
        console.log('='.repeat(60));
        
        testResults.forEach((r, i) => {
            console.log(`${i+1}. ${r.passed ? '✅' : '❌'} ${r.testName}`);
        });
        
        console.log('\n' + '='.repeat(60));
        console.log(`总计: ${totalPassed}/${totalTests} 通过`);
        console.log('='.repeat(60));
        
        const resultsFile = path.join(SCREENSHOT_DIR, 'test-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify({
            summary: {
                totalTests,
                totalPassed,
                totalFailed: totalTests - totalPassed
            },
            details: testResults
        }, null, 2));
        
        console.log(`\n📝 详细测试结果已保存: ${resultsFile}`);
        console.log(`🖼️  所有截图已保存到: ${SCREENSHOT_DIR}`);
        
        return totalPassed === totalTests;
        
    } catch (e) {
        console.error(`\n❌ 测试执行错误: ${e.message}`);
        console.error(e.stack);
        return false;
    } finally {
        await browser.close();
    }
}

runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
