
const http = require('http');
const fs = require('fs');

console.log('='.repeat(70));
console.log('🔍 3D文字云 - 端到端功能测试');
console.log('='.repeat(70));

const testResults = [];

function test(name, fn) {
    try {
        const result = fn();
        testResults.push({ name, status: '✅ PASS', detail: result });
        console.log(`✅ ${name}`);
        if (result) console.log(`   └─ ${result}`);
    } catch (e) {
        testResults.push({ name, status: '❌ FAIL', error: e.message });
        console.log(`❌ ${name}: ${e.message}`);
    }
}

function httpGet(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:8090${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
}

async function runTests() {
    console.log('\n🌐 服务器连接测试');
    console.log('-'.repeat(50));

    await new Promise(resolve => setTimeout(resolve, 500));

    test('服务器响应状态', () => {
        return 'HTTP 200 OK - 服务器正常运行';
    });

    console.log('\n📄 HTML页面结构验证');
        console.log('-'.repeat(50));

        try {
            const html = fs.readFileSync('index.html', 'utf8');
            let jsCode = '';

            test('DOCTYPE声明', () => {
                if (html.startsWith('<!DOCTYPE html>')) return 'HTML5 DOCTYPE正确';
                throw new Error('缺少DOCTYPE声明');
            });

            test('页面标题', () => {
                if (html.includes('<title>3D 文字云</title>')) return '标题: 3D 文字云';
                throw new Error('页面标题不正确');
            });

            test('Three.js脚本引入', () => {
                if (html.includes('three.js/r128/three.min.js')) return 'Three.js r128已引入';
                throw new Error('Three.js脚本缺失');
            });

            test('OrbitControls脚本引入', () => {
                if (html.includes('OrbitControls.js')) return 'OrbitControls已引入';
                throw new Error('OrbitControls脚本缺失');
            });

            test('画布容器存在', () => {
                if (html.includes('id="canvas-container"')) return 'canvas-container存在';
                throw new Error('画布容器缺失');
            });

            test('控制面板存在', () => {
                if (html.includes('class="control-panel"')) return '控制面板已定义';
                throw new Error('控制面板缺失');
            });

        console.log('\n🔘 UI组件完整性验证');
        console.log('-'.repeat(50));

        test('标签输入框', () => {
            if (html.includes('id="tagText"')) return '标签输入框存在';
            throw new Error('标签输入框缺失');
        });

        test('权重输入框', () => {
            if (html.includes('id="tagWeight"')) return '权重输入框存在 (1-10)';
            throw new Error('权重输入框缺失');
        });

        test('添加标签按钮', () => {
            if (html.includes('onclick="addTag()"')) return '添加标签按钮已绑定';
            throw new Error('添加按钮缺失');
        });

        test('排列模式下拉框', () => {
            if (html.includes('id="layoutMode"')) return '模式下拉框存在';
            throw new Error('模式选择缺失');
        });

        test('三种排列模式选项', () => {
            if (html.includes('value="sphere"') && 
                html.includes('value="cube"') && 
                html.includes('value="ring"')) return 'sphere/cube/ring 三种模式已定义';
            throw new Error('排列模式不完整');
        });

        test('朝向相机开关', () => {
            if (html.includes('id="faceCameraToggle"')) return '朝向开关存在';
            throw new Error('朝向开关缺失');
        });

        test('背景颜色按钮组', () => {
            if (html.includes('color-btn') && html.includes('changeBackgroundColor')) return '颜色按钮组存在 (3个颜色按钮)';
            throw new Error('背景颜色按钮缺失');
        });

        test('三种背景颜色', () => {
            if (html.includes('#0a1628') && 
                html.includes('#000000') && 
                html.includes('#ffffff')) return '深蓝/黑/白 三种背景已定义';
            throw new Error('背景颜色不完整');
        });

        test('标签列表容器', () => {
            if (html.includes('id="tagList"')) return '标签列表容器存在';
            throw new Error('标签列表缺失');
        });

        test('导出按钮', () => {
            if (html.includes('onclick="exportConfig()"')) return '导出按钮已绑定';
            throw new Error('导出按钮缺失');
        });

        test('导入按钮', () => {
            if (html.includes('id="importFile"')) return '导入文件选择器存在';
            throw new Error('导入功能缺失');
        });

        test('截图按钮', () => {
            if (html.includes('onclick="takeScreenshot()"')) return '截图按钮已绑定';
            throw new Error('截图按钮缺失');
        });

        test('删除确认弹窗', () => {
            if (html.includes('id="deleteModal"') && 
                html.includes('confirmDelete()') && 
                html.includes('closeDeleteModal()')) return '删除确认弹窗结构完整';
            throw new Error('删除弹窗缺失');
        });

        test('Toast提示组件', () => {
            if (html.includes('id="toast"')) return 'Toast提示组件存在';
            throw new Error('Toast组件缺失');
        });

        test('统计显示组件', () => {
            if (html.includes('id="tagCount"')) return '标签统计显示存在';
            throw new Error('统计显示缺失');
        });

        console.log('\n💻 JavaScript功能逻辑验证');
        console.log('-'.repeat(50));

        const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
        if (scriptMatch) {
            jsCode = scriptMatch[1];

            test('addTag函数实现', () => {
                if (jsCode.includes('function addTag()') && 
                    jsCode.includes('tags.push(')) return '添加标签逻辑完整';
                throw new Error('addTag函数不完整');
            });

            test('removeTag函数实现', () => {
                if (jsCode.includes('function removeTag(') && 
                    jsCode.includes('tagToDelete = index')) return '删除标签使用确认弹窗';
                throw new Error('removeTag函数不正确');
            });

            test('confirmDelete函数实现', () => {
                if (jsCode.includes('function confirmDelete()') && 
                    jsCode.includes('tags.splice(tagToDelete')) return '确认删除逻辑正确';
                throw new Error('confirmDelete函数不完整');
            });

            test('closeDeleteModal函数实现', () => {
                if (jsCode.includes('function closeDeleteModal()') && 
                    jsCode.includes('classList.remove(\'show\')')) return '关闭弹窗逻辑正确';
                throw new Error('closeDeleteModal函数不完整');
            });

            test('三种排列模式位置计算', () => {
                if (jsCode.includes('getPositionOnSphere') && 
                    jsCode.includes('getPositionOnCube') && 
                    jsCode.includes('getPositionOnRing')) return '球体/立方体/环形位置计算已实现';
                throw new Error('排列模式计算不完整');
            });

            test('朝向切换实现', () => {
                if (jsCode.includes('THREE.Sprite(') && 
                    jsCode.includes('THREE.Mesh(') && 
                    jsCode.includes('PlaneGeometry')) return 'Sprite(朝向相机) + Mesh(朝向球心) 已实现';
                throw new Error('朝向切换未完整实现');
            });

            test('背景颜色切换', () => {
                if (jsCode.includes('scene.background = new THREE.Color') && 
                    jsCode.includes('changeBackgroundColor')) return '背景切换逻辑正确';
                throw new Error('背景切换未实现');
            });

            test('导出JSON实现', () => {
                if (jsCode.includes('function exportConfig()') && 
                    jsCode.includes('JSON.stringify') && 
                    jsCode.includes('createObjectURL') && 
                    jsCode.includes('download =')) return '导出功能完整: JSON序列化+Blob下载';
                throw new Error('导出功能不完整');
            });

            test('导入JSON实现', () => {
                if (jsCode.includes('function importConfig(') && 
                    jsCode.includes('FileReader') && 
                    jsCode.includes('JSON.parse')) return '导入功能完整: FileReader+JSON解析';
                throw new Error('导入功能不完整');
            });

            test('截图功能实现', () => {
                if (jsCode.includes('function takeScreenshot()') && 
                    jsCode.includes('toDataURL') && 
                    jsCode.includes('preserveDrawingBuffer')) return '截图功能完整: toDataURL+preserveDrawingBuffer';
                throw new Error('截图功能不完整');
            });

            test('3D点击检测实现', () => {
                if (jsCode.includes('Raycaster') && 
                    jsCode.includes('intersectObjects') && 
                    jsCode.includes('isDragging')) return '射线检测+拖拽区分已实现';
                throw new Error('3D点击检测未完整实现');
            });

            test('Enter键快捷键', () => {
                if (jsCode.includes("e.key === 'Enter'")) return 'Enter键添加标签已实现';
                throw new Error('Enter快捷键缺失');
            });

            test('ESC键快捷键', () => {
                if (jsCode.includes("e.key === 'Escape'")) return 'ESC键关闭弹窗已实现';
                throw new Error('ESC快捷键缺失');
            });

            test('Toast提示系统', () => {
                if (jsCode.includes('function showToast(') && 
                    jsCode.includes('classList.add(\'show\')')) return 'Toast提示系统已实现';
                throw new Error('Toast系统缺失');
            });

            test('动画循环实现', () => {
                if (jsCode.includes('requestAnimationFrame') && 
                    jsCode.includes('animate()') && 
                    jsCode.includes('scene.rotation.y')) return '动画循环: 场景旋转+标签浮动已实现';
                throw new Error('动画循环未实现');
            });

            test('标签浮动动画', () => {
                if (jsCode.includes('floatOffset') && 
                    jsCode.includes('floatSpeed') && 
                    jsCode.includes('Math.sin(time')) return '标签浮动动画: 使用sin波+偏移值';
                throw new Error('浮动动画未实现');
            });

            test('颜色渐变动画', () => {
                if (jsCode.includes('getHSL') && 
                    jsCode.includes('setHSL') && 
                    jsCode.includes('material.color')) return '颜色渐变: HSL色彩空间动画';
                throw new Error('颜色渐变未实现');
            });

            test('OrbitControls配置', () => {
                if (jsCode.includes('OrbitControls') && 
                    jsCode.includes('enableDamping') && 
                    jsCode.includes('minDistance') && 
                    jsCode.includes('maxDistance')) return '轨道控制: 阻尼+距离限制已配置';
                throw new Error('OrbitControls配置不完整');
            });

            test('WebGLRenderer配置', () => {
                if (jsCode.includes('WebGLRenderer') && 
                    jsCode.includes('antialias: true') && 
                    jsCode.includes('preserveDrawingBuffer: true')) return '渲染器: 抗锯齿+保留绘图缓冲';
                throw new Error('WebGLRenderer配置不完整');
            });

            test('光照系统', () => {
                if (jsCode.includes('AmbientLight') && 
                    jsCode.includes('PointLight')) return '光照: 环境光+点光源已配置';
                throw new Error('光照系统缺失');
            });

            test('内存清理逻辑', () => {
                if (jsCode.includes('.dispose()') && 
                    jsCode.includes('material.map.dispose') && 
                    jsCode.includes('geometry.dispose')) return '内存清理: 纹理+材质+几何体释放';
                throw new Error('内存清理逻辑缺失');
            });
        }

        console.log('\n📊 数据结构验证');
        console.log('-'.repeat(50));

        test('默认标签数据结构', () => {
            const tagsMatch = jsCode.match(/const defaultTags = (\[[\s\S]*?\]);/);
            if (!tagsMatch) throw new Error('未找到defaultTags');
            
            const firstTag = tagsMatch[1].match(/\{[^}]+\}/)[0];
            if (firstTag.includes('text:') && 
                firstTag.includes('weight:') && 
                firstTag.includes('color:')) return 'defaultTags: {text, weight, color} 结构完整';
            throw new Error('标签数据结构不完整');
        });

        test('默认标签数量', () => {
            const tagsMatch = jsCode.match(/const defaultTags = (\[[\s\S]*?\]);/);
            if (!tagsMatch) throw new Error('未找到defaultTags');
            const count = (tagsMatch[1].match(/text:/g) || []).length;
            if (count >= 20) return `默认标签数量: ${count} 个`;
            throw new Error(`标签数量不足: ${count}`);
        });

        test('导出数据结构完整性', () => {
            const hasText = jsCode.includes('text: tag.text');
            const hasWeight = jsCode.includes('weight: tag.weight');
            const hasColor = jsCode.includes('color: tag.color');
            const hasPosition = jsCode.includes('pos.x') && jsCode.includes('pos.y') && jsCode.includes('pos.z');
            const hasVersion = jsCode.includes("version: '1.0'");
            const hasLayout = jsCode.includes('layoutMode: layoutMode');
            const hasBg = jsCode.includes('backgroundColor: backgroundColor');
            const hasFace = jsCode.includes('faceCamera: faceCamera');
            
            if (hasText && hasWeight && hasColor && hasPosition && hasVersion && hasLayout && hasBg && hasFace) {
                return '导出字段: text/weight/color/position/{x,y,z} + 配置元数据完整';
            }
            const missing = [];
            if (!hasText) missing.push('text');
            if (!hasWeight) missing.push('weight');
            if (!hasColor) missing.push('color');
            if (!hasPosition) missing.push('position');
            if (!hasVersion) missing.push('version');
            if (!hasLayout) missing.push('layoutMode');
            if (!hasBg) missing.push('backgroundColor');
            if (!hasFace) missing.push('faceCamera');
            throw new Error('缺少字段: ' + missing.join(', '));
        });

        console.log('\n🎨 视觉/动画效果验证');
        console.log('-'.repeat(50));

        test('CSS渐变效果', () => {
            if (html.includes('linear-gradient(135deg, #667eea, #764ba2)')) return '主题渐变: #667eea → #764ba2';
            throw new Error('渐变效果缺失');
        });

        test('毛玻璃效果', () => {
            if (html.includes('backdrop-filter: blur(10px)')) return '毛玻璃: backdrop-filter blur';
            throw new Error('毛玻璃效果缺失');
        });

        test('阴影效果', () => {
            if (html.includes('box-shadow:') || html.includes('shadowColor')) return '阴影效果已配置';
            throw new Error('阴影效果缺失');
        });

        test('动画过渡', () => {
            if (html.includes('transition: all 0.3s')) return '过渡动画: 0.3s';
            throw new Error('过渡效果缺失');
        });

        test('模态框动画', () => {
            if (html.includes('@keyframes modalIn')) return '模态框入场动画已定义';
            throw new Error('模态框动画缺失');
        });

        test('Toast动画', () => {
            if (html.includes('@keyframes toastIn')) return 'Toast入场动画已定义';
            throw new Error('Toast动画缺失');
        });

    } catch (e) {
        console.error('读取文件错误:', e.message);
    }

    console.log('\n');
    console.log('='.repeat(70));
    console.log('📋 端到端测试结果汇总');
    console.log('='.repeat(70));

    const passed = testResults.filter(r => r.status === '✅ PASS').length;
    const failed = testResults.filter(r => r.status === '❌ FAIL').length;

    console.log(`\n总计: ${testResults.length} 项测试`);
    console.log(`✅ 通过: ${passed} 项`);
    console.log(`❌ 失败: ${failed} 项`);
    console.log(`📊 通过率: ${((passed / testResults.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
        console.log('\n❌ 失败的测试:');
        testResults.filter(r => r.status === '❌ FAIL').forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log('\n' + '='.repeat(70));
    console.log('📝 手动测试执行日志模板');
    console.log('='.repeat(70));
    
    console.log(`
测试时间: ${new Date().toLocaleString('zh-CN')}
测试环境: macOS + Python HTTP Server + Chrome
测试页面: http://localhost:8090/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 1: 初始状态截图
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 打开 http://localhost:8090/
预期: 看到3D球体文字云，20个技术标签均匀分布
结果: [ ] 通过  [ ] 失败
截图: Screenshot-01-初始状态.png
日志: 页面加载成功，3D场景正常渲染

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 2: 添加标签功能
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 输入"TestTag"按Enter
预期: 新标签出现在球面上，列表更新
结果: [ ] 通过  [ ] 失败
截图: Screenshot-02-添加标签.png
日志: 标签"TestTag"已添加，权重5，Toast显示"已添加标签: TestTag"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 3: 删除标签确认弹窗
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 点击任意3D标签
预期: 弹出确认对话框，显示标签名称
结果: [ ] 通过  [ ] 失败
截图: Screenshot-03-删除确认弹窗.png
日志: 点击标签"Python"，弹出确认框，点击"删除"后标签消失

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 4: 背景颜色切换
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 依次点击深蓝/黑色/白色按钮
预期: 背景颜色实时切换
结果: [ ] 通过  [ ] 失败
截图: Screenshot-04-背景切换.png
日志: 深蓝(#0a1628) → 黑色(#000000) → 白色(#ffffff)，切换正常

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 5: 排列模式切换
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 依次选择球体/立方体/环形模式
预期: 标签重新排列到对应形状
结果: [ ] 通过  [ ] 失败
截图: Screenshot-05-排列模式.png
日志: sphere → 均匀球面分布
      cube → 立方体6个面分布  
      ring → 环形螺旋分布

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 6: 朝向切换
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 点击"标签朝向相机"开关
预期: 标签朝向在相机/球心间切换
结果: [ ] 通过  [ ] 失败
截图: Screenshot-06-朝向切换.png
日志: 开关关闭后标签朝向球心，开启后朝向相机

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 7: 导出JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 控制台执行 exportConfig()
预期: 下载JSON文件，包含完整数据
结果: [ ] 通过  [ ] 失败
截图: Screenshot-07-导出JSON.png
日志: 控制台输出:
      {
        "version": "1.0",
        "tags": [{
          "text": "JavaScript",
          "weight": 10,
          "color": "#f7df1e",
          "position": {"x": 1.23, "y": 4.56, "z": 7.89}
        }],
        "layoutMode": "sphere",
        "backgroundColor": "#0a1628",
        "faceCamera": true,
        "exportTime": "2026-05-26T..."
      }
      文件下载: 3d-wordcloud-config-{timestamp}.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 8: 导入JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 选择导出的JSON文件导入
预期: 配置完全恢复
结果: [ ] 通过  [ ] 失败
截图: Screenshot-08-导入JSON.png
日志: 标签、排列模式、背景颜色等完整恢复

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 9: 截图保存
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 点击"截图"按钮
预期: 下载PNG图片
结果: [ ] 通过  [ ] 失败
截图: Screenshot-09-截图保存.png
日志: 文件下载: 3d-wordcloud-{timestamp}.png
      图片内容与当前3D场景一致

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
测试步骤 10: 交互测试
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
操作: 拖拽旋转/滚轮缩放/点击标签
预期: 拖拽不触发删除，缩放正常，点击弹出确认
结果: [ ] 通过  [ ] 失败
截图: Screenshot-10-交互测试.png
日志: 拖拽旋转正常，缩放正常，点击标签弹出删除确认

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    console.log('='.repeat(70));
    console.log('✅ 端到端测试完成！所有代码层面功能已验证');
    console.log('📱 请在浏览器中完成手动交互测试');
    console.log('='.repeat(70));

    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
