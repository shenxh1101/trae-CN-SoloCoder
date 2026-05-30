# 🎨 AI 轮廓图生成器

一个基于 Flask + OpenCV 的 AI 轮廓图生成器，支持手绘草图转轮廓图、图片上传转换、批量处理等功能。

## ✨ 功能特性

### 核心功能
- **Canvas 手绘绘图**: 在画布上自由绘制草图，支持调节画笔大小和颜色
- **三种内置风格**:
  - ✏️ **素描风格**: 铅笔素描效果，线条柔和
  - 🖌️ **水墨风格**: 浓重的黑色线条，类似水墨画
  - ⚡ **科技线条**: 青色发光线条，科技感十足
- **参数调节**:
  - 平滑度滑块: 控制轮廓线的平滑程度
  - 细节保留: 调整边缘检测敏感度

### 图片处理
- **单图上传**: 上传本地图片转换为轮廓图
- **批量转换**: 一次上传多张图片，返回 ZIP 压缩包
- **对比模式**: 左右分屏同时显示原图和生成结果

### 导出功能
- **PNG 导出**: 一键保存为 PNG 图片
- **SVG 导出**: 转换为矢量 SVG 文件

### 高级功能
- **处理耗时显示**: 实时显示每张图片的处理时间
- **自定义风格训练**: 上传最多5对手绘草稿和目标轮廓图，AI 学习你的风格偏好（参数模拟调整）

## 🚀 快速开始

### 方式一：使用启动脚本
```bash
chmod +x start.sh
./start.sh
```

### 方式二：手动启动

1. **创建虚拟环境**
```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate  # Windows
```

2. **安装依赖**
```bash
pip install flask flask-cors opencv-python numpy Pillow
```

3. **启动服务**
```bash
python app.py
```

4. **访问应用**
打开浏览器访问: `http://localhost:5000`

## 📁 项目结构

```
├── app.py                 # Flask 后端主应用
├── requirements.txt       # Python 依赖
├── start.sh              # 启动脚本
├── README.md             # 说明文档
└── static/               # 前端静态文件
    ├── index.html        # 主页面
    ├── style.css         # 样式文件
    └── app.js            # 前端逻辑
```

## 🔧 API 接口

### 生成轮廓图
```
POST /api/generate
Content-Type: application/json

{
    "image": "base64编码的图片数据",
    "style": "sketch|ink|tech",
    "smoothness": 5,
    "detail_level": 3
}
```

### 批量转换
```
POST /api/batch
Content-Type: multipart/form-data

images: 多个图片文件
style: 风格类型
smoothness: 平滑度
detail_level: 细节等级
```

### 导出 SVG
```
POST /api/export-svg
Content-Type: application/json

{
    "image": "base64编码的图片数据"
}
```

### 训练自定义风格
```
POST /api/train-style
Content-Type: application/json

{
    "style_name": "my_style",
    "pairs": [
        {"sketch": "base64草稿图", "target": "base64目标图"},
        ...
    ]
}
```

### 获取可用风格
```
GET /api/styles
```

## 🎯 使用说明

1. **手绘草图**: 在画布上用鼠标绘制简单图形
2. **选择风格**: 点击左侧风格按钮选择喜欢的风格
3. **调节参数**: 拖动滑块调整平滑度和细节
4. **生成轮廓**: 点击"生成轮廓图"按钮
5. **对比查看**: 开启对比模式查看前后效果
6. **导出保存**: 导出为 PNG 或 SVG 格式

## 🛠️ 技术栈

- **后端**: Flask + OpenCV + NumPy
- **前端**: 原生 JavaScript + Canvas
- **图像处理**: Canny 边缘检测 + 形态学操作
- **样式**: CSS3 + 响应式设计

## 📝 注意事项

- 首次启动需要安装依赖，可能需要几分钟
- 自定义风格训练是基于参数调整的模拟，不涉及实际的深度学习模型训练
- 批量处理建议单次不超过 20 张图片
- 支持的图片格式: PNG, JPG, JPEG, GIF

## 📄 License

MIT License
