# Flask爬虫调度服务 - 测试报告

## 测试环境
- 测试日期: 2026-05-27
- 服务地址: http://127.0.0.1:5001
- 测试工具: Python脚本自动化测试 + 浏览器手动验证

---

## 测试用例总览

| 测试编号 | 测试项目 | 测试结果 |
|---------|---------|---------|
| TC01 | 默认超时时间设置 | ✅ 通过 |
| TC02 | 基础爬取（无关键词过滤） | ✅ 通过 |
| TC03 | 关键词过滤 - 匹配关键词 | ✅ 通过 |
| TC04 | 关键词过滤 - 不匹配关键词 | ✅ 通过 |
| TC05 | 任务暂停功能 | ✅ 通过 |
| TC06 | 任务恢复功能 | ✅ 通过 |
| TC07 | 任务取消功能 | ✅ 通过 |
| TC08 | 结果搜索功能 | ✅ 通过 |
| TC09 | HTML文件保存功能 | ✅ 通过 |
| TC10 | JSON导出功能 | ✅ 通过 |
| TC11 | CSV导出功能 | ✅ 通过 |
| TC12 | 域名限定功能 | ✅ 通过 |
| TC13 | URL去重功能 | ✅ 通过 |

---

## 详细测试用例

### TC01: 默认超时时间设置

**测试目标**: 验证默认超时时间已从15秒修改为30秒

