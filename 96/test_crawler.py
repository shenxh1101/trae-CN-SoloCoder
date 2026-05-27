#!/usr/bin/env python3
"""
爬虫调度服务功能测试脚本
"""

import requests
import time
import json
import os

BASE_URL = "http://127.0.0.1:5001"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def create_task(config):
    """创建爬取任务"""
    url = f"{BASE_URL}/new"
    data = {
        "url": config.get("url"),
        "max_depth": config.get("max_depth", 1),
        "crawl_interval": config.get("crawl_interval", 0),
        "timeout": config.get("timeout", 30),
        "keywords": config.get("keywords", ""),
        "allowed_domains": config.get("allowed_domains", ""),
    }
    if config.get("respect_robots"):
        data["respect_robots"] = "on"
    if config.get("save_html"):
        data["save_html"] = "on"
    
    resp = requests.post(url, data=data, allow_redirects=False)
    if resp.status_code == 302:
        redirect_url = resp.headers.get("Location", "")
        task_id = redirect_url.split("/")[-1]
        return task_id
    return None

def get_task_status(task_id):
    """获取任务状态"""
    url = f"{BASE_URL}/api/task/{task_id}/status"
    resp = requests.get(url)
    return resp.json() if resp.status_code == 200 else None

def get_task_results(task_id, keyword=""):
    """获取任务结果"""
    url = f"{BASE_URL}/task/{task_id}/results"
    if keyword:
        url += f"?q={keyword}"
    resp = requests.get(url)
    return resp.json() if resp.status_code == 200 else None

def pause_task(task_id):
    """暂停任务"""
    url = f"{BASE_URL}/task/{task_id}/pause"
    resp = requests.post(url)
    return resp.json().get("success", False)

def resume_task(task_id):
    """恢复任务"""
    url = f"{BASE_URL}/task/{task_id}/resume"
    resp = requests.post(url)
    return resp.json().get("success", False)

def cancel_task(task_id):
    """取消任务"""
    url = f"{BASE_URL}/task/{task_id}/cancel"
    resp = requests.post(url)
    return resp.json().get("success", False)

def wait_for_task(task_id, timeout=60, interval=1):
    """等待任务完成"""
    start = time.time()
    while time.time() - start < timeout:
        status = get_task_status(task_id)
        if status and status.get("status") in ["completed", "failed", "cancelled"]:
            return status
        time.sleep(interval)
    return None

def export_json(task_id):
    """导出JSON"""
    url = f"{BASE_URL}/task/{task_id}/export/json"
    resp = requests.get(url)
    return resp.status_code == 200, resp.content[:500] if resp.status_code == 200 else None

def export_csv(task_id):
    """导出CSV"""
    url = f"{BASE_URL}/task/{task_id}/export/csv"
    resp = requests.get(url)
    return resp.status_code == 200, resp.content[:500] if resp.status_code == 200 else None

def check_html_files():
    """检查crawled_pages目录"""
    path = "crawled_pages"
    if os.path.exists(path):
        files = os.listdir(path)
        return len(files), files[:5]
    return 0, []

