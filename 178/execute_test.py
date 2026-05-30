#!/usr/bin/env python3
import sys
import os

work_dir = '/Users/mac/code/solo coder/178'
sys.path.insert(0, work_dir)
os.chdir(work_dir)

output_file = os.path.join(work_dir, 'test_results.txt')

with open(output_file, 'w') as f:
    f.write("=" * 60 + "\n")
    f.write("Flask 应用测试结果\n")
    f.write("=" * 60 + "\n\n")
    
    try:
        f.write("1. 导入模块...\n")
        from app import app, init_app, tcp_port_test
        import json
        f.write("   ✓ 模块导入成功\n\n")
        
        f.write("2. 初始化应用...\n")
        init_app()
        f.write("   ✓ 应用初始化成功\n\n")
        
        app.config['TESTING'] = True
        client = app.test_client()
        
        f.write("3. 测试 GET http://localhost:5000\n")
        f.write("-" * 40 + "\n")
        response = client.get('/')
        f.write(f"   状态码: {response.status_code}\n")
        f.write(f"   响应类型: {response.content_type}\n")
        if response.status_code == 200:
            f.write("   ✓ 测试通过\n\n")
        else:
            f.write("   ✗ 测试失败\n\n")
        
        f.write("4. 测试 POST http://localhost:5000/api/test\n")
        f.write("-" * 40 + "\n")
        f.write('   请求 JSON: {\"target\":\"127.0.0.1\", \"ports\":\"80\"}\n")
        response = client.post(
            '/api/test',
            json={"target": "127.0.0.1", "ports": "80"},
            content_type='application/json'
        )
        f.write(f"   状态码: {response.status_code}\n")
        f.write("   响应内容:\n")
        data = response.get_json()
        f.write(json.dumps(data, indent=6, ensure_ascii=False) + "\n")
        if response.status_code == 200:
            f.write("   ✓ 测试通过\n\n")
        else:
            f.write("   ✗ 测试失败\n\n")
        
        f.write("5. 直接端口测试结果\n")
        f.write("-" * 40 + "\n")
        result = tcp_port_test("127.0.0.1", 80, timeout=2)
        f.write(json.dumps(result, indent=6, ensure_ascii=False) + "\n")
        
        f.write("\n" + "=" * 60 + "\n")
        f.write("所有测试完成！\n")
        f.write("=" * 60 + "\n")
        
    except Exception as e:
        f.write(f"\n错误: {str(e)}\n")
        import traceback
        f.write(traceback.format_exc())

print("测试完成，结果已写入 test_results.txt")
