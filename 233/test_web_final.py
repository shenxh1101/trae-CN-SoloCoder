import subprocess
import time
import requests
import sys

print("=" * 60)
print("🌐 Web界面功能测试")
print("=" * 60)

# 启动服务器
proc = subprocess.Popen(
    ['python', 'pmg.py', 'web', '-h', '127.0.0.1', '-p', '5022'],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
time.sleep(3)

try:
    # 测试1: 首页
    r = requests.get('http://127.0.0.1:5022/')
    status = "✅ 通过" if r.status_code == 200 else "❌ 失败"
    print(f"\n1. 首页加载: {status} (状态码: {r.status_code})")

    # 测试2: 生成API
    data = {
        'product_name': '智能旗舰手机',
        'features': ['无线充电', 'IP68防水', 'AI拍照'],
        'positioning': '商务旗舰手机',
        'style': 'marketing',
        'language': 'zh'
    }
    r = requests.post('http://127.0.0.1:5022/api/generate', json=data)
    result = r.json()
    status = "✅ 通过" if result.get('success') else "❌ 失败"
    print(f"\n2. 生成API: {status}")
    print(f"   广告语: {result.get('slogan')}")
    print(f"   HTML长度: {len(result.get('html', ''))} 字符")
    mid = result.get('manual_id')

    # 测试3: 修改API
    if mid:
        r = requests.post('http://127.0.0.1:5022/api/revise', json={
            'manual_id': mid,
            'suggestions': '增加更多技术细节',
            'section': 'features'
        })
        result = r.json()
        status = "✅ 通过" if result.get('success') else "❌ 失败"
        print(f"\n3. 修改API: {status}")
        print(f"   修改后HTML长度: {len(result.get('html', ''))} 字符")

    # 测试4: 下载
    if mid:
        print("\n4. 下载测试:")
        for fmt in ['markdown', 'html', 'text']:
            r = requests.get(f'http://127.0.0.1:5022/api/download/{mid}/{fmt}')
            ok = r.status_code == 200 and len(r.content) > 0
            status = "✅ 通过" if ok else "❌ 失败"
            print(f"   {fmt.upper()}: {status} ({len(r.content)} 字节)")

    print("\n" + "=" * 60)
    print("✅ Web界面测试完成！")
    print("📱 浏览器访问: http://127.0.0.1:5022")
    print("=" * 60)
finally:
    proc.kill()
