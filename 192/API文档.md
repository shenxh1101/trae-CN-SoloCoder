# 图片马赛克生成工具 - API文档

## 服务启动
```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py
```
服务默认运行在: **http://127.0.0.1:5001**

---

## 前端界面
直接在浏览器访问 **http://127.0.0.1:5001** 即可使用完整的Web界面。

### 前端功能
1. **单图处理**：上传图片，设置参数，生成马赛克
2. **批量处理**：上传ZIP包，批量处理所有图片
3. **URL处理**：输入图片URL直接处理
4. **局部马赛克**：切换到"局部打码"模式，在原图上拖拽选择区域
5. **对比预览**：使用滑块对比原图和马赛克图
6. **模拟恢复**：查看模拟的恢复效果（仅演示，不可逆）

---

## API接口列表

### 1. 上传图片
**POST** `/api/upload`

**请求**: multipart/form-data
| 字段 | 类型 | 说明 |
|------|------|------|
| image | file | 图片文件 |

**响应**:
```json
{
  "success": true,
  "original_id": "original_xxx.png",
  "width": 400,
  "height": 300,
  "preview": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

---

### 2. 处理图片（生成马赛克）
**POST** `/api/process`

**请求**: application/json
| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| original_id | string | 必填 | 上传返回的图片ID |
| block_size | int | 10 | 马赛克块大小(像素) |
| shape | string | 'square' | 马赛克形状: 'square'或'circle' |
| region | array | null | 局部区域坐标: [x1, y1, x2, y2]，null为全图 |
| brightness | int | 0 | 亮度调整: -50 ~ 50 |
| color_shift | array | [0,0,0] | RGB色彩偏移: [R, G, B]，范围-100~100 |
| format | string | 'PNG' | 输出格式: 'PNG'或'JPEG' |
| quality | int | 95 | JPEG质量: 10 ~ 100 |

**示例**:
```json
{
  "original_id": "original_abc.png",
  "block_size": 15,
  "shape": "circle",
  "region": [100, 50, 300, 200],
  "brightness": 10,
  "color_shift": [20, 0, -10],
  "format": "JPEG",
  "quality": 90
}
```

**响应**:
```json
{
  "success": true,
  "mosaic_id": "mosaic_xxx.png",
  "preview": "data:image/png;base64,...",
  "download_url": "/temp/mosaic_xxx.png"
}
```

---

### 3. 通过URL处理图片（返回Base64）
**POST** `/api/process-url`

**请求**: application/json
| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| url | string | 必填 | 图片URL |
| block_size | int | 10 | 马赛克块大小 |
| shape | string | 'square' | 马赛克形状 |
| brightness | int | 0 | 亮度调整 |
| color_shift | array | [0,0,0] | RGB色彩偏移 |
| format | string | 'PNG' | 输出格式 |
| quality | int | 95 | JPEG质量 |

**响应**:
```json
{
  "success": true,
  "image_base64": "data:image/png;base64,..."
}
```

---

### 4. 批量处理ZIP包
**POST** `/api/batch-process`

**请求**: multipart/form-data
| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| zip | file | 必填 | ZIP压缩包 |
| block_size | string | '10' | 马赛克块大小 |
| shape | string | 'square' | 马赛克形状 |
| brightness | string | '0' | 亮度调整 |
| color_shift | string | '0,0,0' | RGB偏移，逗号分隔 |
| format | string | 'PNG' | 输出格式 |
| quality | string | '95' | JPEG质量 |

**响应**:
```json
{
  "success": true,
  "download_url": "/temp/batch_xxx_images.zip"
}
```

---

### 5. 模拟恢复效果
**POST** `/api/simulate-restore`

**请求**: application/json
| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| mosaic_id | string | 必填 | 马赛克图片ID |
| strength | int | 3 | 平滑强度 |

**响应**:
```json
{
  "success": true,
  "preview": "data:image/png;base64,...",
  "note": "这是模拟的恢复效果，实际上马赛克是不可逆的"
}
```

---

## 参数说明

### 马赛克形状
- **square**: 方形马赛克块（默认）
- **circle**: 圆形马赛克点

### 局部区域坐标
格式: `[x1, y1, x2, y2]`
- x1, y1: 左上角坐标
- x2, y2: 右下角坐标

### 色彩偏移
RGB三个通道独立调整，范围: -100 ~ 100
- 正值: 增加该颜色分量
- 负值: 减少该颜色分量

### 输出质量
- **PNG**: 无损压缩，quality参数无效
- **JPEG**: 10(最低) ~ 100(最高)

---

## 临时文件
- 所有处理后的图片保存到 `temp/` 目录
- 文件1小时后自动删除
- 下载链接: `/temp/{filename}`

---

## 使用示例

### Python示例
```python
import requests

BASE_URL = 'http://127.0.0.1:5001'

# 1. 上传图片
with open('test.png', 'rb') as f:
    response = requests.post(f'{BASE_URL}/api/upload', files={'image': f})
    original_id = response.json()['original_id']

# 2. 生成马赛克
response = requests.post(f'{BASE_URL}/api/process', json={
    'original_id': original_id,
    'block_size': 20,
    'shape': 'square',
    'brightness': 5,
    'format': 'JPEG',
    'quality': 90
})
result = response.json()
print(f"下载地址: {BASE_URL}{result['download_url']}")
```

### cURL示例
```bash
# 上传图片
curl -X POST -F "image=@test.png" http://127.0.0.1:5001/api/upload

# 处理图片
curl -X POST -H "Content-Type: application/json" \
  -d '{"original_id":"original_xxx.png","block_size":15}' \
  http://127.0.0.1:5001/api/process

# URL处理
curl -X POST -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/image.jpg","block_size":10}' \
  http://127.0.0.1:5001/api/process-url
```
