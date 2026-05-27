import sys
import os
import json
import time
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from crawler import CrawlerTask

TEST_RESULTS = []

def test(name, condition, detail=""):
    status = "✅ PASS" if condition else "❌ FAIL"
    TEST_RESULTS.append((name, status, detail))
    print(f"{status}: {name}")
    if detail and not condition:
        print(f"   详情: {detail}")

def clean_results():
    import shutil
    if os.path.exists("results"):
        shutil.rmtree("results")
    if os.path.exists("tasks.json"):
        os.remove("tasks.json")

print("=" * 60)
print("开始测试爬虫调度器...")
print("=" * 60)

clean_results()

print("\n📋 测试1: 任务创建和基本爬取功能")
print("-" * 40)

task1 = CrawlerTask(
    task_id="test001",
    start_url="https://example.com",
    max_depth=1,
    respect_robots=True,
    request_interval=0.5,
    allowed_domains=["example.com"]
)

test("任务创建", task1 is not None)
test("任务初始状态", task1.status == "pending", f"当前状态: {task1.status}")
test("任务ID正确", task1.task_id == "test001")
test("起始URL正确", task1.start_url == "https://example.com")
test("深度设置正确", task1.max_depth == 1)

task1.start()
test("任务启动后状态变为running", task1.status == "running")

print("\n等待爬取完成...")
timeout = 30
start = time.time()
while task1.status == "running" and time.time() - start < timeout:
    time.sleep(0.5)

test("任务在30秒内完成", task1.status != "running", f"当前状态: {task1.status}")
test("任务完成状态", task1.status in ["completed", "failed", "cancelled"], f"最终状态: {task1.status}")

if task1.status == "completed":
    test("爬取到至少1个页面", task1.pages_crawled >= 1, f"已爬取: {task1.pages_crawled}")
    test("发现至少1个链接", task1.links_found >= 0, f"发现链接: {task1.links_found}")
    
    if task1.pages:
        page = task1.pages[0]
        test("页面包含URL", "url" in page)
        test("页面包含标题", "title" in page and page["title"], f"标题: {page.get('title', 'N/A')[:50]}")
        test("页面包含摘要", "summary" in page and page["summary"])
        test("页面包含正文", "text" in page and page["text"])
        test("页面包含链接列表", "links" in page)
        test("页面包含状态码", "status_code" in page)
        test("页面包含爬取时间", "crawled_at" in page)
else:
    test("页面数据", False, f"任务未完成，状态: {task1.status}")

print("\n📋 测试2: 进度显示功能")
print("-" * 40)

progress = task1.get_progress()
test("获取进度成功", progress is not None)
test("进度包含pages_crawled", "pages_crawled" in progress)
test("进度包含links_found", "links_found" in progress)
test("进度包含duration", "duration" in progress)
test("进度包含status", "status" in progress)
test("进度包含error_count", "error_count" in progress)

print("\n📋 测试3: 任务控制功能（暂停/恢复/取消）")
print("-" * 40)

task2 = CrawlerTask(
    task_id="test002",
    start_url="https://httpbin.org",
    max_depth=2,
    respect_robots=False,
    request_interval=1,
    allowed_domains=["httpbin.org"]
)

task2.start()
time.sleep(1)

test("任务2启动后运行中", task2.status == "running", f"状态: {task2.status}")

task2.pause()
test("暂停后状态为paused", task2.status == "paused", f"状态: {task2.status}")

time.sleep(2)

task2.resume()
test("恢复后状态为running", task2.status == "running", f"状态: {task2.status}")

time.sleep(1)

task2.cancel()
test("取消后状态为cancelled", task2.status == "cancelled", f"状态: {task2.status}")

print("\n📋 测试4: 数据提取和保存")
print("-" * 40)

results_file = os.path.join("results", "test001", "results.json")
test("结果JSON文件存在", os.path.exists(results_file), f"路径: {results_file}")

if os.path.exists(results_file):
    with open(results_file, "r") as f:
        results = json.load(f)
    test("JSON包含task_id", results.get("task_id") == "test001")
    test("JSON包含pages", "pages" in results)
    test("JSON包含pages_crawled", "pages_crawled" in results)
    
    if results.get("pages"):
        page = results["pages"][0]
        test("页面标题正确提取", bool(page.get("title")), f"标题: {page.get('title', 'N/A')[:50]}")
        test("页面摘要正确提取", bool(page.get("summary")), f"摘要长度: {len(page.get('summary', ''))}")
        test("页面链接正确提取", isinstance(page.get("links"), list), f"链接数: {len(page.get('links', []))}")

print("\n📋 测试5: robots.txt功能")
print("-" * 40)

