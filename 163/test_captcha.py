
import sys
import time
import json

sys.path.insert(0, '.')
import app

client = app.app.test_client()

def print_test_result(test_name, passed, message=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if message:
        print(f"   {message}")
    print()

def test_1_correct_captcha():
    """测试场景1：正确的验证码能验证成功"""
    print("=" * 60)
    print("测试场景1：正确的验证码能验证成功")
    print("=" * 60)
    
    try:
        resp = client.get('/generate_captcha?format=base64')
        data = json.loads(resp.data)
        token = data['token']
        
        print(f"生成验证码，Token: {token[:16]}...")
        
        correct_answer = app.CAPTCHA_STORE[token]['answer']
        print(f"验证码正确答案: {correct_answer}")
        
        resp = client.post('/verify_captcha', 
                          data=json.dumps({'token': token, 'captcha': correct_answer}),
                          content_type='application/json')
        result = json.loads(resp.data)
        
        if result['success']:
            print_test_result("正确验证码验证", True, f"返回: {result['message']}")
            
            if token not in app.CAPTCHA_STORE:
                print_test_result("验证成功后token已删除", True)
            else:
                print_test_result("验证成功后token已删除", False, "token仍然存在于存储中")
            return True
        else:
            print_test_result("正确验证码验证", False, f"返回: {result['message']}")
            return False
            
    except Exception as e:
        print_test_result("正确验证码验证", False, f"异常: {str(e)}")
        return False

def test_2_three_failures_lock():
    """测试场景2：错误的验证码连续输入3次后token被锁定"""
    print("=" * 60)
    print("测试场景2：连续3次错误验证码后token被锁定")
    print("=" * 60)
    
    try:
        resp = client.get('/generate_captcha?format=base64')
        data = json.loads(resp.data)
        token = data['token']
        
        print(f"生成验证码，Token: {token[:16]}...")
        
        all_passed = True
        
        for i in range(3):
            resp = client.post('/verify_captcha', 
                              data=json.dumps({'token': token, 'captcha': 'WRONG'}),
                              content_type='application/json')
            result = json.loads(resp.data)
            
            if i < 2:
                expected_msg = f"验证失败，还剩{2 - i}次机会"
                if not result['success'] and result['message'] == expected_msg:
                    print_test_result(f"第{i+1}次错误输入", True, f"返回: {result['message']}")
                else:
                    print_test_result(f"第{i+1}次错误输入", False, f"期望: '{expected_msg}', 实际: '{result['message']}'")
                    all_passed = False
            else:
                if not result['success'] and '锁定' in result['message']:
                    print_test_result(f"第{i+1}次错误输入（触发锁定）", True, f"返回: {result['message']}")
                else:
                    print_test_result(f"第{i+1}次错误输入（触发锁定）", False, f"期望包含'锁定', 实际: '{result['message']}'")
                    all_passed = False
        
        resp = client.post('/verify_captcha', 
                          data=json.dumps({'token': token, 'captcha': 'ANYTHING'}),
                          content_type='application/json')
        result = json.loads(resp.data)
        
        if not result['success'] and '锁定' in result['message']:
            print_test_result("锁定后再次尝试被拒绝", True, f"返回: {result['message']}")
        else:
            print_test_result("锁定后再次尝试被拒绝", False, f"期望包含'锁定', 实际: '{result['message']}'")
            all_passed = False
        
        return all_passed
            
    except Exception as e:
        print_test_result("连续3次错误锁定测试", False, f"异常: {str(e)}")
        return False

def test_3_expired_captcha():
    """测试场景3：超过5分钟后验证返回验证码已过期"""
    print("=" * 60)
    print("测试场景3：验证码5分钟后过期")
    print("=" * 60)
    
    try:
        resp = client.get('/generate_captcha?format=base64')
        data = json.loads(resp.data)
        token = data['token']
        
        print(f"生成验证码，Token: {token[:16]}...")
        
        original_created_at = app.CAPTCHA_STORE[token]['created_at']
        app.CAPTCHA_STORE[token]['created_at'] = original_created_at - 301
        
        print(f"模拟时间流逝：将创建时间往前调301秒（5分1秒）")
        print(f"原创建时间: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(original_created_at))}")
        print(f"修改后时间: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(app.CAPTCHA_STORE[token]['created_at']))}")
        print(f"当前时间:   {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time()))}")
        
        correct_answer = app.CAPTCHA_STORE[token]['answer']
        
        resp = client.post('/verify_captcha', 
                          data=json.dumps({'token': token, 'captcha': correct_answer}),
                          content_type='application/json')
        result = json.loads(resp.data)
        
        if not result['success'] and '过期' in result['message']:
            print_test_result("过期验证码验证", True, f"返回: {result['message']}")
            
            if token not in app.CAPTCHA_STORE:
                print_test_result("过期后token已被清理", True)
            else:
                print_test_result("过期后token已被清理", False, "token仍然存在于存储中")
            return True
        else:
            print_test_result("过期验证码验证", False, f"期望包含'过期', 实际: '{result['message']}'")
            return False
            
    except Exception as e:
        print_test_result("过期验证码测试", False, f"异常: {str(e)}")
        return False

def test_4_noise_and_lines_count():
    """测试干扰线条和噪点数量是否符合要求"""
    print("=" * 60)
    print("测试验证：干扰线条(>=3)和噪点(>=50)数量检查")
    print("=" * 60)
    
    try:
        import sys
        sys.path.insert(0, '.')
        import app
        from unittest.mock import patch, MagicMock
        
        line_count = 0
        point_count = 0
        
        original_line = app.ImageDraw.ImageDraw.line
        original_point = app.ImageDraw.ImageDraw.point
        
        def mock_line(self, xy, **kwargs):
            nonlocal line_count
            line_count += 1
            return original_line(self, xy, **kwargs)
        
        def mock_point(self, xy, **kwargs):
            nonlocal point_count
            point_count += 1
            return original_point(self, xy, **kwargs)
        
        with patch.object(app.ImageDraw.ImageDraw, 'line', mock_line):
            with patch.object(app.ImageDraw.ImageDraw, 'point', mock_point):
                image = app.generate_captcha_image("ABCD")
        
        all_passed = True
        
        if line_count >= 3:
            print_test_result("干扰线条数量", True, f"实际绘制了 {line_count} 条线条 (要求 >= 3)")
        else:
            print_test_result("干扰线条数量", False, f"实际绘制了 {line_count} 条线条 (要求 >= 3)")
            all_passed = False
        
        if point_count >= 50:
            print_test_result("噪点数量", True, f"实际绘制了 {point_count} 个噪点 (要求 >= 50)")
        else:
            print_test_result("噪点数量", False, f"实际绘制了 {point_count} 个噪点 (要求 >= 50)")
            all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_test_result("干扰线条和噪点数量检查", False, f"异常: {str(e)}")
        return False

def main():
    print("\n" + "🚀" * 30)
    print("验证码服务完整测试套件")
    print("🚀" * 30 + "\n")
    
    results = []
    
    results.append(("场景1：正确验证码验证成功", test_1_correct_captcha()))
    results.append(("场景2：连续3次错误后锁定", test_2_three_failures_lock()))
    results.append(("场景3：5分钟后验证码过期", test_3_expired_captcha()))
    results.append(("验证：干扰线条和噪点数量", test_4_noise_and_lines_count()))
    
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print("=" * 60)
    print(f"总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！")
        return 0
    else:
        print(f"\n⚠️  {total - passed} 个测试失败")
        return 1

if __name__ == "__main__":
    sys.exit(main())
