# 焊线参数与连接可靠性复盘工具 (Wire Bond Review Tool)

微电子封装车间焊线工艺参数分析与连接可靠性复盘的本地Python工具。

## 功能特性

- 📥 **数据导入** - 导入焊线参数CSV、拉力测试数据、机器档案、工艺窗口
- 🔍 **工艺检查** - 检查参数偏离工艺窗口、拉力分布异常、跨工位一致性
- 📊 **相关性分析** - 分析焊线参数与拉力的相关性，识别关键影响因素
- 🔬 **失效模式聚类** - 按失效模式聚类晶圆，识别共性问题
- 🎯 **参数预测** - 基于历史数据给出参数调整建议，优化拉力
- 🏭 **机器维护排名** - 按机器状态给出维护优先级排序
- 📋 **报告导出** - 导出Markdown月度复盘、CSV异常台账、HTML相关性热力图

## 处理场景

- ✅ 跨芯片型号工艺差异
- ✅ 紧急换金线的过渡批次
- ✅ 跨季节车间洁净度影响
- ✅ 机器键合刀磨损监测
- ✅ 抽测代表性评估
- ✅ 跨班次工艺差异分析
- ✅ 特殊封装（多层堆叠）难度
- ✅ 新机器爬坡期监控

## 性能要求

- 1000晶圆数据处理时间 < 30秒

## 安装

```bash
cd wire_bond_review
pip install -e .
```

或

```bash
pip install -r requirements.txt
```

## 快速开始

### 完整分析流程（推荐）

```bash
wire-bond full-analysis sample/bonding_params.csv sample/pull_tests.csv \
  --machine-profiles sample/machine_profiles.csv \
  --process-windows sample/process_windows.csv \
  --output-dir ./output
```

### 分步使用

#### 1. 导入数据

```bash
wire-bond import-data sample/bonding_params.csv sample/pull_tests.csv \
  --machine-profiles sample/machine_profiles.csv \
  --process-windows sample/process_windows.csv \
  --output dataset.pkl
```

#### 2. 工艺检查

```bash
wire-bond check dataset.pkl --wafer-id W001 --output check_result.json
```

#### 3. 相关性分析

```bash
wire-bond corr dataset.pkl --output correlation.json
```

#### 4. 聚类分析

```bash
wire-bond cluster dataset.pkl --n-clusters 4 --output cluster.json
```

#### 5. 参数预测建议

```bash
wire-bond predict dataset.pkl --wafer-id W001 --output prediction.json
```

#### 6. 机器维护排名

```bash
wire-bond rank dataset.pkl --top 10 --output ranking.json
```

#### 7. 导出报告

```bash
wire-bond export dataset.pkl \
  --markdown report.md \
  --csv anomalies.csv \
  --html correlation.html
```

## 数据格式

### 焊线参数 CSV (bonding_params.csv)

| 字段 | 说明 | 示例 |
|------|------|------|
| wafer_id | 晶圆ID | W001 |
| chip_model | 芯片型号 | CHIP_A |
| machine_id | 机器ID | M01 |
| station_id | 工位ID | S01 |
| operator | 操作员 | John |
| shift | 班次 | morning/afternoon/night |
| batch_id | 批次ID | BATCH_001 |
| wire_batch | 金线批次 | WIRE_001 |
| package_type | 封装类型 | standard/stacked/sip/fanout |
| timestamp | 时间戳 | 2024-01-15T08:30:00 |
| power | 功率 | 150 |
| time_us | 时间(us) | 25 |
| force_grams | 压力(g) | 50 |
| temp_celsius | 温度(°C) | 180 |
| is_ramping | 是否爬坡期 | False |
| cleanliness_level | 洁净度等级 | 8 |
| tool_wear_hours | 刀头使用小时 | 120.5 |

### 拉力测试 CSV (pull_tests.csv)

| 字段 | 说明 | 示例 |
|------|------|------|
| wafer_id | 晶圆ID | W001 |
| test_id | 测试ID | T001 |
| wire_id | 金线ID | W001_01 |
| pull_force_grams | 拉力(g) | 8.5 |
| failure_mode | 失效模式 | no_failure/ball_lift/wire_break/heel_break/pad_damage |
| is_sampling | 是否抽测 | False |
| test_timestamp | 测试时间 | 2024-01-15T10:00:00 |

### 机器档案 CSV (machine_profiles.csv)

| 字段 | 说明 |
|------|------|
| machine_id | 机器ID |
| station_id | 工位ID |
| install_date | 安装日期 |
| total_bonds | 总键合数 |
| last_maintenance_date | 上次维护日期 |
| capillaries_used | 已使用刀头数 |
| current_capillary_hours | 当前刀头使用小时 |
| is_new_machine | 是否新机器 |
| ramp_up_start_date | 爬坡开始日期 |

### 工艺窗口 CSV (process_windows.csv)

| 字段 | 说明 |
|------|------|
| chip_model | 芯片型号 |
| power_min/max | 功率上下限 |
| time_min/max | 时间上下限 |
| force_min/max | 压力上下限 |
| temp_min/max | 温度上下限 |
| pull_force_spec | 拉力规格 |
| pull_force_lower_limit | 拉力下限 |

## 项目结构

```
wire_bond_review/
├── wire_bond_review/
│   ├── __init__.py          # 版本信息
│   ├── models.py            # 数据模型定义
│   ├── parser.py            # 数据解析器
│   ├── checker.py           # 工艺检查器
│   ├── correlation.py       # 相关性分析
│   ├── cluster.py           # 聚类分析
│   ├── predictor.py         # 参数预测器
│   ├── ranker.py            # 机器排名
│   ├── reporter.py          # 报告生成
│   └── cli.py               # 命令行接口
├── sample/                   # 示例数据
│   ├── bonding_params.csv
│   ├── pull_tests.csv
│   ├── machine_profiles.csv
│   └── process_windows.csv
├── tests/                    # 测试用例
│   ├── test_models.py
│   ├── test_parser.py
│   ├── test_checker.py
│   └── conftest.py
├── setup.py
├── requirements.txt
├── pytest.ini
└── README.md
```

## 运行测试

```bash
pytest tests/ -v
```

或带覆盖率：

```bash
pytest tests/ --cov=wire_bond_review --cov-report=term-missing
```

## 技术栈

- **数据处理**: pandas, numpy, scipy
- **机器学习**: scikit-learn (KMeans, RandomForest)
- **CLI**: click
- **报告生成**: jinja2, Chart.js (HTML)
- **测试**: pytest

## 核心算法

### 工艺检查
- 参数偏离：超出工艺窗口±σ检测
- 拉力异常：3σ原则检测异常值
- 一致性：工位间方差分析ANOVA

### 相关性分析
- Pearson相关系数
- P值显著性检验（* p<0.05, ** p<0.01, *** p<0.001）
- 多变量相关性矩阵

### 聚类分析
- K-Means聚类（手肘法确定最佳k）
- 特征：平均拉力、拉力标准差、工艺参数、失效模式分布
- 轮廓系数评估聚类质量

### 参数优化
- 随机森林回归预测拉力
- 网格搜索最优参数组合
- 特征重要性排序

## License

MIT