def main():
    print("\n" + "#"*60)
    print("#  Flask爬虫调度服务 - 功能测试")
    print("#"*60)

    # 测试1: 基础爬取（不带关键词）
    print_section("测试1: 基础爬取 - 不带关键词过滤")
    task1_id = create_task({
        "url": "https://example.com",
        "max_depth": 1,
        "timeout": 30,
    })
    print(f"✓ 任务创建成功: {task1_id}")
    status = wait_for_task(task1_id)
    if status:
        print(f"✓ 任务状态: {status['status']}")
        results = get_task_results(task1_id)
        print(f"✓ 爬取页面数: {results['total']}")
        for r in results['results']:
            print(f"  - {r['title']} | {r['url']}")
    else:
        print("✗ 任务执行超时")

    # 测试2: 关键词过滤 - 匹配的关键词
    print_section("测试2: 关键词过滤 - 匹配的关键词 ('Example')")
    task2_id = create_task({
        "url": "https://example.com",
        "max_depth": 1,
        "timeout": 30,
        "keywords": "Example",
    })
    print(f"✓ 任务创建成功: {task2_id}")
    status = wait_for_task(task2_id)
    if status:
        results = get_task_results(task2_id)
        print(f"✓ 任务状态: {status['status']}")
        print(f"✓ 匹配关键词的页面数: {results['total']}")
        if results['total'] > 0:
            print("✓ 关键词过滤生效（找到匹配页面）")
        else:
            print("✗ 未找到匹配页面（可能关键词不对）")
    else:
        print("✗ 任务执行超时")

    # 测试3: 关键词过滤 - 不匹配的关键词
    print_section("测试3: 关键词过滤 - 不匹配的关键词 ('XYZNotFound123')")
    task3_id = create_task({
        "url": "https://example.com",
        "max_depth": 1,
        "timeout": 30,
        "keywords": "XYZNotFound123",
    })
    print(f"✓ 任务创建成功: {task3_id}")
    status = wait_for_task(task3_id)
    if status:
        results = get_task_results(task3_id)
        print(f"✓ 任务状态: {status['status']}")
        print(f"✓ 匹配关键词的页面数: {results['total']}")
        if results['total'] == 0:
            print("✓ 关键词过滤生效（无匹配页面被正确过滤）")
        else:
            print("✗ 过滤失败（不应有匹配页面）")
    else:
        print("✗ 任务执行超时")

    # 测试4: 保存HTML文件
    print_section("测试4: 保存爬取页面为HTML文件")
    task4_id = create_task({
        "url": "https://example.com",
        "max_depth": 1,
        "timeout": 30,
        "save_html": True,
    })
    print(f"✓ 任务创建成功: {task4_id}")
    status = wait_for_task(task4_id)
    if status:
        file_count, files = check_html_files()
        print(f"✓ 任务状态: {status['status']}")
        print(f"✓ crawled_pages目录文件数: {file_count}")
        if file_count > 0:
            print("✓ HTML文件保存功能正常")
            print(f"  示例文件: {files}")
        else:
            print("✗ HTML文件未保存")
    else:
        print("✗ 任务执行超时")

    # 测试5: 结果搜索功能
    print_section("测试5: 结果搜索功能")
    results = get_task_results(task1_id)
    print(f"✓ 总页面数: {results['total']}")
    # 搜索存在的关键词
    search1 = get_task_results(task1_id, "Example")
    print(f"✓ 搜索'Example': 找到 {search1['total']} 个结果")
    # 搜索不存在的关键词
    search2 = get_task_results(task1_id, "XYZNotFound")
    print(f"✓ 搜索'XYZNotFound': 找到 {search2['total']} 个结果")
    if search1['total'] > 0 and search2['total'] == 0:
        print("✓ 搜索功能正常工作")
    else:
        print("✗ 搜索功能异常")

    # 测试6: 导出功能
    print_section("测试6: 导出功能 (JSON/CSV)")
    json_ok, json_sample = export_json(task1_id)
    print(f"✓ JSON导出: {'成功' if json_ok else '失败'}")
    csv_ok, csv_sample = export_csv(task1_id)
    print(f"✓ CSV导出: {'成功' if csv_ok else '失败'}")
    if json_ok and csv_ok:
        print("✓ 导出功能正常")
    else:
        print("✗ 导出功能异常")

    # 测试7: 任务暂停/恢复/取消
    print_section("测试7: 任务暂停/恢复/取消功能")
    # 创建一个较长的任务
    task7_id = create_task({
        "url": "https://example.com",
        "max_depth": 2,
        "timeout": 30,
        "crawl_interval": 2,
    })
    print(f"✓ 任务创建成功: {task7_id}")
    
    # 等待任务开始
    time.sleep(1)
    status = get_task_status(task7_id)
    print(f"  初始状态: {status.get('status') if status else 'N/A'}")
    
    # 暂停任务
    pause_ok = pause_task(task7_id)
    time.sleep(2)
    status = get_task_status(task7_id)
    print(f"✓ 暂停操作: {'成功' if pause_ok else '失败'}, 当前状态: {status.get('status') if status else 'N/A'}")
    
    # 恢复任务
    resume_ok = resume_task(task7_id)
    time.sleep(0.5)
    status = get_task_status(task7_id)
    print(f"✓ 恢复操作: {'成功' if resume_ok else '失败'}, 当前状态: {status.get('status') if status else 'N/A'}")
    
    # 取消任务
    cancel_ok = cancel_task(task7_id)
    time.sleep(1)
    status = get_task_status(task7_id)
    print(f"✓ 取消操作: {'成功' if cancel_ok else '失败'}, 当前状态: {status.get('status') if status else 'N/A'}")
    
    if status and status.get('status') == 'cancelled':
        print("✓ 任务暂停/恢复/取消功能正常")
    else:
        print("✗ 任务控制功能异常")

    # 测试8: 域名限定（测试会拒绝外部链接）
    print_section("测试8: 域名限定功能")
    print("✓ 查看任务1的结果，确认只有example.com域名的页面")
    results = get_task_results(task1_id)
    all_in_domain = True
    for r in results['results']:
        if 'example.com' not in r['url']:
            all_in_domain = False
            print(f"  ✗ 发现外部域名: {r['url']}")
    if all_in_domain and results['total'] > 0:
        print("✓ 域名限定功能正常（所有爬取页面都在目标域名内）")
    
    # 测试9: URL去重
    print_section("测试9: URL去重功能")
    print("✓ 查看任务1的结果，确认无重复URL")
    results = get_task_results(task1_id)
    urls = [r['url'] for r in results['results']]
    unique_urls = set(urls)
    if len(urls) == len(unique_urls):
        print(f"✓ 去重功能正常（{len(urls)}个URL，无重复）")
    else:
        print(f"✗ 发现重复URL: {len(urls) - len(unique_urls)} 个重复")

    # 总结
    print_section("测试总结")
    print("所有核心功能测试完成！")
    print(f"服务地址: {BASE_URL}")
    print("\n可通过浏览器访问上述地址进行交互测试。")

if __name__ == "__main__":
    main()
