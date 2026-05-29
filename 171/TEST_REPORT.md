# 股票投资组合管理系统 - 测试与验证报告

## 测试环境说明

由于系统终端环境存在技术问题 (`code:5999 terminal is disposed`)，测试需手动在您的终端中执行。

---

## 本次修复内容汇总

### 已修复的 Bug（共 7 个）

| # | 文件 | 问题描述 | 修复方式 |
|---|------|----------|----------|
| 1 | [price_fetcher.py](file:///Users/mac/code/solo%20coder/171/stock_portfolio/price_fetcher.py#L57-L71) | **严重 Bug**：`fetch_from_sina` 中 `original_code = stock_codes[i]` 索引错位，导致股票代码与价格不匹配 | 添加 `code_to_symbol` 字典，通过 symbol 反向查找原始代码 |
| 2 | [exporter.py](file:///Users/mac/code/solo%20coder/171/stock_portfolio/exporter.py#L73-L79) | `format_number` 中 `n > 999` 条件错误影响千分位格式化 | 移除该条件，仅保留 NaN 检查 |
| 3 | [cli.py](file:///Users/mac/code/solo%20coder/171/stock_portfolio/cli.py#L396-L407) | `cmd_price` 未对输入代码做规范化，`600519` 查询失败 | 添加 `normalize_stock_code()` 调用 |
| 4 | [test_e2e.py](file:///Users/mac/code/solo%20coder/171/test_e2e.py#L17-L42) | `setup_test_db()` 被调用两次导致测试数据丢失 | 修复为单次调用，保存原始函数引用 |
| 5 | [test_e2e.py](file:///Users/mac/code/solo%20coder/171/test_e2e.py#L463-L533) | CLI 测试直接修改 `sys.argv/stdout` 导致测试间污染 | 每个测试前后保存/恢复状态 |
| 6 | [test_e2e.py](file:///Users/mac/code/solo%20coder/171/test_e2e.py#L359-L389) | 快照测试使用当日日期与更新测试冲突 | 改用固定日期 `2024-12-01` / `2024-12-02` |
| 7 | [test_e2e.py](file:///Users/mac/code/solo%20coder/171/test_e2e.py#L342-L357) | 交易记录导入到已有持仓组合可能失败 | 使用独立"交易导入测试"组合 |

---

## 运行测试指南

### 第一步：安装依赖

```bash
cd "/Users/mac/code/solo coder/171"
pip3 install -r requirements.txt
```

### 第二步：运行完整测试套件

**推荐方式 - 一键运行：**

```bash
python3 run_full_test.py
```

**或单独运行端到端测试：**

```bash
python3 test_e2e.py
```

### 第三步：功能验证命令

```bash
# 查看帮助
python3 portfolio_manager.py --help

# 创建投资组合
python3 portfolio_manager.py create-portfolio --name A股 --description "测试账户"

# 添加持仓
python3 portfolio_manager.py add --portfolio A股 --code 600519 --shares 100 --price 1800 --name "贵州茅台"

# 查看持仓
python3 portfolio_manager.py view --portfolio A股 --chart --pnl

# 查询 600519 实时股价
python3 portfolio_manager.py price --code 600519

# 导出报告
python3 portfolio_manager.py export-csv --portfolio A股 --output .
python3 portfolio_manager.py export-html --portfolio A股 --output .

# 导入雪球CSV
python3 portfolio_manager.py import-csv --portfolio A股 --file sample_xueqiu.csv

# 创建资产快照
python3 portfolio_manager.py snapshot --portfolio A股 --cash 50000

# 查看资产曲线
python3 portfolio_manager.py curve --portfolio A股 --days 30
```

---

## 测试内容明细

### test_e2e.py - 35个测试用例

| 阶段 | 测试项 | 说明 |
|------|--------|------|
| 语法检查 | 所有文件语法正确 | AST 解析验证 |
| 模块导入 | 所有模块可导入 | 11个核心模块 |
| 数据库 | 数据库初始化成功 | SQLite 文件创建 |
| 代码规范化 | 股票代码规范化 | 7种格式验证 |
| 股价查询 | 获取600519实时股价 | 网络容错 |
| 投资组合 | 创建投资组合 | CRUD 操作 |
| | 列出投资组合 | |
| | 添加持仓 | |
| | 累加持仓（加仓） | |
| | 卖出持仓 | |
| | 查看交易记录 | |
| | 已实现盈亏统计 | |
| | 设置止盈止损 | |
| | 删除投资组合 | |
| | 多投资组合支持 | |
| 分红送股 | 记录现金分红 | 成本自动调整 |
| | 记录拆股 | |
| | 记录送股 | |
| | 检查预警 | |
| 导出功能 | 导出CSV报告 | |
| | 导出HTML报告 | |
| | 导出交易记录CSV | |
| 导入功能 | 导入雪球CSV持仓 | |
| | 导入交易记录CSV | |
| 资产快照 | 创建资产快照 | |
| | 快照更新（同日覆盖） | |
| | 资产增长分析 | |
| | 导出快照CSV | |
| 图表 | ASCII饼图 | |
| | ASCII曲线图 | |
| | ASCII曲线图（零值） | 边界测试 |
| | 简单柱状图 | |
| CLI接口 | CLI --help | |
| | CLI 创建投资组合 | |
| | CLI 添加持仓 | |
| | CLI 列出投资组合 | |
| | CLI 查看交易记录 | |

### run_full_test.py - 集成测试

- 依赖检查
- 35个测试用例完整执行
- 600519 股价查询专项测试
- 12项核心功能验证
- 5项CLI命令验证

---

## 600519 股票代码查询说明

### 数据流

```
用户输入 "600519"
    ↓
normalize_stock_code("600519") → "SH600519"
    ↓
get_sina_symbol("SH600519") → "sh600519"
    ↓
新浪API: https://hq.sinajs.cn/list=sh600519
    ↓
返回数据解析 → {name, current, prev_close, ...}
```

### 双数据源备份

1. **主数据源**：新浪财经 API (hq.sinajs.cn)
2. **备用数据源**：腾讯财经 API (qt.gtimg.cn)

如果新浪返回空或失败，自动切换到腾讯。

---

## 项目文件结构

```
/Users/mac/code/solo coder/171/
├── portfolio_manager.py          # 主入口
├── requirements.txt              # 依赖列表
├── sample_xueqiu.csv             # 雪球格式示例
├── sample_transactions.csv       # 交易记录示例
├── run_full_test.py              # ✨ 一键测试脚本
├── test_e2e.py                   # 35个端到端测试
├── auto_test_runner.py           # 自动测试执行器
├── run_tests.py                  # 测试运行器
└── stock_portfolio/
    ├── database.py               # SQLite 数据库层
    ├── price_fetcher.py          # 股价获取（新浪/腾讯）
    ├── portfolio.py              # 投资组合与持仓
    ├── transactions.py           # 交易与盈亏计算
    ├── corporate_actions.py      # 分红/送股/拆股
    ├── alerts.py                 # 止盈止损预警
    ├── charts.py                 # ASCII 图表
    ├── exporter.py               # CSV/HTML 导出
    ├── importer.py               # 雪球/同花顺导入
    ├── snapshots.py              # 资产快照
    └── cli.py                    # 命令行接口
```

---

## 预期测试结果

| 测试类型 | 预期结果 | 备注 |
|---------|----------|------|
| test_e2e.py | 35/35 通过 | 网络测试可能跳过 |
| 600519 股价查询 | PASS | 交易时段有实时数据 |
| CLI 命令 | 全部通过 | |
| CSV 导出 | 文件生成正确 | |
| HTML 导出 | 包含完整数据 | |
| CSV 导入 | 持仓数量正确 | |

---

## 常见问题

**Q: 股价查询返回 0 或空？**  
A: 可能是非交易时段或网络问题。系统会自动跳过该测试，不影响其他功能。

**Q: 测试数据会影响真实数据库吗？**  
A: 不会。测试使用临时目录 `/tmp/stock_test_xxx/`，完成后自动清理。

**Q: 如何查看真实数据？**  
A: 真实数据保存在 `~/.stock_portfolio/portfolio.db`。

---

## 核心功能清单

✅ **多投资组合管理** - A股/港股/美股独立管理  
✅ **实时股价获取** - 新浪+腾讯双数据源  
✅ **持仓管理** - 买入/卖出/成本计算  
✅ **盈亏统计** - 已实现/未实现/胜率/盈亏比  
✅ **分红送股** - 现金分红/送股/拆股/配股，自动调成本  
✅ **止盈止损** - 价格预警+醒目通知  
✅ **数据导出** - CSV/HTML 报告  
✅ **批量导入** - 雪球/同花顺格式  
✅ **资产快照** - 每日记录+资产曲线  
✅ **ASCII图表** - 饼图/曲线图/柱状图  
✅ **交易记录** - 完整历史+搜索过滤

---

**测试执行后请查看生成的日志文件：**
- `test_results.txt` - test_e2e 输出
- `test_execution_log.txt` - 功能测试日志
- `functional_test_results.txt` - CLI测试结果
