# AI剧本对话生成器 - 完整验证指南

## 📋 验证项目清单

| 序号 | 验证项目 | 验证方式 | 状态 |
|------|---------|---------|------|
| 1 | API配置与连接 | 运行 `python configure_api.py setup` | ⬜ |
| 2 | 真实LLM对话生成 | 运行 `python main.py generate ...` | ⬜ |
| 3 | 多版本生成与选择 | 交互式选择测试 | ⬜ |
| 4 | 逐句修改功能 | 交互式编辑测试 | ⬜ |
| 5 | FDX格式导出 | `python validate_fdx.py` | ⬜ |
| 6 | Final Draft导入 | 专业软件测试 | ⬜ |
| 7 | 情感弧线图表 | 视觉检查 | ⬜ |
| 8 | 一键自动化验证 | `python run_full_verification.py` | ⬜ |

---

## 🚀 快速验证流程（推荐）

### 步骤1: 配置API密钥
```bash
python configure_api.py setup
```

按照提示输入：
- OpenAI API Key: `sk-xxxxxxxxxxxxxxxxxxxx`
- API Base URL: （默认 `https://api.openai.com/v1`，可留空）
- Model: （默认 `gpt-4o-mini`，可留空）

### 步骤2: 验证API连接
```bash
python configure_api.py test
```

预期输出：
```
  正在验证API连接... (模型: gpt-4o-mini)
  ✓ API连接验证成功，响应: ok
```

### 步骤3: 运行完整自动化验证
```bash
python run_full_verification.py
```

这个脚本会自动完成以下验证：
- ✅ API配置与连接测试
- ✅ 数据模型完整性
- ✅ TXT/JSON/FDX导出功能
- ✅ 情感弧线图表（含角色名和轮次）
- ✅ FDX格式规范验证
- ✅ 多版本选择功能
- ✅ 逐句修改功能
- ✅ **真实LLM对话生成**（2个版本，3-4轮）

验证完成后会生成报告：
```
./output/verification_report_YYYYMMDD_HHMMSS.log
```

### 步骤4: Final Draft格式验证
自动化脚本会生成FDX文件：
```
./output/llm_generated_YYYYMMDD_HHMMSS.fdx
```

**在Final Draft中验证：**
1. 打开Final Draft软件
2. 选择 `File` → `Open`
3. 选择上述FDX文件
4. 验证以下内容：
   - ✅ 场景标题正确显示（INT. 场景 - DAY）
   - ✅ 角色名居中显示
   - ✅ 情绪提示（Parenthetical）在角色和对话之间
   - ✅ 对话内容正确显示
   - ✅ 所有角色的对话都存在
   - ✅ 格式符合标准剧本格式

**截图保存：**
- Final Draft打开文件后的完整界面截图
- 保存到 `./screenshots/final_draft_import.png`

---

## 🔍 手动验证详细步骤

### 验证1: 交互式模式 - 多版本选择

```bash
python main.py
```

**输入示例：**
```
场景设定: 咖啡店内，男女初次相遇
角色1: 男主：内向，书呆子，喜欢物理
角色2: 女主：外向，风趣，喜欢艺术
最少轮数: 4
最多轮数: 5
版本数: 3
```

**验证点：**
- [ ] 生成前显示API连接验证成功
- [ ] 生成3个版本，每个版本有进度显示
- [ ] 显示版本对比表格，每列显示各版本的对话摘要
- [ ] 输入 `d1-2` 可以对比版本1和版本2
- [ ] 输入 `v3` 可以查看版本3的完整内容
- [ ] 输入 `2` 选择版本2
- [ ] 显示选中版本的完整剧本

### 验证2: 交互式模式 - 逐句修改

选择版本后，当询问"是否需要修改对话？"时输入 `y`

**验证点：**
- [ ] 显示编辑菜单（1-N 修改, a<行号> 插入, r<行号> 删除...）
- [ ] 输入 `2` 修改第2行：
  - [ ] 显示当前内容
  - [ ] 输入新角色名（如 "女主角"）
  - [ ] 输入新情绪标签（如 "俏皮地眨眼"）
  - [ ] 输入新对话内容（如 "嗨，书呆子，看什么呢？"）
  - [ ] 显示修改后的内容
- [ ] 输入 `a2` 在第2行后插入：
  - [ ] 角色名: "男主角"
  - [ ] 情绪标签: "惊讶地"
  - [ ] 对话内容: "啊...我在看一本关于量子物理的书"
- [ ] 输入 `p` 预览完整剧本
- [ ] 输入 `s` 保存修改
- [ ] 显示保存路径

### 验证3: 情感弧线图表

修改完成后，当询问"是否显示情感弧线分析图？"时输入 `y`

**验证点：**
- [ ] 显示情感弧线分析图
- [ ] 每个情感维度显示强度曲线
- [ ] 轮次行标注角色名（如 "小明:1  小红:2"）
- [ ] 对话明细区显示每句的主导情感和对话预览
- [ ] 显示情感热力图
- [ ] 显示情感摘要

### 验证4: FDX导出与Final Draft导入

当询问"请选择导出格式"时输入 `3` 选择FDX格式

**验证点：**
- [ ] 显示FDX导出成功
- [ ] 记录导出的文件路径
- [ ] 在Final Draft中打开该文件：
  - [ ] 文件能正常打开，无错误提示
  - [ ] 场景标题格式正确
  - [ ] 角色名、情绪提示、对话布局正确
  - [ ] 所有修改后的内容都正确显示

---

## 📝 验证证据收集

### 1. API配置验证
```bash
python configure_api.py status > screenshots/api_config.txt
python configure_api.py test >> screenshots/api_config.txt
```

### 2. 完整对话生成日志
```bash
# 非交互式生成测试
python main.py generate \
  --scene "咖啡店内，男女初次相遇" \
  --char1 "男主：内向，书呆子" \
  --char2 "女主：外向，风趣" \
  --min-turns 4 --max-turns 5 --versions 2 \
  2>&1 | tee screenshots/dialogue_generation.log
```

### 3. 验证报告
自动化验证脚本会自动生成：
```
./output/verification_report_YYYYMMDD_HHMMSS.log
```

### 4. Final Draft导入截图
- 打开Final Draft
- 导入生成的FDX文件
- 截图保存为 `./screenshots/final_draft_verification.png`

---

## ✅ 验证完成标准

所有以下项目都通过才算验证完成：

1. ✅ API配置完成，连接测试通过
2. ✅ 能成功调用真实LLM生成对话（非mock数据）
3. ✅ 多版本对比表格正确显示
4. ✅ 版本选择功能正常工作
5. ✅ 逐句修改功能：修改角色名、情绪、内容都生效
6. ✅ 插入和删除对话功能正常
7. ✅ 情感图表显示角色名和轮次
8. ✅ FDX文件通过 `validate_fdx.py` 验证（0错误）
9. ✅ FDX文件能在Final Draft中正确打开和显示
10. ✅ 所有导出格式（TXT/JSON/FDX）内容正确

---

## 🔧 常见问题

**Q: API连接失败怎么办？**
A: 检查：
   - API密钥是否正确
   - 网络连接是否正常
   - 是否需要配置代理
   - 账户余额是否充足

**Q: Final Draft无法打开FDX文件？**
A: 运行 `python validate_fdx.py your_file.fdx` 检查格式错误，
   或使用 `python run_full_verification.py` 重新生成。

**Q: 生成的对话内容为空？**
A: 检查LLM返回的JSON格式是否正确，可能需要调整prompt或更换模型。
