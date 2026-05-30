# 🚀 AI会议总结工具 - 快速测试指南

## 📋 测试环境已就绪

- ✅ Python 3.13.2 (conda环境，使用 `python` 命令)
- ✅ openai SDK 已安装
- ✅ 所有功能代码已完成
- ✅ 57项单元测试全部通过

---

## 🎯 一键完成真实API测试 (3步)

### 第1步：获取 DeepSeek API Key (免费！)

访问: **https://platform.deepseek.com**

- 手机号注册，新用户送 **500万 token** (~¥8，足够测试)
- 左侧菜单 → API Keys → 创建新的 API Key
- 复制你的 Key (格式: `sk-xxxxxxxxxx`)

### 第2步：配置 API Key

```bash
# 编辑 .env 文件
nano .env

# 将第9行改为你的 Key:
# OPENAI_API_KEY=sk-your-real-key-here
```

或者直接用命令行临时设置：

```bash
export OPENAI_API_KEY=sk-your-real-key-here
export OPENAI_BASE_URL=https://api.deepseek.com/v1
export OPENAI_MODEL=deepseek-chat
```

### 第3步：运行真实API测试

```bash
# 运行完整的端到端测试
python test_llm_real.py
```

**这个脚本会自动完成以下6项测试：**

1. ✅ **API连通性测试** - 发个简单请求确认Key有效
2. ✅ **会议记录AI总结** - 完整的JSON响应解析
3. ✅ **结果保存测试** - Markdown/JSON/Excel 三种格式
4. ✅ **批量AI处理** - 3个会议文件批量总结
5. ✅ **对比报告生成** - 自动生成对比报告
6. ✅ **输出文件验证** - 确认所有文件正确生成

---

## 📝 预期输出示例

```
============================================================
   🚀 AI总结功能 - 真实API 端到端测试
============================================================

📋 API 配置:
  Key: sk-abcdef...1234
  Model: deepseek-chat
  Base URL: https://api.deepseek.com/v1

============================================================
【测试1】LLM 客户端初始化
============================================================
  ✓ 初始化成功
  ✓ 超时: 60s
  ✓ 重试: 3次

============================================================
【测试2】简单 API 连通性测试
============================================================
  ⏳ 发送测试请求...
  ✓ 响应: 测试通过
  ✓ 耗时: 1.23s

... 更多测试 ...

============================================================
   🎉 所有 AI 功能端到端测试通过!
============================================================

完整链路验证:
  ✅ API 初始化
  ✅ 请求发送
  ✅ 响应接收
  ✅ JSON 解析
  ✅ 数据提取
  ✅ 文件保存
  ✅ 批量处理
```

---

## 🔧 其他常用命令

```bash
# 单个文件 AI 总结
python main.py -i example_meeting.txt -o output/summary.md

# 查看详细调试日志
python main.py -i example_meeting.txt -v

# 批量 AI 处理 + 对比报告
python main.py -b batch_input/ -O output/ai_batch --comparison

# 并发批量处理 (4线程)
python main.py -b batch_input/ -O output/ai_batch --workers 4
```

---

## 🐛 问题排查

| 错误 | 解决方法 |
|------|---------|
| `API Key无效` | 检查 Key 是否正确复制 |
| `余额不足` | DeepSeek 新用户有免费额度，用完需要充值 |
| `超时` | 网络较慢，可增加 `--timeout 120` |
| `openai模块找不到` | 用 `python` 而不是 `python3` |
| `降级为关键词提取` | AI调用失败，检查 Key 和网络 |

---

## 📊 查看生成的文件

```bash
# 所有输出在 output 目录下
ls -la output/

# AI生成的单文件总结
output/ai_real_test.md
output/ai_real_test.json
output/ai_real_test.xlsx

# AI批量处理结果
output/ai_real_batch/
```

---

## 💡 使用其他 API 服务商

**OpenAI:**
```bash
OPENAI_API_KEY=sk-your-key \
OPENAI_MODEL=gpt-3.5-turbo \
python test_llm_real.py
```

**智谱AI GLM:**
```bash
OPENAI_API_KEY=your-glm-key \
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4 \
OPENAI_MODEL=glm-4 \
python test_llm_real.py
```

---

## ✅ 测试完成后验证

测试通过后，您将看到：
- `output/ai_real_test.md` - AI生成的会议摘要
- `output/ai_real_test.json` - JSON格式数据
- `output/ai_real_test.xlsx` - Excel格式汇总
- `output/ai_real_batch/` - 3个文件的AI总结结果
- `output/ai_real_batch/comparison_report.md` - 对比报告

祝测试顺利！🎉
