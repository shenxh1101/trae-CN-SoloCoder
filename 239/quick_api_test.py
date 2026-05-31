import requests
import json
import io
from PIL import Image

print('=' * 60)
print('最终API验证测试')
print('=' * 60)

all_passed = True

# 1. 测试健康检查
print('\n1. API健康检查...')
try:
    r = requests.get('http://localhost:8001/')
    assert r.status_code == 200
    data = r.json()
    print(f'   ✅ 通过，端点: {list(data["endpoints"].keys())}')
except Exception as e:
    print(f'   ❌ 失败: {e}')
    all_passed = False

# 2. 创建测试图片
print('\n2. 创建测试图片...')
try:
    img = Image.new('RGB', (200, 150), color='red')
    for x in range(200):
        for y in range(150):
            r_val = (x + y) % 255
            g_val = (x * 2) % 255
            b_val = (y * 3) % 255
            img.putpixel((x, y), (r_val, g_val, b_val))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    img_data = buf.getvalue()
    print(f'   ✅ 通过，大小: {len(img_data)} 字节')
except Exception as e:
    print(f'   ❌ 失败: {e}')
    all_passed = False

# 3. 测试单张修复
print('\n3. 单张修复API...')
try:
    files = {'image': ('test.jpg', img_data, 'image/jpeg')}
    data = {
        'intensity': 'medium',
        'operations': json.dumps({
            'denoise': True, 'sharpen': True, 'contrast': True,
            'colorize': True, 'removeScratches': True
        })
    }
    r = requests.post('http://localhost:8001/api/repair', files=files, data=data)
    result = r.json()
    assert result['success']
    steps = list(result.get('steps', {}).keys())
    assert 'denoised' in steps
    assert 'sharpened' in steps
    assert 'contrast' in steps
    assert 'colorized' in steps
    print(f'   ✅ 通过，步骤: {steps}')
except Exception as e:
    print(f'   ❌ 失败: {e}')
    all_passed = False

# 4. 测试带蒙版修复
print('\n4. 带蒙版修复API...')
try:
    mask = Image.new('L', (200, 150), 0)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(mask)
    draw.rectangle([0, 0, 100, 150], fill=255)
    mask_buf = io.BytesIO()
    mask.save(mask_buf, format='PNG')
    mask_data = mask_buf.getvalue()
    
    files = {
        'image': ('test.jpg', img_data, 'image/jpeg'),
        'mask': ('mask.png', mask_data, 'image/png')
    }
    r = requests.post('http://localhost:8001/api/repair', files=files, data=data)
    result = r.json()
    assert result['success']
    print(f'   ✅ 通过')
except Exception as e:
    print(f'   ❌ 失败: {e}')
    all_passed = False

# 5. 测试不同强度
print('\n5. 不同修复强度...')
try:
    for intensity in ['weak', 'medium', 'strong']:
        data['intensity'] = intensity
        files = {'image': ('test.jpg', img_data, 'image/jpeg')}
        r = requests.post('http://localhost:8001/api/repair', files=files, data=data)
        result = r.json()
        assert result['success']
    print(f'   ✅ 全部通过 (weak/medium/strong)')
except Exception as e:
    print(f'   ❌ 失败: {e}')
    all_passed = False

# 6. 测试批量修复
print('\n6. 批量修复API...')
try:
    files = [
        ('images', ('test1.jpg', img_data, 'image/jpeg')),
        ('images', ('test2.jpg', img_data, 'image/jpeg')),
        ('images', ('test3.jpg', img_data, 'image/jpeg'))
    ]
    data = {
        'intensity': 'medium',
        'operations': json.dumps({
            'denoise': True, 'sharpen': True, 'contrast': True,
            'colorize': False, 'removeScratches': False
        })
    }
    r = requests.post('http://localhost:8001/api/batch-repair', files=files, data=data)
    result = r.json()
    assert result['success']
    success_count = sum(1 for x in result['results'] if x['success'])
    assert success_count == 3
    print(f'   ✅ 通过，成功: {success_count}/3')
except Exception as e:
    print(f'   ❌ 失败: {e}')
    all_passed = False

# 7. 测试破损效果模拟
print('\n7. 破损效果模拟API...')
try:
    files = {'image': ('test.jpg', img_data, 'image/jpeg')}
    data = {'damageLevel': '50', 'scratchCount': '10'}
    r = requests.post('http://localhost:8001/api/simulate-damage', files=files, data=data)
    result = r.json()
    assert result['success']
    assert 'damaged' in result
    print(f'   ✅ 通过')
except Exception as e:
    print(f'   ❌ 失败: {e}')
    all_passed = False

print('\n' + '=' * 60)
if all_passed:
    print('🎉 所有API验证测试通过！')
else:
    print('⚠️  部分测试失败，请检查错误信息')
print('=' * 60)