**修改文件**:
- [app.py](file:///Users/mac/code/solo%20coder/96/app.py#L36) - 后端默认值
- [new_task.html](file:///Users/mac/code/solo%20coder/96/templates/new_task.html#L34) - 表单默认值
- [new_schedule.html](file:///Users/mac/code/solo%20coder/96/templates/new_schedule.html#L37) - 定时任务表单

**测试步骤**:
1. 访问新建任务页面 `/new`
2. 查看超时时间输入框的默认值

**测试结果**: ✅ 通过
- 表单默认值显示为 30 秒
- 后端处理代码默认值为 30 秒

---

### TC02: 基础爬取（无关键词过滤）

**测试目标**: 验证基础爬虫功能正常工作

**测试参数**:
- URL: https://example.com
- 深度: 1
- 超时: 30秒
- 关键词: 无

**测试步骤**:
1. 提交爬取任务
2. 等待任务完成
3. 检查爬取结果

**测试结果**: ✅ 通过
- 任务状态: completed
- 爬取页面数: 1
- 页面标题: "Example Domain"
- 页面URL: https://example.com

---

### TC03: 关键词过滤 - 匹配关键词

**测试目标**: 验证当内容包含关键词时页面会被保存

**测试参数**:
- URL: https://example.com
- 深度: 1
- 关键词: "Example"

**测试步骤**:
1. 提交带有关键词的爬取任务
2. 等待任务完成
3. 检查结果数量

**测试结果**: ✅ 通过
- 匹配页面数: 1
- 页面内容包含 "Example"，正确被保存

---

### TC04: 关键词过滤 - 不匹配关键词

**测试目标**: 验证当内容不包含关键词时页面会被过滤掉

**测试参数**:
- URL: https://example.com
- 深度: 1
- 关键词: "XYZNotFound123" (example.com不存在的词)

**测试步骤**:
1. 提交带有不存在关键词的爬取任务
2. 等待任务完成
3. 检查结果数量

**测试结果**: ✅ 通过
- 匹配页面数: 0
- 无匹配页面被正确过滤，结果为空

---

### TC05: 任务暂停功能

**测试目标**: 验证运行中的任务可以被暂停

**测试参数**:
- URL: https://example.com
- 深度: 2
- 爬取间隔: 3秒（确保有时间暂停）

**测试步骤**:
1. 提交爬取任务
2. 等待任务开始运行
3. 调用暂停API
4. 检查任务状态

**测试结果**: ✅ 通过
- 暂停前状态: running
- 暂停操作: 成功 (success: true)
- 暂停后状态: paused

**相关代码**:
- [crawler.py](file:///Users/mac/code/solo%20coder/96/crawler.py#L337-L347) - 暂停状态更新修复

---

### TC06: 任务恢复功能

**测试目标**: 验证暂停的任务可以被恢复

**测试步骤**:
1. 确保任务处于暂停状态
2. 调用恢复API
3. 检查任务状态

**测试结果**: ✅ 通过
- 恢复前状态: paused
- 恢复操作: 成功 (success: true)
- 恢复后状态: running

---

### TC07: 任务取消功能

**测试目标**: 验证运行中的任务可以被取消

**测试步骤**:
1. 确保任务处于运行状态
2. 调用取消API
3. 检查任务状态

**测试结果**: ✅ 通过
- 取消前状态: running
- 取消操作: 成功 (success: true)
- 取消后状态: cancelled

---

### TC08: 结果搜索功能

**测试目标**: 验证在已爬取结果中搜索关键词功能正常

**测试数据**:
- 已有爬取页面: Example Domain

**测试步骤**:
1. 搜索存在的关键词 "Example"
2. 搜索不存在的关键词 "XYZNotFound"
3. 对比搜索结果

**测试结果**: ✅ 通过
- 搜索 "Example": 找到 1 个结果
- 搜索 "XYZNotFound": 找到 0 个结果
- 搜索功能正确区分匹配和不匹配的内容

**相关代码**:
- [task_manager.py](file:///Users/mac/code/solo%20coder/96/task_manager.py#L173-L184) - search_results方法
- [app.py](file:///Users/mac/code/solo%20coder/96/app.py#L118-L128) - 搜索路由

---

### TC09: HTML文件保存功能

**测试目标**: 验证爬取页面可以保存为本地HTML文件

**测试参数**:
- URL: https://example.com
- 保存HTML: 启用
- 保存目录: crawled_pages/

**测试步骤**:
1. 提交启用保存HTML的任务
2. 等待任务完成
3. 检查 crawled_pages 目录

**测试结果**: ✅ 通过
- 目录文件数: 1
- 示例文件: c984d06aafbecf6b_index.html
- 文件成功保存到本地目录

**相关代码**:
- [crawler.py](file:///Users/mac/code/solo%20coder/96/crawler.py#L210-L222) - _save_html_file方法

---

### TC10: JSON导出功能

**测试目标**: 验证爬取结果可以导出为JSON格式

**测试步骤**:
1. 获取已完成任务的ID
2. 访问导出JSON的URL
3. 检查响应状态和内容

**测试结果**: ✅ 通过
- 响应状态码: 200
- 内容类型: application/json
- 包含完整的任务信息和爬取结果

**相关代码**:
- [app.py](file:///Users/mac/code/solo%20coder/96/app.py#L130-L143) - export_json路由

---

### TC11: CSV导出功能

**测试目标**: 验证爬取结果可以导出为CSV格式

**测试步骤**:
1. 获取已完成任务的ID
2. 访问导出CSV的URL
3. 检查响应状态和内容

**测试结果**: ✅ 通过
- 响应状态码: 200
- 内容类型: text/csv; charset=utf-8-sig
- CSV包含表头和所有爬取数据

**相关代码**:
- [app.py](file:///Users/mac/code/solo%20coder/96/app.py#L145-L168) - export_csv路由

---

### TC12: 域名限定功能

**测试目标**: 验证爬虫不会爬取目标域名以外的网站

**测试参数**:
- URL: https://example.com
- 深度: 2

**测试步骤**:
1. 提交爬取任务
2. 等待任务完成
3. 检查所有爬取结果的URL域名

**测试结果**: ✅ 通过
- 所有爬取的URL都包含 "example.com"
- 没有外部域名的页面被爬取

**相关代码**:
- [crawler.py](file:///Users/mac/code/solo%20coder/96/crawler.py#L147-L154) - _is_same_domain方法

---

### TC13: URL去重功能

**测试目标**: 验证同一个URL不会被重复爬取

**测试步骤**:
1. 提交爬取任务
2. 等待任务完成
3. 检查结果中是否有重复的URL

**测试结果**: ✅ 通过
- 结果列表中所有URL都是唯一的
- URL数量 = 唯一URL数量

**相关代码**:
- [crawler.py](file:///Users/mac/code/solo%20coder/96/crawler.py#L253-L258) - 哈希+URL双重去重

---

## Bug修复记录

### Bug: 暂停后状态被覆盖为running

**问题描述**: 调用暂停API后，任务状态立即恢复为running，因为爬虫的 _update_progress 方法每次都会强制设置为 running。

**修复方案**:
修改 [crawler.py](file:///Users/mac/code/solo%20coder/96/crawler.py#L337-L347) 中的 _update_progress 方法，在更新状态前检查是否已暂停或已取消：

```python
# 修复前
self._update_status('running', progress=progress)

# 修复后
if self.is_paused:
    self._update_status('paused', progress=progress)
elif not self.is_cancelled:
    self._update_status('running', progress=progress)
```

**修复效果**: 暂停后状态正确显示为 paused，不再被覆盖。

---

## 测试总结

### 测试通过率: 13/13 (100%)

### 功能验证完成:
1. ✅ 基础爬虫功能
2. ✅ 关键词过滤
3. ✅ 任务控制（暂停/恢复/取消）
4. ✅ 结果搜索
5. ✅ 数据导出（JSON/CSV）
6. ✅ HTML文件保存
7. ✅ 域名限定
8. ✅ URL去重
9. ✅ 超时设置

### 服务访问地址:
- 首页: http://127.0.0.1:5001/
- 新建任务: http://127.0.0.1:5001/new
- 任务列表: http://127.0.0.1:5001/tasks
- 定时任务: http://127.0.0.1:5001/schedules

### 自动化测试:
运行 `python test_crawler.py` 即可执行完整的自动化测试。
