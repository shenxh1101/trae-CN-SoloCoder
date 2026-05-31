import subprocess
import time
import requests

print('🚀 正在启动Flask Web服务器...')
proc = subprocess.Popen(
    ['python', 'pmg.py', 'web', '-h', '127.0.0.1', '-p', '5010'],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
time.sleep(3)

print('')
print('=' * 50)
print('📊 Web界面功能测试结果')
print('=' * 50)
print('')

# 测试1: 首页加载
r1 = requests.get('http://127.0.0.1:5010/')
status1 = '✅ 通过' if r1.status_code == 200 else '❌ 失败'
print(f'1. 首页加载测试: {status1} (状态码: {r1.status_code})')
has_title = 'AI产品说明书生成工具' in r1.text
print(f'   包含标题: {has_title}')
has_buttons = 'Markdown' in r1.text and 'HTML' in r1.text
print(f'   包含下载按钮: {has_buttons}')

# 测试2: 生成API
data = {
    'product_name': '智能旗舰手机',
    'features': ['无线充电', 'IP68防水', '夜景拍照'],
    'positioning': '商务旗舰手机',
    'style': 'marketing',
    'language': 'zh'
}
r2 = requests.post('http://127.0.0.1:5010/api/generate', json=data)
result2 = r2.json()
status2 = '✅ 通过' if (r2.status_code == 200 and result2.get('success')) else '❌ 失败'
print('')
print(f'2. 生成API测试: {status2}')
print(f'   状态码: {r2.status_code}')
print(f'   成功: {result2.get("success")}')
print(f'   有manual_id: {"manual_id" in result2}')
print(f'   广告语: {result2.get("slogan", "")}')
print(f'   HTML长度: {len(result2.get("html", ""))} 字符')
mid = result2.get('manual_id')

# 测试3: 修改API
if mid:
    data3 = {
        'manual_id': mid,
        'suggestions': '增加更多技术细节，使内容更专业',
        'section': 'features'
    }
    r3 = requests.post('http://127.0.0.1:5010/api/revise', json=data3)
    result3 = r3.json()
    status3 = '✅ 通过' if (r3.status_code == 200 and result3.get('success')) else '❌ 失败'
    print('')
    print(f'3. 修改API测试: {status3}')
    print(f'   状态码: {r3.status_code}')
    print(f'   成功: {result3.get("success")}')
    print(f'   返回HTML长度: {len(result3.get("html", ""))} 字符')

# 测试4: 下载API
if mid:
    print('')
    print('4. 下载API测试:')
    for fmt in ['markdown', 'html', 'text']:
        r4 = requests.get(f'http://127.0.0.1:5010/api/download/{mid}/{fmt}')
        ok = r4.status_code == 200 and len(r4.content) > 0
        status4 = '✅ 通过' if ok else '❌ 失败'
        ext = {'markdown': 'md', 'html': 'html', 'text': 'txt'}[fmt]
        print(f'   {fmt.upper()}格式: {status4} ({len(r4.content)} 字节)')

print('')
print('=' * 50)
print('✅ Web界面所有功能测试完成!')
print('📱 访问地址: http://127.0.0.1:5010')
print('=' * 50)

proc.kill()
