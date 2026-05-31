# AI老照片修复模拟器

一个基于HTML、CSS和原生JavaScript的AI老照片修复模拟器，支持前端Canvas图像处理和后端Flask服务。

## 功能特性

- ✅ **照片上传**：支持拖拽上传、点击选择文件
- ✅ **破损效果模拟**：可调节破损程度和划痕数量
- ✅ **手动选择修复区域**：画笔涂抹选择需要修复的区域
- ✅ **多种修复算法**：去噪、锐化、对比度增强、智能上色、划痕去除
- ✅ **修复强度调节**：弱/中/强三档可选
- ✅ **对比预览**：滑块分割对比、半透明叠加查看
- ✅ **步骤图导出**：导出修复过程的中间步骤图
- ✅ **批量处理**：批量修复文件夹内所有照片，ZIP打包下载
- ✅ **GIF动画分享**：生成修复前后对比动画GIF
- ✅ **历史记录**：localStorage保存修复历史，可追溯查看

## 项目结构

```
├── frontend/              # 前端代码
│   ├── index.html         # 主页面
│   ├── css/
│   │   └── style.css      # 样式文件
│   ├── js/
│   │   ├── main.js        # 主逻辑
│   │   ├── canvas.js      # Canvas操作
│   │   ├── tools.js       # 工具函数
│   │   └── history.js     # 历史记录
│   └── lib/               # 第三方库
│       ├── jszip.min.js   # ZIP打包
│       └── gif.js         # GIF生成
├── backend/               # 后端代码
│   ├── app.py             # Flask服务
│   ├── image_processing.py # 图像处理算法
│   └── requirements.txt   # Python依赖
└── uploads/               # 临时上传目录
```

## 快速开始

### 方式一：纯前端模式（推荐）

前端已内置完整的图像处理模拟算法，可以直接运行，无需启动后端服务。

```bash
# 进入前端目录
cd frontend

# 启动HTTP服务器（使用Python）
python3 -m http.server 8080

# 或者使用Node.js
npx serve . -p 8080
```

然后在浏览器中访问：`http://localhost:8080`

### 方式二：完整模式（前端 + 后端）

如果需要使用更强大的图像处理算法（Pillow+NumPy），可以启动后端Flask服务。

**1. 安装后端依赖**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate     # Windows

pip install -r requirements.txt
```

**2. 启动后端服务**

```bash
python app.py
```

后端服务将在 `http://localhost:8001` 启动

**3. 启动前端**

```bash
cd frontend
python3 -m http.server 8080
```

## 使用说明

### 单张修复

1. 点击或拖拽上传一张照片
2. （可选）调节破损程度，点击"应用破损效果"模拟老照片效果
3. （可选）选择"画笔选择"模式，在照片上涂抹需要修复的区域
4. 选择修复强度（弱/中/强）
5. 勾选需要的修复操作
6. 点击"开始修复"按钮
7. 修复完成后，可以：
   - 在"对比预览"查看滑块对比效果
   - 在"叠加查看"调节透明度查看差异
   - 查看修复步骤预览
   - 下载修复后的图片、步骤图或GIF动画

### 批量处理

1. 切换到"批量处理"标签
2. 拖拽或选择多个照片文件
3. 设置修复参数
4. 点击"开始批量修复"
5. 处理完成后点击"打包下载ZIP"

### 历史记录

1. 切换到"历史记录"标签
2. 查看所有修复记录
3. 可以加载历史记录重新编辑，或删除记录

## API接口

API基础地址: `http://localhost:8001`

### 单张修复
```
POST /api/repair
Content-Type: multipart/form-data

参数：
- image: 图片文件
- intensity: 修复强度 (weak/medium/strong)
- operations: JSON字符串，修复操作配置
- mask: (可选) 选区蒙版图片
```

### 批量修复
```
POST /api/batch-repair
Content-Type: multipart/form-data

参数：
- images: 多个图片文件
- intensity: 修复强度
- operations: JSON字符串
```

### 破损模拟
```
POST /api/simulate-damage
Content-Type: multipart/form-data

参数：
- image: 图片文件
- damageLevel: 破损程度 (0-100)
- scratchCount: 划痕数量
```

## 技术栈

**前端**：
- HTML5 Canvas API
- 原生 JavaScript (ES6+)
- CSS3 (Flexbox, CSS Variables, Animations)
- JSZip (ZIP打包)
- gif.js (GIF生成)

**后端**：
- Flask (Web框架)
- Pillow (PIL) 图像处理
- NumPy (数值计算)
- Flask-CORS (跨域资源共享)

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 注意事项

1. 纯前端模式使用Canvas模拟图像处理，效果可能不如后端OpenCV算法精确
2. 大图片处理可能需要较长时间，请耐心等待
3. 历史记录保存在浏览器localStorage中，清除浏览器数据会丢失
4. 建议使用Chrome浏览器以获得最佳体验

## 许可证

MIT License
