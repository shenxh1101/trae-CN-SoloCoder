# 音频批量淡入淡出处理工具

一个功能强大的命令行工具，用于批量给音频文件添加淡入淡出效果。

## 功能特性

- 🎵 支持 MP3、WAV、FLAC、OGG、M4A 等多种音频格式
- ⚡ 多线程处理，提高批量处理效率
- 🔍 预览模式，不实际修改文件，只显示将要处理的文件列表
- 💾 自动备份原文件到 .bak 后缀
- ⏱️ 支持只处理长度大于指定秒数的音频文件
- 🔄 支持输出为指定格式（如全部转为 MP3）
- 📝 处理完成后生成详细日志
- 🏷️ 支持将淡入淡出参数写入文件名作为标记
- 📁 支持单独处理一个文件或批量处理文件夹
- 🎧 测试模式，截取音频前后10秒生成测试样本供试听
- 🔊 音量归一化，统一将音量调整到指定水平

## 安装依赖

```bash
pip install -r requirements.txt
```

**注意**: pydub 需要安装 ffmpeg 才能正常工作：

- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt install ffmpeg`
- **Windows**: 下载 ffmpeg 并添加到 PATH

## 使用方法

### 基本用法

#### 处理整个文件夹
```bash
python audio_fader.py --folder /path/to/audio/folder
```

#### 处理单个文件
```bash
python audio_fader.py --file /path/to/audio/file.mp3
```

### 自定义淡入淡出时长

```bash
# 淡入2秒，淡出8秒
python audio_fader.py -f /path/to/folder --fade-in 2 --fade-out 8
```

### 预览模式（不实际处理）

```bash
python audio_fader.py -f /path/to/folder --preview
```

### 格式转换

```bash
# 全部转为 MP3 格式
python audio_fader.py -f /path/to/folder --output-format mp3

# 全部转为 WAV 格式
python audio_fader.py -f /path/to/folder --output-format wav
```

### 指定输出目录

```bash
python audio_fader.py -f /path/to/folder --output-dir /path/to/output
```

### 只处理长音频文件

```bash
# 只处理时长超过60秒的文件
python audio_fader.py -f /path/to/folder --min-duration 60
```

### 音量归一化

```bash
# 将音量归一化到 -14 dB
python audio_fader.py -f /path/to/folder --normalize -14
```

### 文件名标记

```bash
# 将淡入淡出参数写入文件名
python audio_fader.py -f /path/to/folder --include-params
```

### 测试模式

```bash
# 创建测试样本并播放
python audio_fader.py -f /path/to/folder --test
```

### 多线程处理

```bash
# 使用8个线程处理
python audio_fader.py -f /path/to/folder --threads 8
```

### 禁用备份

```bash
python audio_fader.py -f /path/to/folder --no-backup
```

### 综合示例

```bash
# 完整示例：处理文件夹，淡入3秒，淡出5秒，转为MP3，
# 只处理超过30秒的文件，音量归一化到-14dB，8线程
python audio_fader.py \
  --folder /path/to/music \
  --fade-in 3 \
  --fade-out 5 \
  --output-format mp3 \
  --min-duration 30 \
  --normalize -14 \
  --threads 8 \
  --include-params
```

## 所有参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--folder, -f` | 包含音频文件的文件夹路径 | - |
| `--file, -i` | 单独处理单个音频文件 | - |
| `--fade-in` | 淡入时长（秒） | 3.0 |
| `--fade-out` | 淡出时长（秒） | 5.0 |
| `--output-format` | 输出文件格式 (mp3/wav/flac/ogg) | 保持原格式 |
| `--output-dir` | 输出文件目录 | 原文件目录 |
| `--preview` | 预览模式，不实际处理 | False |
| `--backup/--no-backup` | 是否备份原文件 | True |
| `--min-duration` | 只处理大于该时长的文件（秒） | 0.0 |
| `--threads, -t` | 处理线程数 | 4 |
| `--include-params` | 将参数写入文件名 | False |
| `--test` | 测试模式，创建样本并播放 | False |
| `--normalize` | 音量归一化到指定 dB | None |
| `--log-dir` | 日志文件目录 | 当前目录 |

## 日志文件

每次运行都会在日志目录生成一个日志文件，格式为：
`audio_fader_YYYYMMDD_HHMMSS.log`

日志包含：
- 运行参数
- 每个文件的处理状态
- 错误信息
- 最终统计结果

## 常见问题

### Q: 提示找不到 ffmpeg？
A: 请确保已安装 ffmpeg 并添加到系统 PATH。

### Q: 处理某些文件失败？
A: 检查日志文件查看具体错误原因，可能是文件损坏或格式不支持。

### Q: 如何恢复备份文件？
A: 备份文件后缀为 `.bak`，删除原文件后将 `.bak` 重命名为原文件名即可。

## 许可证

MIT License
