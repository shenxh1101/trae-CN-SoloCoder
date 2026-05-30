# AI手写文字识别与学习系统

一个集手写识别、临摹学习、数据分析于一体的智能交互平台。用户可在Canvas上手写汉字或英文，系统通过CNN模型实时识别并给出Top-3候选结果，同时支持用户纠正和增量学习，不断提升模型准确率。

## 功能特性

### 1. 手写识别
- 在Canvas画板上手写字符，支持鼠标和触摸操作
- 可调节画笔粗细和颜色
- 实时返回Top-3识别结果及置信度
- 支持用户纠正识别结果，样本自动保存用于训练

### 2. 临摹练习
- 从字库中选择标准字体（汉字、英文、数字）
- 田字格展示标准字体，辅助临摹
- 实时计算用户书写与标准字体的相似度评分
- 根据分数给出针对性反馈建议

### 3. 批量识别
- 支持拖拽上传包含多个手写字的图片
- 自动检测并分割单个字符（基于OpenCV）
- 批量识别并以表格形式展示结果
- 显示每个字符的Top-3候选及置信度

### 4. 数据分析
- 可视化混淆矩阵（热力图）展示识别错误分布
- 统计最常见的识别错误对
- 显示总错误数、涉及字符数等关键指标

### 5. 历史记录
- 分页展示所有识别记录
- 支持按类型筛选（单次识别/批量识别）
- 显示纠正标记，便于回顾

### 6. 数据导出
- 将收集的样本导出为CSV格式训练数据
- 包含图像像素数据和标签
- 模型更新提示，当样本达到50个时提示训练

## 技术架构

### 前端
- 原生 HTML5 + CSS3 + JavaScript (ES6+)
- HTML5 Canvas API 实现手写功能
- CSS变量 + Flexbox + Grid 响应式布局
- Fetch API 与后端通信

### 后端
- Flask 3.0 + Flask-CORS
- TensorFlow 2.x + Keras CNN模型
- OpenCV + Pillow 图像处理
- Matplotlib + Seaborn 数据可视化

### 目录结构
```
project/
├── backend/
│   ├── app.py              # Flask主应用
│   ├── model.py            # CNN模型定义和训练
│   ├── image_utils.py      # 图像处理工具
│   ├── config.py           # 配置文件
│   ├── train.py            # 训练脚本
│   ├── requirements.txt    # 依赖包
│   ├── models/             # 已训练模型
│   └── data/
│       ├── corrected_samples/  # 用户纠正的样本
│       ├── trained_samples/    # 已用于训练的样本
│       ├── history/            # 识别历史记录
│       ├── exports/            # 导出的CSV文件
│       └── batch_uploads/      # 批量上传的图片
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── README.md
```

## 快速开始

### 1. 安装后端依赖
```bash
cd backend
pip install -r requirements.txt
```

### 2. 训练初始模型
```bash
cd backend
python train.py new
```

### 3. 启动后端服务
```bash
cd backend
python app.py
```
服务将在 http://localhost:5000 启动

### 4. 打开前端页面
直接在浏览器中打开 `frontend/index.html`

或者使用简单的HTTP服务器：
```bash
cd frontend
python -m http.server 8000
```
然后访问 http://localhost:8000

## 使用说明

### 手写识别
1. 在左侧画板上书写字符
2. 点击"识别"按钮
3. 查看右侧的Top-3识别结果
4. 如果结果不正确，选择或输入正确的字符，点击"提交纠正"

### 临摹练习
1. 从左侧字库选择要练习的字符
2. 在中间画板上临摹
3. 点击"评分"按钮查看相似度
4. 根据反馈改进书写

### 批量识别
1. 上传包含多个手写字的图片
2. 点击"开始批量识别"
3. 查看识别结果表格

### 模型训练
当收集的样本达到50个时，系统会提示训练模型：
1. 进入"数据导出"页面
2. 点击"开始训练模型"按钮
3. 等待训练完成（可能需要几分钟）

或者使用命令行训练：
```bash
cd backend
python train.py
```

## API接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/recognize | 单个字符识别 |
| POST | /api/correct | 提交纠正结果 |
| POST | /api/batch_recognize | 批量图片识别 |
| POST | /api/practice/compare | 临摹相似度比较 |
| GET | /api/practice/characters | 获取练习字库 |
| GET | /api/analytics/confusion_matrix | 获取混淆矩阵数据 |
| GET | /api/analytics/confusion_matrix_image | 获取混淆矩阵图片 |
| GET | /api/export/csv | 导出训练数据CSV |
| GET | /api/history | 获取历史记录 |
| POST | /api/retrain | 触发模型重训练 |

## 模型说明

### CNN模型架构
- 输入：64×64灰度图像
- 卷积层1：32个3×3过滤器，ReLU激活
- 最大池化层1：2×2
- 卷积层2：64个3×3过滤器，ReLU激活
- 最大池化层2：2×2
- 卷积层3：128个3×3过滤器，ReLU激活
- 最大池化层3：2×2
- 全连接层：256个神经元，ReLU激活，Dropout 0.5
- 输出层：Softmax，107个类别（70汉字+26字母+10数字+1符号）

### 支持的字符
- 汉字：一、二、三...大、小、中...等70个常用汉字
- 英文：A-Z 26个大写字母
- 数字：0-9 10个阿拉伯数字

## 增量学习

系统支持增量学习，用户纠正的样本会被自动保存：
1. 用户提交纠正后，图像和标签保存到 `corrected_samples` 目录
2. 当样本数达到50个时，系统提示训练
3. 训练完成后，样本移动到 `trained_samples` 目录
4. 模型更新，识别准确率逐步提升

## 响应式设计

- 桌面端（≥1200px）：左侧导航 + 右侧内容区
- 平板端（768-1200px）：单列布局，内容自适应
- 移动端（<768px）：顶部导航，画板自适应屏幕宽度

## 开发说明

### 添加新字符
1. 在 `backend/config.py` 的 `CHAR_LIST` 中添加新字符
2. 重新训练模型：`python train.py new`

### 调整训练阈值
修改 `backend/config.py` 中的 `RETRAIN_THRESHOLD` 参数。

### 自定义字体
修改 `backend/model.py` 中的 `font_paths` 列表，添加系统可用的中文字体路径。

## 注意事项

1. 首次运行需要训练初始模型，可能需要5-10分钟
2. 模型训练需要足够的内存，建议4GB以上
3. 手写时尽量写在画板中央，大小适中
4. 批量识别的图片建议背景干净，字符间距适中
5. 定期导出数据备份，避免样本丢失

## 许可证

MIT License
