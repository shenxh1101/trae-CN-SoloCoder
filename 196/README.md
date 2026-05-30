# HEIC to JPG 转换工具

一个功能强大的命令行工具，用于批量将 HEIC 格式图片转换为 JPG 格式，支持多种高级功能。

## 功能特性

- ✅ 批量转换 HEIC/HEIF 到 JPG
- ✅ 递归查找文件夹中的所有 HEIC 文件
- ✅ 保留 EXIF 信息（拍摄参数、GPS位置等）
- ✅ 根据 EXIF 方向信息自动旋转图片
- ✅ 支持指定输出目录，保留或扁平化目录结构
- ✅ 可选删除原 HEIC 文件
- ✅ 可调整 JPG 输出质量 (1-100)
- ✅ 多线程加速转换
- ✅ 限制图片最大尺寸（等比缩放）
- ✅ 添加文字水印（支持自定义文字或拍摄日期）
- ✅ 预览模式，查看待转换文件列表
- ✅ 生成转换报告（JSON格式）
- ✅ 支持单个文件转换
- ✅ 文件夹监控模式，自动转换新加入的文件
- ✅ 静默模式，减少输出信息

## 安装

### 环境要求
- Python 3.8+
- macOS / Linux / Windows

### 安装依赖
```bash
pip install -r requirements.txt
```

国内用户可使用镜像源加速：
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## 快速开始

### 1. 转换单个文件
```bash
python heic2jpg.py -i photo.heic
```

### 2. 转换整个目录（递归）
```bash
python heic2jpg.py -i /path/to/heic_folder
```

### 3. 指定输出目录
```bash
python heic2jpg.py -i /path/to/input -o /path/to/output
```

### 4. 预览模式（不实际转换）
```bash
python heic2jpg.py -i /path/to/input --preview
```

## 常用命令示例

### 高质量转换并删除原文件
```bash
python heic2jpg.py -i /path/to/input -q 95 -d -t 8
```

### 限制图片最大尺寸为2000px
```bash
python heic2jpg.py -i /path/to/input --max-size 2000
```

### 添加拍摄日期水印
```bash
python heic2jpg.py -i /path/to/input --watermark-date
```

### 添加自定义文字水印
```bash
python heic2jpg.py -i /path/to/input --watermark "版权所有 2024" --watermark-position bottom-right
```

### 不保留目录结构，所有文件输出到同一目录
```bash
python heic2jpg.py -i /path/to/input -o /path/to/output --no-structure
```

### 只转换当前目录，不递归子目录
```bash
python heic2jpg.py -i /path/to/input --no-recursive
```

### 生成转换报告
```bash
python heic2jpg.py -i /path/to/input --report conversion_report.json
```

### 监控文件夹，自动转换新文件
```bash
python heic2jpg.py -i /path/to/input --watch
```

### 静默模式（减少输出）
```bash
python heic2jpg.py -i /path/to/input -s
```

## 所有参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-i, --input` | **必需**，输入文件或目录路径 | - |
| `-o, --output` | 输出目录路径 | 与输入文件同目录 |
| `-q, --quality` | JPG 输出质量 (1-100) | 90 |
| `-d, --delete-original` | 转换成功后删除原 HEIC 文件 | False |
| `-t, --threads` | 多线程转换的线程数 | 4 |
| `--max-size` | 限制图片最大尺寸（等比缩放，单位：px） | 不限制 |
| `--no-rotate` | 禁用根据 EXIF 自动旋转图片 | False |
| `--no-recursive` | 不递归查找子目录中的文件 | False |
| `--no-structure` | 不保留目录结构，所有文件输出到同一目录 | False |
| `--preview` | 预览模式，只显示待转换文件列表 | False |
| `--report` | 生成转换报告的 JSON 文件路径 | 不生成 |
| `--watch` | 监控文件夹模式，常驻进程自动转换新文件 | False |
| `--watermark` | 添加文字水印内容 | 无 |
| `--watermark-date` | 添加拍摄日期作为水印（优先使用EXIF日期） | False |
| `--watermark-position` | 水印位置：top-left/top-right/bottom-left/bottom-right | bottom-right |
| `-s, --silent` | 静默模式，减少输出信息 | False |

## 项目结构

```
heic2jpg/
├── heic2jpg.py          # 主入口文件，命令行参数解析
├── converter.py         # 核心转换逻辑
├── file_scanner.py      # 文件扫描和路径处理
├── batch_converter.py   # 批量转换和多线程处理
├── folder_watcher.py    # 文件夹监控功能
├── requirements.txt     # Python 依赖
└── README.md            # 使用说明
```

## 模块说明

### converter.py
核心转换模块，负责：
- HEIC 文件读取
- EXIF 信息提取和保留
- 根据 EXIF 方向自动旋转图片
- JPG 质量控制
- 图片尺寸调整
- 文字水印添加

### file_scanner.py
文件扫描模块，负责：
- 递归或非递归查找 HEIC 文件
- 处理大小写扩展名（.heic, .HEIC, .heif）
- 计算输出路径，支持保留目录结构

### batch_converter.py
批量转换模块，负责：
- 多线程转换任务调度
- 转换结果收集和统计
- 生成转换报告（控制台和JSON）

### folder_watcher.py
文件夹监控模块，负责：
- 使用 watchdog 监控文件系统事件
- 防抖动处理（避免文件未写入完成就开始转换）
- 自动转换新添加的 HEIC 文件

## 转换报告格式

使用 `--report` 参数生成的 JSON 报告格式如下：

```json
{
  "summary": {
    "total": 10,
    "success": 9,
    "failed": 1,
    "total_time_seconds": 12.345,
    "generated_at": "2024-01-15T10:30:00.123456"
  },
  "results": [
    {
      "input": "/path/to/photo1.heic",
      "output": "/path/to/photo1.jpg",
      "success": true,
      "error": null,
      "duration_seconds": 1.234
    },
    {
      "input": "/path/to/photo2.heic",
      "output": "/path/to/photo2.jpg",
      "success": false,
      "error": "错误信息...",
      "duration_seconds": 0.001
    }
  ]
}
```

## 注意事项

1. **文件备份**：使用 `-d` 参数删除原文件前，建议先备份重要文件
2. **线程数**：线程数建议设置为 CPU 核心数，过高可能导致内存占用过大
3. **质量参数**：质量 90 以上视觉差异很小，但文件体积会显著增加
4. **监控模式**：监控模式会持续运行，按 `Ctrl+C` 退出
5. **水印字体**：水印使用系统字体，macOS 默认为 Arial，其他系统可能需要调整

## 常见问题

**Q: 转换后的图片颜色偏色怎么办？**
A: HEIC 文件可能包含特殊的色彩配置文件，目前工具已自动处理大多数情况。如遇问题，可尝试升级 pillow-heif 版本。

**Q: 能否转换为其他格式（如 PNG）？**
A: 当前版本只支持 JPG 输出。如需支持其他格式，可修改 `converter.py` 中的保存逻辑。

**Q: 监控模式检测不到新文件？**
A: 确保监控目录正确，某些网络文件系统可能不支持文件系统事件监控。

## License

MIT License
