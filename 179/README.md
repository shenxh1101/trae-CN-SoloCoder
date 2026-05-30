# ✈️  旅行日记 (Travel Diary)

一个功能丰富的Python命令行旅行日记工具，帮助您记录每一段美好旅程。

## 🌟 功能特性

- **多用户支持** - 不同用户的数据存储在各自独立的文件夹中
- **旅行计划管理** - 创建、查看、更新和删除旅行计划
- **每日日记记录** - 记录每天的文字内容、心情、照片和位置坐标
- **开销追踪** - 按类别记录每日开销，支持7种开销类别
- **开销统计分析** - 总开销、日均开销、类别占比等详细统计
- **Markdown报告** - 一键生成精美的Markdown格式旅行报告
- **PDF导出** - 将报告导出为PDF格式（需安装额外依赖）
- **交互式地图** - 使用Leaflet生成带有路线和标记的HTML地图
- **数据导入导出** - 支持将旅行数据导出为Zip包，也可从Zip包导入
- **数据持久化** - 所有数据以JSON格式存储，易于备份和迁移

## 📦 安装

### 基础依赖（必需）

```bash
pip install click jinja2 python-dateutil
```

### PDF导出依赖（可选）

```bash
pip install markdown weasyprint
```

> **注意**: weasyprint在某些系统上可能需要额外安装系统依赖（如Pango、Cairo等）。

## 🚀 快速开始

### 1. 创建示例数据

```bash
python create_sample_data.py
```

这将创建一个示例用户 `traveler` 和一次东京之旅，包含5天的日记和开销记录。

### 2. 查看可用命令

```bash
python main.py --help
```

### 3. 查看用户列表

```bash
python main.py user list
```

### 4. 查看旅行列表

```bash
python main.py trip traveler list
```

### 5. 查看旅行日记

```bash
python main.py trip traveler show <TRIP_ID>
```

### 6. 查看开销统计

```bash
python main.py trip traveler stats <TRIP_ID>
```

### 7. 生成Markdown报告

```bash
python main.py trip traveler report <TRIP_ID>
```

### 8. 生成交互式地图

```bash
python main.py trip traveler map <TRIP_ID>
```

### 9. 导出用户数据

```bash
python main.py user export traveler
```

### 10. 导入数据

```bash
python main.py import <ZIP_FILE_PATH>
```

## 📖 完整命令参考

### 用户管理

| 命令 | 说明 |
|------|------|
| `python main.py user create <username> [--name NAME] [--email EMAIL]` | 创建新用户 |
| `python main.py user list` | 列出所有用户 |
| `python main.py user delete <username> [--yes]` | 删除用户 |
| `python main.py user export <username> [-o OUTPUT]` | 导出用户所有数据 |

### 旅行管理

| 命令 | 说明 |
|------|------|
| `python main.py trip <username> create --name NAME --destination DEST --start START --end END [--description DESC]` | 创建新旅行 |
| `python main.py trip <username> list` | 列出用户的所有旅行 |
| `python main.py trip <username> show <TRIP_ID>` | 显示旅行详情和日记 |
| `python main.py trip <username> update <TRIP_ID> [OPTIONS]` | 更新旅行信息 |
| `python main.py trip <username> delete <TRIP_ID> [--yes]` | 删除旅行 |
| `python main.py trip <username> export <TRIP_ID> [-o OUTPUT]` | 导出单个旅行 |

### 日记与开销

| 命令 | 说明 |
|------|------|
| `python main.py trip <username> add-diary <TRIP_ID> --date DATE --content CONTENT [OPTIONS]` | 添加日记 |
| `python main.py trip <username> add-expense <TRIP_ID> --date DATE --category CAT --amount AMOUNT [OPTIONS]` | 添加开销 |

### 报告与统计

| 命令 | 说明 |
|------|------|
| `python main.py trip <username> stats <TRIP_ID>` | 显示开销统计 |
| `python main.py trip <username> report <TRIP_ID> [--pdf] [-o OUTPUT]` | 生成报告 |
| `python main.py trip <username> map <TRIP_ID> [-o OUTPUT]` | 生成地图 |

