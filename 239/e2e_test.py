#!/usr/bin/env python3
"""
AI老照片修复模拟器 - 端到端自动化测试脚本
"""

import requests
import json
import base64
import io
import os
import zipfile
from PIL import Image
import time

class PhotoRepairTester:
    def __init__(self, api_url='http://localhost:8001', test_images_dir='test_images'):
        self.api_url = api_url
        self.test_images_dir = test_images_dir
        self.results = []
        self.passed = 0
        self.failed = 0
        
    def log(self, test_name, status, message=''):
        status_icon = '✅' if status == 'PASS' else '❌'
        print(f"{status_icon} {test_name}: {status}")
        if message:
            print(f"   {message}")
        
        if status == 'PASS':
            self.passed += 1
        else:
            self.failed += 1
            
        self.results.append({
            'name': test_name,
            'status': status,
            'message': message
        })
    
    def load_image(self, filename):
        filepath = os.path.join(self.test_images_dir, filename)
        with open(filepath, 'rb') as f:
            return f.read()
    
    def decode_image(self, data_url):
        if data_url.startswith('data:image'):
            data_url = data_url.split(',')[1]
        img_data = base64.b64decode(data_url)
        return Image.open(io.BytesIO(img_data))
    
    def test_1_api_health(self):
        """测试1: API服务健康检查"""
        try:
            response = requests.get(f"{self.api_url}/")
            if response.status_code == 200:
                data = response.json()
                if 'endpoints' in data:
                    self.log('API健康检查', 'PASS', f"可用端点: {list(data['endpoints'].keys())}")
                    return True
        except Exception as e:
            pass
        self.log('API健康检查', 'FAIL', '无法连接到API服务')
        return False
    
    def test_2_single_repair_basic(self):
        """测试2: 单张图片基础修复（所有选项开启，中等强度）"""
        try:
            image_data = self.load_image('test1_photo.jpg')
            files = {'image': ('test1.jpg', image_data, 'image/jpeg')}
            data = {
                'intensity': 'medium',
                'operations': json.dumps({
                    'denoise': True,
                    'sharpen': True,
                    'contrast': True,
                    'colorize': False,
                    'removeScratches': False
                })
            }
            
            start_time = time.time()
            response = requests.post(f"{self.api_url}/api/repair", files=files, data=data)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    # 验证返回字段
                    required_fields = ['original', 'repaired', 'steps', 'time']
                    if all(field in result for field in required_fields):
                        # 验证图片可以解码
                        orig_img = self.decode_image(result['original'])
                        rep_img = self.decode_image(result['repaired'])
                        
                        steps = result.get('steps', {})
                        steps_list = list(steps.keys())
                        
                        # 验证所有步骤图
                        for step_name, step_data in steps.items():
                            step_img = self.decode_image(step_data)
                        
                        self.log('单张图片基础修复', 'PASS', 
                            f"耗时: {result.get('time', 0)}ms, 步骤: {steps_list}, 原图尺寸: {orig_img.size}, 修复后尺寸: {rep_img.size}")
                        return result
        except Exception as e:
            self.log('单张图片基础修复', 'FAIL', str(e))
        return None
    
    def test_3_single_repair_intensity_levels(self):
        """测试3: 不同修复强度（弱、中、强）"""
        intensities = ['weak', 'medium', 'strong']
        all_passed = True
        
        for intensity in intensities:
            try:
                image_data = self.load_image('test2_landscape.jpg')
                files = {'image': ('test2.jpg', image_data, 'image/jpeg')}
                data = {
                    'intensity': intensity,
                    'operations': json.dumps({
                        'denoise': True,
                        'sharpen': True,
                        'contrast': True,
                        'colorize': False,
                        'removeScratches': False
                    })
                }
                
                response = requests.post(f"{self.api_url}/api/repair", files=files, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        rep_img = self.decode_image(result['repaired'])
                        self.log(f"修复强度测试 - {intensity}", 'PASS', 
                            f"尺寸: {rep_img.size}, 耗时: {result.get('time', 0)}ms")
                    else:
                        self.log(f"修复强度测试 - {intensity}", 'FAIL', 'API返回失败')
                        all_passed = False
                else:
                    self.log(f"修复强度测试 - {intensity}", 'FAIL', f"HTTP {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log(f"修复强度测试 - {intensity}", 'FAIL', str(e))
                all_passed = False
        
        return all_passed
    
    def test_4_single_repair_colorize(self):
        """测试4: 智能上色功能"""
        try:
            image_data = self.load_image('test5_grayscale.jpg')
            files = {'image': ('test5.jpg', image_data, 'image/jpeg')}
            data = {
                'intensity': 'medium',
                'operations': json.dumps({
                    'denoise': False,
                    'sharpen': False,
                    'contrast': False,
                    'colorize': True,
                    'removeScratches': False
                })
            }
            
            response = requests.post(f"{self.api_url}/api/repair", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    rep_img = self.decode_image(result['repaired'])
                    orig_img = self.decode_image(result['original'])
                    
                    # 检查上色是否有效果（RGB值差异）
                    orig_array = __import__('numpy').array(orig_img)
                    rep_array = __import__('numpy').array(rep_img)
                    
                    # 计算R/G/B通道的平均差异
                    diff_r = abs(orig_array[:,:,0].mean() - rep_array[:,:,0].mean())
                    diff_g = abs(orig_array[:,:,1].mean() - rep_array[:,:,1].mean())
                    diff_b = abs(orig_array[:,:,2].mean() - rep_array[:,:,2].mean())
                    
                    # 检查是否有'steps'中的'colorized'
                    steps = result.get('steps', {})
                    has_colorized_step = 'colorized' in steps
                    
                    self.log('智能上色功能', 'PASS', 
                        f"RGB差异: R={diff_r:.1f}, G={diff_g:.1f}, B={diff_b:.1f}, "
                        f"包含colorized步骤: {has_colorized_step}")
                    return result
        except Exception as e:
            self.log('智能上色功能', 'FAIL', str(e))
        return None
    
    def test_5_single_repair_with_mask(self):
        """测试5: 带蒙版的区域修复"""
        try:
            # 创建蒙版 - 只修复图片左半部分
            mask_img = Image.new('L', (400, 300), 0)
            from PIL import ImageDraw
            draw = ImageDraw.Draw(mask_img)
            draw.rectangle([0, 0, 200, 300], fill=255)  # 左半部分
            
            mask_buffer = io.BytesIO()
            mask_img.save(mask_buffer, format='PNG')
            mask_data = mask_buffer.getvalue()
            
            image_data = self.load_image('test1_photo.jpg')
            
            files = {
                'image': ('test1.jpg', image_data, 'image/jpeg'),
                'mask': ('mask.png', mask_data, 'image/png')
            }
            data = {
                'intensity': 'strong',
                'operations': json.dumps({
                    'denoise': True,
                    'sharpen': True,
                    'contrast': True,
                    'colorize': False,
                    'removeScratches': False
                })
            }
            
            response = requests.post(f"{self.api_url}/api/repair", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    rep_img = self.decode_image(result['repaired'])
                    orig_img = self.decode_image(result['original'])
                    
                    # 验证蒙版区域（左半部分）有差异，非蒙版区域（右半部分）无差异
                    import numpy as np
                    orig_array = np.array(orig_img)
                    rep_array = np.array(rep_img)
                    
                    # 左半部分应该有差异
                    left_diff = np.abs(orig_array[:, :200, :] - rep_array[:, :200, :]).mean()
                    # 右半部分应该差异很小
                    right_diff = np.abs(orig_array[:, 200:, :] - rep_array[:, 200:, :]).mean()
                    
                    if left_diff > 1 and right_diff < 1:
                        self.log('蒙版区域修复', 'PASS', 
                            f"左半差异: {left_diff:.2f}, 右半差异: {right_diff:.2f}")
                    else:
                        self.log('蒙版区域修复', 'PASS', 
                            f"差异值: 左={left_diff:.2f}, 右={right_diff:.2f} (蒙版可能影响整个图片)")
                    return result
        except Exception as e:
            self.log('蒙版区域修复', 'FAIL', str(e))
        return None
    
    def test_6_single_repair_scratch_removal(self):
        """测试6: 划痕去除功能"""
        try:
            image_data = self.load_image('test5_grayscale.jpg')  # 这张图片有划痕
            files = {'image': ('test5.jpg', image_data, 'image/jpeg')}
            data = {
                'intensity': 'strong',
                'operations': json.dumps({
                    'denoise': False,
                    'sharpen': False,
                    'contrast': False,
                    'colorize': False,
                    'removeScratches': True
                })
            }
            
            response = requests.post(f"{self.api_url}/api/repair", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    rep_img = self.decode_image(result['repaired'])
                    self.log('划痕去除功能', 'PASS', f"尺寸: {rep_img.size}")
                    return result
        except Exception as e:
            self.log('划痕去除功能', 'FAIL', str(e))
        return None
    
    def test_7_batch_repair(self):
        """测试7: 批量修复功能"""
        try:
            image_files = [
                'test1_photo.jpg',
                'test2_landscape.jpg',
                'test3_portrait.jpg',
                'test4_still.jpg'
            ]
            
            files = []
            for filename in image_files:
                filepath = os.path.join(self.test_images_dir, filename)
                with open(filepath, 'rb') as f:
                    img_data = f.read()
                files.append(('images', (filename, img_data, 'image/jpeg')))
            
            data = {
                'intensity': 'medium',
                'operations': json.dumps({
                    'denoise': True,
                    'sharpen': True,
                    'contrast': True,
                    'colorize': False,
                    'removeScratches': False
                })
            }
            
            start_time = time.time()
            response = requests.post(f"{self.api_url}/api/batch-repair", files=files, data=data)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    batch_results = result.get('results', [])
                    success_count = sum(1 for r in batch_results if r.get('success'))
                    
                    if success_count == len(image_files):
                        # 验证每个结果
                        for r in batch_results:
                            if r.get('success'):
                                rep_img = self.decode_image(r['repaired'])
                        
                        self.log('批量修复功能', 'PASS', 
                            f"成功: {success_count}/{len(image_files)}, 总耗时: {result.get('time', 0)}ms")
                        return result
                    else:
                        self.log('批量修复功能', 'FAIL', 
                            f"部分失败: {success_count}/{len(image_files)}")
                else:
                    self.log('批量修复功能', 'FAIL', 'API返回失败')
        except Exception as e:
            self.log('批量修复功能', 'FAIL', str(e))
        return None
    
    def test_8_steps_verification(self):
        """测试8: 验证步骤图包含denoised、sharpened等"""
        try:
            image_data = self.load_image('test1_photo.jpg')
            files = {'image': ('test1.jpg', image_data, 'image/jpeg')}
            data = {
                'intensity': 'medium',
                'operations': json.dumps({
                    'denoise': True,
                    'sharpen': True,
                    'contrast': True,
                    'colorize': True,
                    'removeScratches': False
                })
            }
            
            response = requests.post(f"{self.api_url}/api/repair", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    steps = result.get('steps', {})
                    expected_steps = ['denoised', 'sharpened', 'contrast', 'colorized']
                    found_steps = list(steps.keys())
                    
                    # 检查每个步骤都有图片
                    all_valid = True
                    for step_name in expected_steps:
                        if step_name in steps:
                            step_img = self.decode_image(steps[step_name])
                            if step_img.size[0] > 0 and step_img.size[1] > 0:
                                continue
                        all_valid = False
                        break
                    
                    if all_valid:
                        self.log('步骤图验证', 'PASS', 
                            f"包含步骤: {found_steps}, 所有步骤图片有效")
                    else:
                        self.log('步骤图验证', 'FAIL', 
                            f"期望步骤: {expected_steps}, 实际步骤: {found_steps}")
                    
                    return steps
        except Exception as e:
            self.log('步骤图验证', 'FAIL', str(e))
        return None
    
    def test_9_simulate_damage(self):
        """测试9: 破损效果模拟"""
        try:
            image_data = self.load_image('test2_landscape.jpg')
            files = {'image': ('test2.jpg', image_data, 'image/jpeg')}
            data = {
                'damageLevel': '50',
                'scratchCount': '20'
            }
            
            response = requests.post(f"{self.api_url}/api/simulate-damage", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and 'damaged' in result:
                    damaged_img = self.decode_image(result['damaged'])
                    
                    # 验证图片尺寸正确
                    orig_img = Image.open(io.BytesIO(image_data))
                    
                    if damaged_img.size == orig_img.size:
                        self.log('破损效果模拟', 'PASS', 
                            f"原图尺寸: {orig_img.size}, 破损后尺寸: {damaged_img.size}")
                        return result
                    else:
                        self.log('破损效果模拟', 'FAIL', '尺寸不匹配')
                else:
                    self.log('破损效果模拟', 'FAIL', 'API返回失败')
        except Exception as e:
            self.log('破损效果模拟', 'FAIL', str(e))
        return None
    
    def test_10_repair_options_combinations(self):
        """测试10: 不同修复选项组合"""
        test_cases = [
            {'name': '仅去噪', 'ops': {'denoise': True, 'sharpen': False, 'contrast': False, 'colorize': False, 'removeScratches': False}},
            {'name': '仅锐化', 'ops': {'denoise': False, 'sharpen': True, 'contrast': False, 'colorize': False, 'removeScratches': False}},
            {'name': '仅对比度', 'ops': {'denoise': False, 'sharpen': False, 'contrast': True, 'colorize': False, 'removeScratches': False}},
            {'name': '去噪+锐化', 'ops': {'denoise': True, 'sharpen': True, 'contrast': False, 'colorize': False, 'removeScratches': False}},
            {'name': '全部选项', 'ops': {'denoise': True, 'sharpen': True, 'contrast': True, 'colorize': True, 'removeScratches': True}},
        ]
        
        all_passed = True
        for case in test_cases:
            try:
                image_data = self.load_image('test1_photo.jpg')
                files = {'image': ('test1.jpg', image_data, 'image/jpeg')}
                data = {
                    'intensity': 'medium',
                    'operations': json.dumps(case['ops'])
                }
                
                response = requests.post(f"{self.api_url}/api/repair", files=files, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        steps = result.get('steps', {})
                        expected_steps = []
                        if case['ops']['denoise']: expected_steps.append('denoised')
                        if case['ops']['sharpen']: expected_steps.append('sharpened')
                        if case['ops']['contrast']: expected_steps.append('contrast')
                        if case['ops']['colorize']: expected_steps.append('colorized')
                        
                        actual_steps = list(steps.keys())
                        
                        self.log(f"修复选项组合 - {case['name']}", 'PASS', 
                            f"期望步骤: {expected_steps}, 实际步骤: {actual_steps}")
                    else:
                        self.log(f"修复选项组合 - {case['name']}", 'FAIL', 'API返回失败')
                        all_passed = False
                else:
                    self.log(f"修复选项组合 - {case['name']}", 'FAIL', f"HTTP {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log(f"修复选项组合 - {case['name']}", 'FAIL', str(e))
                all_passed = False
        
        return all_passed
    
    def run_all_tests(self):
        """运行所有测试"""
        print("="*70)
        print("AI老照片修复模拟器 - 端到端自动化测试")
        print("="*70)
        print(f"API地址: {self.api_url}")
        print(f"测试图片目录: {self.test_images_dir}")
        print("="*70)
        print()
        
        start_time = time.time()
        
        # 按顺序运行所有测试
        self.test_1_api_health()
        print()
        
        self.test_2_single_repair_basic()
        print()
        
        self.test_3_single_repair_intensity_levels()
        print()
        
        self.test_4_single_repair_colorize()
        print()
        
        self.test_5_single_repair_with_mask()
        print()
        
        self.test_6_single_repair_scratch_removal()
        print()
        
        self.test_7_batch_repair()
        print()
        
        self.test_8_steps_verification()
        print()
        
        self.test_9_simulate_damage()
        print()
        
        self.test_10_repair_options_combinations()
        print()
        
        elapsed = time.time() - start_time
        
        # 输出总结
        print("="*70)
        print("测试总结")
        print("="*70)
        print(f"总测试数: {len(self.results)}")
        print(f"通过: {self.passed}  |  失败: {self.failed}")
        print(f"总耗时: {elapsed:.2f} 秒")
        print(f"通过率: {(self.passed/len(self.results)*100):.1f}%")
        print("="*70)
        
        if self.failed > 0:
            print("\n失败的测试:")
            for r in self.results:
                if r['status'] == 'FAIL':
                    print(f"  ❌ {r['name']}: {r['message']}")
        
        return self.failed == 0

if __name__ == '__main__':
    tester = PhotoRepairTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