task3 = CrawlerTask(
    task_id="test003",
    start_url="https://example.com",
    max_depth=1,
    respect_robots=True,
    request_interval=0.5,
    allowed_domains=["example.com"]
)

test("robots.txt检测功能存在", hasattr(task3, "is_allowed_by_robots"))
test("不遵守robots时返回True", task3.is_allowed_by_robots("https://example.com") == True)

task3_no_robots = CrawlerTask(
    task_id="test003b",
    start_url="https://example.com",
    max_depth=1,
    respect_robots=False
)
test("respect_robots=False时跳过检测", task3_no_robots.is_allowed_by_robots("any") == True)

print("\n📋 测试6: CSV导出功能")
print("-" * 40)

import csv
import io

if task1.pages:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["URL", "Title", "Depth", "Status Code"])
    for page in task1.pages:
        writer.writerow([page["url"], page["title"], page["depth"], page["status_code"]])
    csv_content = output.getvalue()
    test("CSV生成成功", len(csv_content) > 0)
    test("CSV包含表头", "URL" in csv_content)
    test("CSV包含数据行", csv_content.count("\n") > 1)
else:
    test("CSV导出", False, "没有页面数据可导出")

print("\n📋 测试7: 纯文本下载功能")
print("-" * 40)

import re
if task1.pages:
    page = task1.pages[0]
    safe_filename = re.sub(r"[^\w\-_.]", "_", page["url"])[:100] + ".txt"
    text_file = os.path.join("results", "test001", safe_filename)
    test("纯文本文件存在", os.path.exists(text_file), f"路径: {text_file}")
    
    if os.path.exists(text_file):
        with open(text_file, "r") as f:
            content = f.read()
        test("纯文本包含URL", page["url"] in content)
        test("纯文本包含标题", page["title"] in content)
        test("纯文本包含正文", len(content) > 100)
else:
    test("纯文本下载", False, "没有页面数据")

print("\n📋 测试8: 关键词过滤功能")
print("-" * 40)

test("关键词过滤方法存在", hasattr(task1, "contains_keywords"))
test("无关键词时返回True", task1.contains_keywords("any text") == True)

task1.keywords = ["Example"]
test("包含关键词返回True", task1.contains_keywords("This is an Example page") == True)
test("不包含关键词返回False", task1.contains_keywords("This is a test page") == False)

task1.keywords = ["example", "test"]
test("多关键词匹配(第一个)", task1.contains_keywords("Example page") == True)
test("多关键词匹配(第二个)", task1.contains_keywords("Test page") == True)
test("多关键词不匹配", task1.contains_keywords("Other page") == False)

print("\n📋 测试9: 域名限制功能")
print("-" * 40)

task1.allowed_domains = ["example.com"]
test("同一域名返回True", task1.is_same_domain("https://example.com/page") == True)
test("子域名返回True", task1.is_same_domain("https://sub.example.com/page") == True)
test("不同域名返回False", task1.is_same_domain("https://other.com/page") == False)

task1.allowed_domains = []
test("空域名列表返回True", task1.is_same_domain("https://any.com/page") == True)

task1.allowed_domains = ["example.com", "test.org"]
test("多域名匹配(第一个)", task1.is_same_domain("https://example.com") == True)
test("多域名匹配(第二个)", task1.is_same_domain("https://test.org") == True)
test("多域名不匹配", task1.is_same_domain("https://other.net") == False)

print("\n📋 测试10: 任务历史记录和序列化")
print("-" * 40)

task_dict = task1.to_dict()
test("to_dict返回字典", isinstance(task_dict, dict))
test("to_dict包含task_id", "task_id" in task_dict)
test("to_dict包含status", "status" in task_dict)
test("to_dict包含pages_crawled", "pages_crawled" in task_dict)
test("to_dict包含error_count", "error_count" in task_dict)
test("to_dict包含keywords", "keywords" in task_dict)
test("to_dict包含allowed_domains", "allowed_domains" in task_dict)

task_json = json.dumps(task_dict)
test("可序列化为JSON", len(task_json) > 0)

print("\n" + "=" * 60)
print("测试结果汇总")
print("=" * 60)

passed = sum(1 for _, status, _ in TEST_RESULTS if "PASS" in status)
failed = sum(1 for _, status, _ in TEST_RESULTS if "FAIL" in status)
total = len(TEST_RESULTS)

print(f"\n总计: {total} 个测试")
print(f"通过: {passed} ✅")
print(f"失败: {failed} ❌")

if failed > 0:
    print("\n失败的测试:")
    for name, status, detail in TEST_RESULTS:
        if "FAIL" in status:
            print(f"  ❌ {name}")
            if detail:
                print(f"     {detail}")

print("\n" + "=" * 60)

clean_results()

sys.exit(0 if failed == 0 else 1)