### 其他

| 命令 | 说明 |
|------|------|
| `python main.py categories` | 列出所有开销类别 |
| `python main.py import <ZIP_PATH> [--overwrite]` | 导入数据 |

## 💰 开销类别

1. 餐饮 - 吃饭、饮品等
2. 住宿 - 酒店、民宿等
3. 交通 - 机票、车票、租车等
4. 门票 - 景点门票、活动门票等
5. 购物 - 纪念品、日用品等
6. 娱乐 - 游乐设施、演出等
7. 其他 - 不属于以上类别的开销

## 📂 数据存储结构

默认情况下，数据存储在 `~/.travel_diary/` 目录下：

```
~/.travel_diary/
└── data/
    └── users/
        └── <username>/
            ├── user.json          # 用户信息
            ├── trips.json         # 所有旅行数据
            ├── photos/
            │   └── <trip_id>/     # 该旅行的照片
            ├── reports/           # 生成的报告
            ├── maps/              # 生成的地图
            └── exports/           # 导出的Zip包
```

也可以通过指定 `base_dir` 参数来自定义数据存储位置。

## 🎯 使用示例

### 创建用户并开始新旅行

```bash
# 创建用户
python main.py user create zhangsan --name "张三" --email "zhangsan@example.com"

# 创建新旅行
python main.py trip zhangsan create \
  --name "2024云南之旅" \
  --destination "云南昆明-大理-丽江" \
  --start "2024-07-01" \
  --end "2024-07-10" \
  --description "云南10日深度游"

# 添加第一天日记
python main.py trip zhangsan add-diary <TRIP_ID> \
  --date "2024-07-01" \
  --content "今天抵达昆明长水机场，品尝了正宗的过桥米线..." \
  --mood "开心" \
  --location-name "昆明翠湖公园" \
  --lat 25.0572 \
  --lng 102.7047

# 添加开销
python main.py trip zhangsan add-expense <TRIP_ID> \
  --date "2024-07-01" \
  --category 餐饮 \
  --amount 68.0 \
  --description "过桥米线晚餐"
```

### 生成旅行总结

```bash
# 查看完整日记
python main.py trip zhangsan show <TRIP_ID>

# 查看开销统计
python main.py trip zhangsan stats <TRIP_ID>

# 生成报告（含PDF）
python main.py trip zhangsan report <TRIP_ID> --pdf

# 生成地图
python main.py trip zhangsan map <TRIP_ID>

# 导出数据备份
python main.py user export zhangsan
```

## 🧪 测试

运行语法检查：

```bash
python test_syntax.py
```

创建示例数据进行完整功能测试：

```bash
python create_sample_data.py
```

## 📝 代码结构

```
travel_diary/
├── __init__.py          # 包初始化
├── models.py            # 数据模型定义
├── storage.py           # 数据存储管理
├── manager.py           # 核心业务逻辑
├── report.py            # 报告生成器
├── map_generator.py     # Leaflet地图生成器
├── statistics.py        # 统计分析器
├── zip_utils.py         # Zip导入导出
└── cli.py               # 命令行接口
```

## 🔧 核心类说明

### models.py
- `User` - 用户信息
- `Trip` - 旅行计划，包含多个日记条目
- `DiaryEntry` - 每日日记，包含开销列表
- `Expense` - 单笔开销记录
- `Location` - 地理位置（经纬度）

### manager.py
- `DiaryManager` - 核心业务管理器，提供所有CRUD操作

### report.py
- `ReportGenerator` - 生成Markdown和PDF报告

### map_generator.py
- `MapGenerator` - 生成Leaflet交互式HTML地图

### statistics.py
- `StatisticsAnalyzer` - 提供详细的开销统计分析

### zip_utils.py
- `ZipManager` - 处理数据的Zip导入导出

## 📄 License

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！
