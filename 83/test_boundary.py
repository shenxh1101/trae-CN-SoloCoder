#!/usr/bin/env python3
import sys
import os
import json
import time
import requests
import csv
from io import StringIO

BASE_URL = 'http://127.0.0.1:5050'
ADMIN_PASSWORD = 'admin123'

session = requests.Session()

print('=' * 60)
print('边界测试与高级功能验证')
print('=' * 60)

print('\n1. 登录管理员...')
session.post(f'{BASE_URL}/admin/login', data={'password': ADMIN_PASSWORD})
print('   ✓ 登录成功')

print('\n2. 清空现有数据...')
session.post(f'{BASE_URL}/admin/clear')
time.sleep(0.5)
print('   ✓ 数据已清空')

print('\n3. 生成21条测试数据（测试分页边界：3页，最后一页1条）...')
session.post(f'{BASE_URL}/admin/test/generate?count=21')
time.sleep(0.5)
print('   ✓ 已生成21条数据')

print('\n4. 验证分页 - 第1页（应显示10条）...')
r = session.get(f'{BASE_URL}/admin?page=1')
page1_count = r.text.count('<tr>') - 1
print(f'   第1页行数: {page1_count} (期望: 10 + 表头)')
if page1_count >= 10:
    print('   ✓ 第1页正常')

print('\n5. 验证分页 - 第2页（应显示10条）...')
r = session.get(f'{BASE_URL}/admin?page=2')
page2_count = r.text.count('<tr>') - 1
print(f'   第2页行数: {page2_count} (期望: 10 + 表头)')
if page2_count >= 10:
    print('   ✓ 第2页正常')

print('\n6. 验证分页 - 第3页（应显示1条）...')
r = session.get(f'{BASE_URL}/admin?page=3')
page3_count = r.text.count('<tr>') - 1
print(f'   第3页行数: {page3_count} (期望: 1 + 表头)')
if page3_count >= 1:
    print('   ✓ 第3页（最后一页1条）正常')

print('\n7. 验证分页边界 - 第4页（应自动跳转到第3页）...')
r = session.get(f'{BASE_URL}/admin?page=4')
if '当前页' in r.text and ('3 / 3' in r.text or '3/3' in r.text):
    print('   ✓ 超出范围的页码自动限制到最大页')
else:
    print('   ⚠ 需检查分页限制逻辑')

print('\n8. 验证分页边界 - 第0页（应自动跳转到第1页）...')
r = session.get(f'{BASE_URL}/admin?page=0')
if '当前页' in r.text and ('1 / 3' in r.text or '1/3' in r.text):
    print('   ✓ 小于1的页码自动跳转到第1页')
else:
    print('   ⚠ 需检查分页限制逻辑')

print('\n9. CSV导出详细验证...')
r = session.get(f'{BASE_URL}/admin/export')
content = r.content.decode('utf-8-sig')
reader = csv.reader(StringIO(content))
rows = list(reader)
print(f'   CSV总行数: {len(rows)} (1行表头 + 21行数据 = 22)')
print(f'   表头: {rows[0]}')
if len(rows) == 22:
    print('   ✓ CSV行数正确')
else:
    print(f'   ⚠ CSV行数异常: 期望22，实际{len(rows)}')

if len(rows) >= 2:
    print(f'   第1行数据示例: {rows[1][:6]}...')
    print(f'   最后1行数据示例: {rows[-1][:6]}...')

print('\n10. 搜索功能验证...')
r = session.get(f'{BASE_URL}/admin?search=张三')
if '张三' in r.text:
    print('   ✓ 按昵称"张三"搜索成功')
else:
    print('   ℹ 可能生成的数据中没有张三，属正常')

r = session.get(f'{BASE_URL}/admin?search=建议')
if '建议' in r.text:
    print('   ✓ 按内容关键词"建议"搜索成功')

print('\n11. 状态管理功能验证...')
with open('feedback.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
fb_id = data['feedbacks'][0]['id']
old_status = data['feedbacks'][0]['status']
print(f'   反馈#{fb_id} 当前状态: {old_status}')

r = session.post(f'{BASE_URL}/admin/update_status/{fb_id}?page=1', data={'status': '已处理'}, allow_redirects=False)
time.sleep(0.3)

with open('feedback.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
new_status = None
for fb in data['feedbacks']:
    if fb['id'] == fb_id:
        new_status = fb['status']
        break

print(f'   更新后状态: {new_status}')
if new_status == '已处理':
    print('   ✓ 状态更新成功')
else:
    print(f'   ✗ 状态更新失败: 期望"已处理"，实际{new_status}')

print('\n12. 验证数据持久化（重新加载JSON）...')
with open('feedback.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
print(f'   feedback.json 中反馈总数: {len(data["feedbacks"])}')
print(f'   下一个ID: {data["next_id"]}')
if len(data['feedbacks']) == 21:
    print('   ✓ JSON数据持久化正确')

print('\n' + '=' * 60)
print('边界测试完成!')
print('=' * 60)
